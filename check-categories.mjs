import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://biefwzrprjqusjynqwus.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpZWZ3enJwcmpxdXNqeW5xd3MiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcyMzgyMDUwNSwiZXhwIjoxODgxNTg3MzA1fQ.pJ2UJtLsZwKcczJKSPxHSYPtQzINrKPxl1hczIEYBVQ"
);

const { data, error } = await supabase
  .from("Category")
  .select("id, name, active, sortOrder")
  .order("sortOrder");

if (error) {
  console.error("Error:", error);
} else {
  console.log("Categories:", JSON.stringify(data, null, 2));
}
