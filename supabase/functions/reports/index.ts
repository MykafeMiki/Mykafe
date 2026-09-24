import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getSecretKey } from "../_shared/keys.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAdminToken, unauthorizedResponse } from "../_shared/validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

interface TopProduct {
  menuItemId: string;
  name: string;
  totalQuantity: number;
  totalRevenue: number;
}

interface HourlyData {
  hour: number;
  orderCount: number;
  revenue: number;
}

// Ordini del periodo: quelli ancora in "Order" piu' quelli finiti in
// "OrderArchive" (reset manuale o pulizia dopo 24h), altrimenti i report
// perderebbero tutto cio' che e' stato azzerato. Un id compare una volta sola
// anche se un'archiviazione fosse andata a meta'.
// deno-lint-ignore no-explicit-any
async function fetchOrdersInPeriod(supabase: any, startDate: Date): Promise<any[]> {
  const startIso = startDate.toISOString();

  const [live, archives] = await Promise.all([
    supabase
      .from("Order")
      .select(
        `id, createdAt, totalAmount, status, orderType,
         items:OrderItem(quantity, menuItem:MenuItem(id, name))`
      )
      .gte("createdAt", startIso),
    supabase.from("OrderArchive").select("orders").gte("periodEnd", startIso),
  ]);

  if (live.error) throw live.error;
  if (archives.error) throw archives.error;

  // deno-lint-ignore no-explicit-any
  const byId = new Map<string, any>();

  for (const snapshot of archives.data || []) {
    // deno-lint-ignore no-explicit-any
    for (const o of (snapshot.orders || []) as any[]) {
      if (new Date(o.createdAt) < startDate) continue;
      byId.set(o.id, {
        id: o.id,
        createdAt: o.createdAt,
        totalAmount: o.totalAmount,
        status: o.status,
        orderType: o.orderType,
        // Nello snapshot il MenuItem ha solo nome e prezzo: l'id sta sulla riga.
        // deno-lint-ignore no-explicit-any
        items: (o.items || []).map((i: any) => ({
          quantity: i.quantity,
          menuItem: i.menuItem?.name
            ? { id: i.menuItemId, name: i.menuItem.name }
            : null,
        })),
      });
    }
  }

  for (const o of live.data || []) byId.set(o.id, o);

  return Array.from(byId.values());
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // I report di fatturato sono riservati allo staff.
    if (!(await verifyAdminToken(req))) return unauthorizedResponse(corsHeaders);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      getSecretKey()
    );

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const reportsIndex = pathParts.indexOf("reports");
    const subPath = reportsIndex >= 0 ? pathParts.slice(reportsIndex + 1) : [];

    // GET /reports/archives - elenco degli snapshot di cassa (senza gli ordini)
    // GET /reports/archives/:id - snapshot completo con gli ordini
    if (req.method === "GET" && subPath[0] === "archives") {
      const headers = { ...corsHeaders, "Content-Type": "application/json" };

      if (subPath[1]) {
        const { data, error } = await supabase
          .from("OrderArchive")
          .select("*")
          .eq("id", subPath[1])
          .maybeSingle();
        if (error) throw error;
        if (!data) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers });
        return new Response(JSON.stringify(data), { headers });
      }

      const { data, error } = await supabase
        .from("OrderArchive")
        .select('id, archivedAt, reason, orderCount, totalCash, totalCard, totalUnpaid, periodStart, periodEnd')
        .order("archivedAt", { ascending: false })
        .limit(200);
      if (error) throw error;
      return new Response(JSON.stringify(data), { headers });
    }

    // GET /reports/top-products?period=week|month
    if (req.method === "GET" && subPath[0] === "top-products") {
      const period = url.searchParams.get("period") || "week";

      // Calculate date range
      const now = new Date();
      let startDate: Date;

      if (period === "month") {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else {
        // Week: last 7 days
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
      }

      // Solo ordini completati
      const orders = (await fetchOrdersInPeriod(supabase, startDate)).filter(
        (o) => o.status === "SERVED"
      );

      // Aggregate products
      const productMap = new Map<string, TopProduct>();

      for (const order of orders || []) {
        for (const item of order.items || []) {
          if (!item.menuItem) continue;

          const existing = productMap.get(item.menuItem.id);
          if (existing) {
            existing.totalQuantity += item.quantity;
          } else {
            productMap.set(item.menuItem.id, {
              menuItemId: item.menuItem.id,
              name: item.menuItem.name,
              totalQuantity: item.quantity,
              totalRevenue: 0, // Will be calculated separately if needed
            });
          }
        }
      }

      // Sort by quantity and take top 10
      const topProducts = Array.from(productMap.values())
        .sort((a, b) => b.totalQuantity - a.totalQuantity)
        .slice(0, 10);

      return new Response(
        JSON.stringify({
          period,
          startDate: startDate.toISOString(),
          endDate: now.toISOString(),
          products: topProducts,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // GET /reports/peak-hours?period=week|month
    if (req.method === "GET" && subPath[0] === "peak-hours") {
      const period = url.searchParams.get("period") || "week";

      // Calculate date range
      const now = new Date();
      let startDate: Date;

      if (period === "month") {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else {
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
      }

      const orders = (await fetchOrdersInPeriod(supabase, startDate)).filter((o) =>
        ["SERVED", "READY", "PREPARING", "PENDING"].includes(o.status)
      );

      // Aggregate by hour
      const hourlyMap = new Map<number, HourlyData>();

      // Initialize all hours
      for (let h = 0; h < 24; h++) {
        hourlyMap.set(h, { hour: h, orderCount: 0, revenue: 0 });
      }

      for (const order of orders || []) {
        const orderDate = new Date(order.createdAt);
        const hour = orderDate.getHours();
        const data = hourlyMap.get(hour)!;
        data.orderCount++;
        data.revenue += order.totalAmount || 0;
      }

      const hourlyData = Array.from(hourlyMap.values()).sort((a, b) => a.hour - b.hour);

      // Find peak hours (top 3)
      const peakHours = [...hourlyData]
        .sort((a, b) => b.orderCount - a.orderCount)
        .slice(0, 3)
        .map((h) => h.hour);

      return new Response(
        JSON.stringify({
          period,
          startDate: startDate.toISOString(),
          endDate: now.toISOString(),
          hourlyData,
          peakHours,
          totalOrders: orders?.length || 0,
          totalRevenue: orders?.reduce((sum, o) => sum + (o.totalAmount || 0), 0) || 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // GET /reports/summary?period=week|month
    if (req.method === "GET" && subPath[0] === "summary") {
      const period = url.searchParams.get("period") || "week";

      const now = new Date();
      let startDate: Date;

      if (period === "month") {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else {
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
      }

      const orders = await fetchOrdersInPeriod(supabase, startDate);

      const completedOrders = orders?.filter((o) => o.status === "SERVED") || [];
      const totalItems =
        orders.reduce(
          // deno-lint-ignore no-explicit-any
          (sum, o) => sum + (o.items?.reduce((s: number, i: any) => s + i.quantity, 0) || 0),
          0
        ) ||
        0;

      // Orders by type
      const ordersByType = {
        DINE_IN: orders?.filter((o) => o.orderType === "DINE_IN").length || 0,
        TAKEAWAY: orders?.filter((o) => o.orderType === "TAKEAWAY").length || 0,
        COUNTER: orders?.filter((o) => o.orderType === "COUNTER").length || 0,
      };

      return new Response(
        JSON.stringify({
          period,
          startDate: startDate.toISOString(),
          endDate: now.toISOString(),
          totalOrders: orders?.length || 0,
          completedOrders: completedOrders.length,
          totalRevenue: completedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
          totalItems,
          ordersByType,
          averageOrderValue:
            completedOrders.length > 0
              ? completedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0) /
                completedOrders.length
              : 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
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
