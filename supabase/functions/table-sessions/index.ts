import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getSecretKey } from "../_shared/keys.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
};

// Generate a cuid-like id (similar to Prisma's cuid)
function generateCuid(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 9);
  const randomPart2 = Math.random().toString(36).substring(2, 9);
  return `c${timestamp}${randomPart}${randomPart2}`;
}

function generateSessionCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      getSecretKey()
    );

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const sessionsIndex = pathParts.indexOf("table-sessions");
    const subPath = sessionsIndex >= 0 ? pathParts.slice(sessionsIndex + 1) : [];

    // POST /table-sessions - Create a new table session (merge tables)
    if (req.method === "POST" && subPath.length === 0) {
      const body = await req.json();
      const { hostTableId, linkedTableNumbers } = body;

      if (!hostTableId || !linkedTableNumbers || !Array.isArray(linkedTableNumbers)) {
        return new Response(
          JSON.stringify({ error: "hostTableId and linkedTableNumbers are required" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Validate: linkedTableNumbers must be positive integers
      const validNumbers = linkedTableNumbers.every((n: number) => Number.isInteger(n) && n > 0);
      if (!validNumbers || linkedTableNumbers.length === 0) {
        return new Response(
          JSON.stringify({
            error: "linkedTableNumbers must be an array of positive integers",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Get host table
      const { data: hostTable, error: hostError } = await supabase
        .from("Table")
        .select("id, number")
        .eq("id", hostTableId)
        .single();

      if (hostError || !hostTable) {
        return new Response(JSON.stringify({ error: "Host table not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate: all linked table numbers exist in database
      const { data: existingTables, error: tablesError } = await supabase
        .from("Table")
        .select("number")
        .in("number", linkedTableNumbers);

      if (tablesError) {
        return new Response(JSON.stringify({ error: "Failed to validate tables" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const existingNumbers = new Set(existingTables?.map((t) => t.number) || []);
      const invalidNumbers = linkedTableNumbers.filter((n: number) => !existingNumbers.has(n));

      if (invalidNumbers.length > 0) {
        return new Response(
          JSON.stringify({
            error: `Tables not found: ${invalidNumbers.join(", ")}`,
            invalidNumbers,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Check: none of these tables (including host) are already in an active session
      const allTableNumbers = [hostTable.number, ...linkedTableNumbers];

      const { data: existingSessions } = await supabase
        .from("TableSession")
        .select("id, linkedTables, hostTableId")
        .eq("isActive", true);

      // Check if any table is already in an active session
      const conflictingSessions = existingSessions?.filter((session) => {
        // Check if host table is this session's host
        if (session.hostTableId === hostTableId) return true;

        // Check if any of our tables are in this session's linkedTables
        const sessionTables = session.linkedTables || [];
        return allTableNumbers.some((num) => sessionTables.includes(num));
      });

      if (conflictingSessions && conflictingSessions.length > 0) {
        return new Response(
          JSON.stringify({
            error: "One or more tables are already in an active session",
            conflictingSessionIds: conflictingSessions.map((s) => s.id),
          }),
          {
            status: 409, // Conflict
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Generate unique code
      let code = generateSessionCode();
      let attempts = 0;
      while (attempts < 10) {
        const { data: existing } = await supabase
          .from("TableSession")
          .select("id")
          .eq("code", code)
          .single();

        if (!existing) break;
        code = generateSessionCode();
        attempts++;
      }

      // Create the session
      const { data: session, error } = await supabase
        .from("TableSession")
        .insert({
          id: generateCuid(),
          code,
          hostTableId,
          linkedTables: linkedTableNumbers,
          isActive: true,
          createdAt: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error("Failed to create session:", error);
        return new Response(JSON.stringify({ error: "Failed to create session" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          ...session,
          allTableNumbers,
        }),
        {
          status: 201,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // GET /table-sessions/by-table/:tableNumber - Find active session for a table number
    if (req.method === "GET" && subPath[0] === "by-table" && subPath[1]) {
      const tableNumber = parseInt(subPath[1]);

      // First check if this table is the host of an active session
      const { data: hostTable } = await supabase
        .from("Table")
        .select("id")
        .eq("number", tableNumber)
        .single();

      if (hostTable) {
        const { data: hostSession } = await supabase
          .from("TableSession")
          .select("*")
          .eq("hostTableId", hostTable.id)
          .eq("isActive", true)
          .single();

        if (hostSession) {
          // Get the host customer name from the host table
          const { data: hostCustomer } = await supabase
            .from("TableCustomer")
            .select("name")
            .eq("tableId", hostSession.hostTableId)
            .eq("isHost", true)
            .eq("isActive", true)
            .single();

          return new Response(
            JSON.stringify({
              ...hostSession,
              hostCustomerName: hostCustomer?.name || null,
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      }

      // Check if this table is linked to an active session
      const { data: sessions } = await supabase
        .from("TableSession")
        .select("*")
        .eq("isActive", true)
        .contains("linkedTables", [tableNumber]);

      if (sessions && sessions.length > 0) {
        const session = sessions[0];

        // Get the host customer name from the host table
        const { data: hostCustomer } = await supabase
          .from("TableCustomer")
          .select("name")
          .eq("tableId", session.hostTableId)
          .eq("isHost", true)
          .eq("isActive", true)
          .single();

        return new Response(
          JSON.stringify({
            ...session,
            hostCustomerName: hostCustomer?.name || null,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // No active session found
      return new Response(JSON.stringify(null), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /table-sessions/:code - Get session by code
    if (req.method === "GET" && subPath[0] && subPath[0] !== "by-table") {
      const code = subPath[0];

      const { data: session, error } = await supabase
        .from("TableSession")
        .select(
          `
          *,
          orders:Order(
            *,
            items:OrderItem(
              *,
              menuItem:MenuItem(name, price),
              modifiers:OrderItemModifier(
                modifier:Modifier(name, price)
              )
            )
          )
        `
        )
        .eq("code", code)
        .single();

      if (error || !session) {
        return new Response(JSON.stringify({ error: "Session not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify(session), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PATCH /table-sessions/:code/close - Close the session
    if (req.method === "PATCH" && subPath[0] && subPath[1] === "close") {
      const code = subPath[0];

      const { data: session, error } = await supabase
        .from("TableSession")
        .update({
          isActive: false,
          closedAt: new Date().toISOString(),
        })
        .eq("code", code)
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(session), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails =
      typeof error === "object" && error !== null ? JSON.stringify(error) : errorMessage;
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: errorDetails,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
