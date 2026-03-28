// Script per verificare gli ingredienti non disponibili

const API_URL = 'https://biefwzrprjqusjynqwus.supabase.co/functions/v1'
const SUPABASE_URL = 'https://biefwzrprjqusjynqwus.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpZWZ3enJwcmpxdXNqeW5xd3VzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxMDgzMTgsImV4cCI6MjA3OTY4NDMxOH0.CfLbUJa3znC9zNYXdYa0zrFzZM4ASvgw9Ousq27ZqCw'

async function check() {
  // 1. Verifica ingredienti out of stock
  console.log('\n=== INGREDIENTI NON DISPONIBILI ===')
  const ingRes = await fetch(`${SUPABASE_URL}/rest/v1/Ingredient?inStock=eq.false&select=id,name`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  })
  const outOfStock = await ingRes.json()
  console.log(outOfStock)

  // 2. Verifica menu
  console.log('\n=== MENU ITEMS CON UNAVAILABLE INGREDIENTS ===')
  const menuRes = await fetch(`${API_URL}/menu`, {
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    }
  })
  const menu = await menuRes.json()

  for (const cat of menu) {
    if (cat.items) {
      for (const item of cat.items) {
        if (item.unavailableIngredients && item.unavailableIngredients.length > 0) {
          console.log(`\n${item.name}:`)
          console.log(`  Descrizione: ${item.description}`)
          console.log(`  Unavailable:`, item.unavailableIngredients.map(i => i.name))
        }
      }
    }
  }

  // 3. Cerca panini con ingredienti associati
  console.log('\n=== PANINI CON INGREDIENTI ASSOCIATI (MenuItemIngredient) ===')
  const assocRes = await fetch(`${SUPABASE_URL}/rest/v1/MenuItemIngredient?select=menuItemId,isPrimary,ingredient:Ingredient(id,name,inStock)`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  })
  const associations = await assocRes.json()
  console.log(associations)
}

check().catch(console.error)
