import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getSecretKey } from "../_shared/keys.ts";
import { verifyAdminToken, unauthorizedResponse } from "../_shared/validation.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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
    // Path: /functions/v1/kiosk/register -> find 'kiosk' and take everything after
    const kioskIndex = pathParts.indexOf("kiosk");
    const subPath = kioskIndex >= 0 ? pathParts.slice(kioskIndex + 1) : [];

    // POST /kiosk/register - iPad self-registers (no auth: called before any staff involvement)
    if (req.method === "POST" && subPath[0] === "register") {
      const body = await req.json();
      const deviceId = (body?.deviceId || "").trim();
      const label = typeof body?.label === "string" ? body.label.trim() || null : null;

      if (!deviceId) {
        return json({ error: "deviceId is required" }, 400);
      }

      // Se il dispositivo esiste gia', non tocchiamo label/tableId: solo un
      // nuovo iPad deve essere creato "vuoto", uno che sta gia' riavviando la
      // pagina non deve perdere l'assegnazione o il nome impostato dall'admin.
      const { data: existing } = await supabase
        .from("KioskDevice")
        .select("*, table:Table(*)")
        .eq("deviceId", deviceId)
        .maybeSingle();

      if (existing) {
        return json(existing);
      }

      const now = new Date().toISOString();
      const { data: created, error } = await supabase
        .from("KioskDevice")
        .insert({ deviceId, label, tableId: null, createdAt: now, updatedAt: now })
        .select("*, table:Table(*)")
        .single();

      if (error) throw error;

      return json(created, 201);
    }

    // GET /kiosk - list all devices (admin)
    if (req.method === "GET" && subPath.length === 0) {
      if (!(await verifyAdminToken(req))) return unauthorizedResponse(corsHeaders);

      const { data, error } = await supabase
        .from("KioskDevice")
        .select("*, table:Table(*)")
        .order("createdAt", { ascending: true });

      if (error) throw error;

      return json(data || []);
    }

    // GET /kiosk/:deviceId - read one device's current assignment (public: polled by the iPad itself)
    if (req.method === "GET" && subPath[0]) {
      const deviceId = subPath[0];
      const { data, error } = await supabase
        .from("KioskDevice")
        .select("*, table:Table(*)")
        .eq("deviceId", deviceId)
        .single();

      if (error || !data) {
        return json({ error: "Device not found" }, 404);
      }

      return json(data);
    }

    // PATCH /kiosk/:deviceId - assign a table and/or rename (admin)
    if (req.method === "PATCH" && subPath[0]) {
      if (!(await verifyAdminToken(req))) return unauthorizedResponse(corsHeaders);

      const deviceId = subPath[0];
      const body = await req.json();
      const update: Record<string, unknown> = { updatedAt: new Date().toISOString() };

      if ("tableId" in body) update.tableId = body.tableId || null;
      if ("label" in body) update.label = (body.label || "").trim() || null;

      const { data, error } = await supabase
        .from("KioskDevice")
        .update(update)
        .eq("deviceId", deviceId)
        .select("*, table:Table(*)")
        .single();

      if (error) throw error;

      return json(data);
    }

    // DELETE /kiosk/:deviceId - forget a device (admin)
    if (req.method === "DELETE" && subPath[0]) {
      if (!(await verifyAdminToken(req))) return unauthorizedResponse(corsHeaders);

      const deviceId = subPath[0];
      const { error } = await supabase
        .from("KioskDevice")
        .delete()
        .eq("deviceId", deviceId);

      if (error) throw error;

      return json({ success: true });
    }

    return json({ error: "Not found" }, 404);
  } catch (error) {
    console.error("Error:", error);
    return json({ error: "Internal server error" }, 500);
  }
});
