import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://biefwzrprjqusjynqwus.supabase.co",
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  );
}

export async function GET() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("AppSettings")
      .select("value")
      .eq("key", "closure_config")
      .single();

    if (error) {
      if ((error as { code?: string }).code === "PGRST116") {
        // Config not set yet: let client merge with local defaults.
        return NextResponse.json({});
      }
      throw error;
    }

    return NextResponse.json(data?.value || {});
  } catch (error) {
    console.error("Error fetching closure config:", error);
    return NextResponse.json({ error: "Failed to fetch closure config" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid closure config payload" }, { status: 400 });
    }

    const { error } = await supabase.from("AppSettings").upsert({
      key: "closure_config",
      value: body,
      updatedAt: new Date().toISOString(),
    });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving closure config:", error);
    return NextResponse.json({ error: "Failed to save closure config" }, { status: 500 });
  }
}
