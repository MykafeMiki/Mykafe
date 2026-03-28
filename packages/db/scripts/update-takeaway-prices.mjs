// Script per aggiornare i prezzi takeaway dei panini
// Logica: prezzo takeaway = prezzo tavolo - €1.90 (costo insalata)

const SUPABASE_URL = "https://biefwzrprjqusjynqwus.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpZWZ3enJwcmpxdXNqeW5xd3VzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDEwODMxOCwiZXhwIjoyMDc5Njg0MzE4fQ.42_W-K86lC4KaeOeKhv-a1Hf-oqynNwxbHyGdLvkpmc";

const INSALATA_PRICE = 190; // €1.90 in centesimi

// Categorie che includono l'insalata (panini)
const PANINI_CATEGORIES = [
  "cmiiv7sch000gfv0rgdc87cd6", // Toast
  "cmiiv7sfb000ifv0r5n3p6lpu", // Piadina
];

async function updatePrices() {
  // Fetch menu
  const response = await fetch(`${SUPABASE_URL}/functions/v1/menu`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });

  const menu = await response.json();

  console.log("Aggiornamento prezzi takeaway per panini...\n");

  for (const category of menu) {
    if (!PANINI_CATEGORIES.includes(category.id)) continue;

    console.log(`\n=== ${category.name} ===`);

    for (const item of category.items || []) {
      const priceTable = item.price; // già in centesimi
      const priceTakeaway = priceTable - INSALATA_PRICE;

      console.log(
        `${item.name}: €${(priceTable / 100).toFixed(2)} -> €${(priceTakeaway / 100).toFixed(2)}`
      );

      // Update via API
      const updateResponse = await fetch(`${SUPABASE_URL}/functions/v1/menu/items/${item.id}`, {
        method: "PATCH",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceTakeaway: priceTakeaway / 100, // API expects euros
        }),
      });

      if (!updateResponse.ok) {
        console.error(`  ERRORE: ${await updateResponse.text()}`);
      } else {
        console.log(`  ✓ Aggiornato`);
      }
    }
  }

  console.log("\n\nAggiornamento completato!");
}

updatePrices().catch(console.error);
