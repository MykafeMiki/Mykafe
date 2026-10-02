import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getSecretKey } from "../_shared/keys.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAdminToken, unauthorizedResponse } from "../_shared/validation.ts";

/**
 * Scrittura delle impostazioni in AppSettings.
 *
 * AppSettings e' in sola lettura per la anon key (RLS): la lettura resta
 * pubblica (route Next /api/settings/*), la scrittura passa da qui con la
 * secret key e il token admin.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "PUT, OPTIONS",
};

// Path → chiave in AppSettings. Solo queste sono scrivibili.
const SETTING_KEYS: Record<string, string> = {
  closure: "closure_config",
};

function json(body: unknown, status = 200): Response {
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
    const pathParts = new URL(req.url).pathname.split("/").filter(Boolean);
    const idx = pathParts.indexOf("settings");
    const subPath = idx >= 0 ? pathParts.slice(idx + 1) : [];
    const key = subPath.length === 1 ? SETTING_KEYS[subPath[0]] : undefined;

    if (req.method !== "PUT" || !key) return json({ error: "Not found" }, 404);
    if (!(await verifyAdminToken(req))) return unauthorizedResponse(corsHeaders);

    const body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return json({ error: "Invalid settings payload" }, 400);
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", getSecretKey());
    const { error } = await supabase.from("AppSettings").upsert({
      key,
      value: body,
      updatedAt: new Date().toISOString(),
    });
    if (error) throw error;

    return json({ success: true });
  } catch (error) {
    console.error("Error:", error);
    return json({ error: "Internal server error" }, 500);
  }
});
