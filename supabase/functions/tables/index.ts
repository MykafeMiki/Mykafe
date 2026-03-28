import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Generate cuid-like ID
function generateId(): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 15);
  return `c${timestamp}${randomStr}`;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    // Path: /functions/v1/tables/qr/tavolo-1 -> find 'tables' and take everything after
    const tablesIndex = pathParts.indexOf("tables");
    const subPath = tablesIndex >= 0 ? pathParts.slice(tablesIndex + 1) : [];

    // GET /tables - Get all tables
    if (req.method === "GET" && subPath.length === 0) {
      const { data: tables, error } = await supabase
        .from("Table")
        .select("*")
        .order("number", { ascending: true });

      if (error) throw error;

      return new Response(JSON.stringify(tables), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /tables/qr/:qrCode - Get table by QR code
    if (req.method === "GET" && subPath[0] === "qr" && subPath[1]) {
      const qrCode = subPath[1];

      // Try exact match first
      let { data: table, error } = await supabase
        .from("Table")
        .select("*")
        .eq("qrCode", qrCode)
        .single();

      // If not found, try alternative formats (tavolo1 <-> tavolo-1)
      if (error || !table) {
        let altQrCode = qrCode;
        // Convert "tavolo1" to "tavolo-1" or vice versa
        if (/^tavolo(\d+)$/i.test(qrCode)) {
          altQrCode = qrCode.replace(/^tavolo(\d+)$/i, "tavolo-$1");
        } else if (/^tavolo-(\d+)$/i.test(qrCode)) {
          altQrCode = qrCode.replace(/^tavolo-(\d+)$/i, "tavolo$1");
        }
        // Also try "table-X" format
        else if (/^table-(\d+)$/i.test(qrCode)) {
          altQrCode = qrCode.replace(/^table-(\d+)$/i, "tavolo-$1");
        }

        if (altQrCode !== qrCode) {
          const altResult = await supabase
            .from("Table")
            .select("*")
            .eq("qrCode", altQrCode)
            .single();

          if (!altResult.error && altResult.data) {
            table = altResult.data;
            error = null;
          }
        }
      }

      if (error || !table) {
        return new Response(JSON.stringify({ error: "Table not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify(table), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /tables/:id - Get table by ID with active orders
    if (req.method === "GET" && subPath[0] && subPath[0] !== "qr") {
      const tableId = subPath[0];
      const { data: table, error } = await supabase
        .from("Table")
        .select(
          `
          *,
          orders:Order(*)
        `
        )
        .eq("id", tableId)
        .single();

      if (error || !table) {
        return new Response(JSON.stringify({ error: "Table not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Filter only active orders
      const activeOrders = table.orders
        ?.filter((order: { status: string }) =>
          ["PENDING", "PREPARING", "READY"].includes(order.status)
        )
        .sort(
          (a: { createdAt: string }, b: { createdAt: string }) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

      return new Response(JSON.stringify({ ...table, orders: activeOrders }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /tables - Create table
    if (req.method === "POST" && subPath.length === 0) {
      const body = await req.json();
      const { number, seats, isCounter } = body;

      // Generate unique QR code
      const prefix = isCounter ? "counter" : "table";
      const qrCode = `${prefix}-${number}-${Date.now()}`;

      const { data: table, error } = await supabase
        .from("Table")
        .insert({
          number,
          seats: seats || 4,
          qrCode,
          isCounter: isCounter || false,
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(table), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PATCH /tables/:id/status - Update table status
    if (req.method === "PATCH" && subPath[0] && subPath[1] === "status") {
      const tableId = subPath[0];
      const body = await req.json();
      const { status } = body;

      const { data: table, error } = await supabase
        .from("Table")
        .update({ status })
        .eq("id", tableId)
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(table), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /tables/:id/customers - Get active customers at table
    if (req.method === "GET" && subPath[0] && subPath[1] === "customers") {
      const tableId = subPath[0];

      const { data: customers, error } = await supabase
        .from("TableCustomer")
        .select("*")
        .eq("tableId", tableId)
        .eq("isActive", true)
        .order("createdAt", { ascending: true });

      if (error) throw error;

      return new Response(JSON.stringify(customers || []), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /tables/:id/customers - Add customer to table
    if (req.method === "POST" && subPath[0] && subPath[1] === "customers") {
      const tableId = subPath[0];
      const body = await req.json();
      const { name } = body;

      if (!name || !name.trim()) {
        return new Response(JSON.stringify({ error: "Name is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if this name already exists and is active at this table
      const { data: existing } = await supabase
        .from("TableCustomer")
        .select("*")
        .eq("tableId", tableId)
        .eq("name", name.trim())
        .eq("isActive", true)
        .single();

      if (existing) {
        // Name already exists, just return it
        return new Response(JSON.stringify(existing), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if this is the first customer (will be host)
      const { count } = await supabase
        .from("TableCustomer")
        .select("*", { count: "exact", head: true })
        .eq("tableId", tableId)
        .eq("isActive", true);

      const isHost = (count || 0) === 0;
      const now = new Date().toISOString();

      const { data: customer, error } = await supabase
        .from("TableCustomer")
        .insert({
          id: generateId(),
          tableId,
          name: name.trim(),
          isHost,
          isActive: true,
          createdAt: now,
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(customer), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DELETE /tables/:id/customers - Clear all customers from table (when table is freed)
    if (req.method === "DELETE" && subPath[0] && subPath[1] === "customers") {
      const tableId = subPath[0];

      // Mark all customers as inactive
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("TableCustomer")
        .update({ isActive: false, leftAt: now })
        .eq("tableId", tableId)
        .eq("isActive", true);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
