// Script per recuperare il menu e creare le associazioni ingredienti

const API_URL = 'https://biefwzrprjqusjynqwus.supabase.co/functions/v1'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpZWZ3enJwcmpxdXNqeW5xd3VzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxMDgzMTgsImV4cCI6MjA3OTY4NDMxOH0.CfLbUJa3znC9zNYXdYa0zrFzZM4ASvgw9Ousq27ZqCw'

async function fetchMenu() {
  const res = await fetch(`${API_URL}/menu`, {
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    }
  })

  if (!res.ok) {
    console.error('Error:', res.status, await res.text())
    return
  }

  const data = await res.json()

  // Stampa le categorie e i prodotti
  for (const cat of data) {
    console.log(`\n=== CATEGORIA: ${cat.name} ===`)
    if (cat.items) {
      for (const item of cat.items) {
        console.log(`  - ${item.name}`)
        console.log(`    Descrizione: ${item.description || 'nessuna'}`)
      }
    }
  }
}

fetchMenu().catch(console.error)
