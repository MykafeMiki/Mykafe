/**
 * Cron job per pulire automaticamente:
 * - TableSession senza ordini attive da più di 30 minuti → chiude subito
 * - TableSession con ordini attive da più di 4 ore → chiude
 * - TableCustomer inattivi da più di 4 ore
 * - Sincronizza Table.status con la presenza effettiva di clienti
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getSecretKey } from "../_shared/keys.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CUSTOMER_STALE_HOURS = 4;
const SESSION_NO_ORDERS_MINUTES = 30; // sessione senza ordini → chiude dopo 30 min
const SESSION_WITH_ORDERS_HOURS = 4;  // sessione con ordini → chiude dopo 4 ore

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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

    // 4. Close stale PartySession (deprecated)
    await supabase
      .from("PartySession")
      .update({ isActive: false, closedAt: now.toISOString() })
      .eq("isActive", true)
      .lt("createdAt", sessionWithOrdersCutoff.toISOString());

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
