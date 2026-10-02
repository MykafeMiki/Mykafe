import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(
    (process.env.NEXT_PUBLIC_SUPABASE_URL || "https://biefwzrprjqusjynqwus.supabase.co").replace("supabase.con", "supabase.co"),
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

// La scrittura sta nell'edge function `ingredients` (PUT /ingredients/substitutes):
// qui manca la secret key e la RLS di AppSettings rifiuta la anon key.
