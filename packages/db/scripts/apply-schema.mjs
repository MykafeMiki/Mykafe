import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://biefwzrprjqusjynqwus.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpZWZ3enJwcmpxdXNqeW5xd3VzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDEwODMxOCwiZXhwIjoyMDc5Njg0MzE4fQ.42_W-K86lC4KaeOeKhv-a1Hf-oqynNwxbHyGdLvkpmc";

const supabase = createClient(supabaseUrl, supabaseKey);

async function applySchema() {
  console.log("Checking if priceTakeaway column exists...");

  // Check if columns exist
  const { data: columns, error: checkError } = await supabase.rpc("exec_sql", {
    sql: `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'MenuItem'
      AND column_name IN ('priceTakeaway', 'priceTakeawayRemote')
    `,
  });

  if (checkError) {
    console.log("Cannot use RPC, trying direct query...");

    // Try adding columns directly via REST
    const { data, error } = await supabase
      .from("MenuItem")
      .select("id, priceTakeaway, priceTakeawayRemote")
      .limit(1);

    if (error && error.message.includes("column")) {
      console.log("Columns do not exist yet. Please add them via Supabase Dashboard SQL Editor:");
      console.log("");
      console.log('ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "priceTakeaway" INTEGER;');
      console.log('ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "priceTakeawayRemote" INTEGER;');
      console.log("");
    } else if (error) {
      console.log("Error:", error.message);
    } else {
      console.log("Columns already exist! Schema is up to date.");
      console.log("Sample data:", data);
    }
  } else {
    console.log("Existing columns:", columns);
  }
}

applySchema();
