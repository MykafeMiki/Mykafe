/**
 * Cron job per pulire automaticamente:
 * - TableSession senza ordini attive da più di 30 minuti → chiude subito
 * - TableSession con ordini attive da più di 4 ore → chiude
 * - TableCustomer inattivi da più di 4 ore
 * - Ordini piu' vecchi di 24 ore → archiviati in OrderArchive (visibili in admin
 *   per eventuali contestazioni) e poi cancellati
 * - Sincronizza Table.status con la presenza effettiva di clienti
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getSecretKey } from "../_shared/keys.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { archiveAndDeleteOrders } from "../_shared/archive.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CUSTOMER_STALE_HOURS = 4;
const SESSION_NO_ORDERS_MINUTES = 30; // sessione senza ordini → chiude dopo 30 min
const SESSION_WITH_ORDERS_HOURS = 4;  // sessione con ordini → chiude dopo 4 ore
const ORDER_RETENTION_HOURS = 24;     // ordini → archiviati e cancellati dopo 24 ore

/**
 * Segreto condiviso col job pg_cron `cleanup-stale-sessions`.
 *
 * Questa funzione gira con la secret key (bypassa le RLS) e scrive su
 * TableSession, TableCustomer e Table: senza guard chiunque conoscesse l'URL
 * poteva farla partire a ripetizione. Il cron non manda un JWT di progetto,
 * quindi il controllo e' un bearer condiviso invece di verify_jwt.
 *
 * Fail-closed: se CRON_SECRET non e' configurato non passa nessuno.
 */
const CRON_SECRET = Deno.env.get("CRON_SECRET");

/** Confronto a tempo costante: evita di far trapelare il segreto carattere per carattere. */
function secretsMatch(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function isAuthorized(req: Request): boolean {
  if (!CRON_SECRET) {
    console.error("CRON_SECRET non configurato: richiesta rifiutata");
    return false;
  }
  const header = req.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return false;
  return secretsMatch(header.slice(7), CRON_SECRET);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!isAuthorized(req)) {
    return new Response(JSON.stringify({ error: "Non autorizzato" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      getSecretKey()
    );

    const now = new Date();
    const customerCutoff = new Date(now.getTime() - CUSTOMER_STALE_HOURS * 60 * 60 * 1000);
    const sessionNoOrdersCutoff = new Date(now.getTime() - SESSION_NO_ORDERS_MINUTES * 60 * 1000);
    const sessionWithOrdersCutoff = new Date(now.getTime() - SESSION_WITH_ORDERS_HOURS * 60 * 60 * 1000);

    const results = {
      staleCustomers: 0,
      staleSessions: 0,
      syncedTables: 0,
      archivedOrders: 0,
      errors: [] as string[],
    };

    // 1. Deactivate stale customers (active for more than 4 hours)
    const { data: staleCustomers, error: customerError } = await supabase
      .from("TableCustomer")
      .update({ isActive: false, leftAt: now.toISOString() })
      .eq("isActive", true)
      .lt("createdAt", customerCutoff.toISOString())
      .select("id, tableId");

    if (customerError) {
      results.errors.push(`Customer cleanup error: ${customerError.message}`);
    } else {
      results.staleCustomers = staleCustomers?.length || 0;
    }

    // 2. Fetch all active sessions
    const { data: activeSessions, error: sessionsError } = await supabase
      .from("TableSession")
      .select("id, code, createdAt, hostTableId")
      .eq("isActive", true);

    if (sessionsError) {
      results.errors.push(`Session fetch error: ${sessionsError.message}`);
    } else if (activeSessions && activeSessions.length > 0) {
      // Fetch sessions that have at least one non-cancelled order
      const sessionIds = activeSessions.map((s) => s.id);
      const { data: orderedSessions } = await supabase
        .from("Order")
        .select("tableSessionId")
        .in("tableSessionId", sessionIds)
        .neq("status", "CANCELLED");

      const sessionsWithOrders = new Set((orderedSessions || []).map((o) => o.tableSessionId));

      const toClose = activeSessions.filter((session) => {
        const createdAt = new Date(session.createdAt);
        const hasOrders = sessionsWithOrders.has(session.id);
        if (!hasOrders) return createdAt < sessionNoOrdersCutoff;   // 30 min
        return createdAt < sessionWithOrdersCutoff;                  // 4 ore
      });

      if (toClose.length > 0) {
        const { error: closeError } = await supabase
          .from("TableSession")
          .update({ isActive: false, closedAt: now.toISOString() })
          .in("id", toClose.map((s) => s.id));

        if (closeError) {
          results.errors.push(`Session close error: ${closeError.message}`);
        } else {
          results.staleSessions = toClose.length;
        }
      }
    }

    // 2b. Archivia e cancella gli ordini vecchi di 24 ore. Se l'archiviazione
    // fallisce non cancella niente (vedi archiveAndDeleteOrders).
    try {
      const orderCutoff = new Date(now.getTime() - ORDER_RETENTION_HOURS * 60 * 60 * 1000);
      const archived = await archiveAndDeleteOrders(supabase, "AUTO_24H", orderCutoff);
      results.archivedOrders = archived.orderCount;
    } catch (err) {
      const message = err instanceof Error ? err.message : JSON.stringify(err);
      results.errors.push(`Order archive error: ${message}`);
    }

    // 3. Sync table status with actual customer presence
    const { data: allTables } = await supabase.from("Table").select("id, status");

    if (allTables) {
      for (const table of allTables) {
        const { count } = await supabase
          .from("TableCustomer")
          .select("id", { count: "exact", head: true })
          .eq("tableId", table.id)
          .eq("isActive", true);

        const hasCustomers = (count || 0) > 0;

        if (table.status !== "RESERVED") {
          if (hasCustomers && table.status !== "OCCUPIED") {
            await supabase.from("Table").update({ status: "OCCUPIED" }).eq("id", table.id);
            results.syncedTables++;
          } else if (!hasCustomers && table.status === "OCCUPIED") {
            await supabase.from("Table").update({ status: "AVAILABLE" }).eq("id", table.id);
            results.syncedTables++;
          }
        }
      }
    }

    console.log("Cleanup completed:", results);

    return new Response(
      JSON.stringify({ success: true, timestamp: now.toISOString(), results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Cleanup error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
