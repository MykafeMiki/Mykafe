// Script diagnostico per sushi e ingredienti

const SUPABASE_URL = 'https://biefwzrprjqusjynqwus.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpZWZ3enJwcmpxdXNqeW5xd3VzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxMDgzMTgsImV4cCI6MjA3OTY4NDMxOH0.CfLbUJa3znC9zNYXdYa0zrFzZM4ASvgw9Ousq27ZqCw'

async function diagnose() {
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
  }

  console.log('=== DIAGNOSI SUSHI ===\n')

  // Prima vediamo TUTTE le categorie dall'API menu
  const API_URL = 'https://biefwzrprjqusjynqwus.supabase.co/functions/v1'
  const allCatsRes = await fetch(`${API_URL}/menu/admin/categories`, {
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    }
  })
  const allCats = await allCatsRes.json()
  console.log('TUTTE le categorie (via admin API):')
  if (Array.isArray(allCats)) {
    allCats.forEach(c => {
      const hasSushi = c.name.toLowerCase().includes('sushi')
      console.log(`  - ${c.name}: active=${c.active} ${hasSushi ? '*** SUSHI ***' : ''}`)
    })
  } else {
    console.log('  Errore:', JSON.stringify(allCats))
  }

  // 1. Verifica categorie Sushi (questo potrebbe fallire per RLS)
  const catRes = await fetch(`${SUPABASE_URL}/rest/v1/Category?name=ilike.*sushi*&select=id,name,active`, { headers })
  const categories = await catRes.json()
  console.log('\nCategorie Sushi (query diretta):')
  if (!Array.isArray(categories) || categories.length === 0) {
    console.log('  Nessuna o RLS blocca')
  } else {
    categories.forEach(c => {
      console.log(`  - ${c.name}: active = ${c.active}`)
    })
  }

  console.log('\n=== DIAGNOSI INGREDIENTI ===\n')

  // 2. Verifica ingredienti
  const ingRes = await fetch(`${SUPABASE_URL}/rest/v1/Ingredient?select=id,name,inStock`, { headers })
  const ingredients = await ingRes.json()
  console.log(`Ingredienti totali nel DB: ${ingredients.length}`)

  if (ingredients.length === 0) {
    console.log('  NESSUN INGREDIENTE NEL DATABASE!')
  } else {
    const outOfStock = ingredients.filter(i => !i.inStock)
    const inStock = ingredients.filter(i => i.inStock)
    console.log(`  - In stock: ${inStock.length}`)
    console.log(`  - Out of stock: ${outOfStock.length}`)
    if (outOfStock.length > 0) {
      console.log('\n  Ingredienti NON disponibili:')
      outOfStock.forEach(i => console.log(`    - ${i.name}`))
    }
  }

  console.log('\n=== DIAGNOSI ASSOCIAZIONI INGREDIENTI ===\n')

  // 3. Verifica associazioni MenuItemIngredient
  const assocRes = await fetch(`${SUPABASE_URL}/rest/v1/MenuItemIngredient?select=id,menuItemId,ingredientId,isPrimary`, { headers })
  const associations = await assocRes.json()
  console.log(`Associazioni MenuItem-Ingredient: ${associations.length}`)

  console.log('\n=== TEST API MENU ===\n')

  // 4. Test API menu per vedere cosa viene restituito
  const menuRes = await fetch(`${API_URL}/menu`, {
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    }
  })
  const menu = await menuRes.json()

  // Cerca categorie sushi nel menu
  const sushiCats = menu.filter(c => c.name.toLowerCase().includes('sushi'))
  console.log(`Categorie Sushi restituite dall'API: ${sushiCats.length}`)
  sushiCats.forEach(c => {
    console.log(`  - ${c.name} (${c.items?.length || 0} items)`)
  })

  // Cerca item con unavailableIngredients
  let itemsWithUnavailable = 0
  menu.forEach(c => {
    c.items?.forEach(i => {
      if (i.unavailableIngredients?.length > 0) {
        itemsWithUnavailable++
      }
    })
  })
  console.log(`\nItems con unavailableIngredients: ${itemsWithUnavailable}`)
}

diagnose().catch(console.error)
