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
      .eq("key", "ingredient_substitutes")
      .single();

    if (error) {
      if (error.code === "PGRST116") return NextResponse.json({});
      throw error;
    }

    return NextResponse.json(data?.value || {});
  } catch (error) {
    console.error("Error fetching substitutes:", error);
    return NextResponse.json({ error: "Failed to fetch substitutes" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid substitutes payload" }, { status: 400 });
    }

    const { error } = await supabase.from("AppSettings").upsert({
      key: "ingredient_substitutes",
      value: body,
      updatedAt: new Date().toISOString(),
    });

    if (error) throw error;

    // Note: Substitutes are only used for description display.
    // MenuItem availability is never affected by ingredient stock changes.

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving substitutes:", error);
    return NextResponse.json({ error: "Failed to save substitutes" }, { status: 500 });
  }
}
