// Test per verificare che gli ingredienti siano associati ai prodotti

const API_URL = 'https://biefwzrprjqusjynqwus.supabase.co/functions/v1'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpZWZ3enJwcmpxdXNqeW5xd3VzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxMDgzMTgsImV4cCI6MjA3OTY4NDMxOH0.CfLbUJa3znC9zNYXdYa0zrFzZM4ASvgw9Ousq27ZqCw'
const ADMIN_PASSWORD = 'Mykafe2010!'

async function login() {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ password: ADMIN_PASSWORD })
  })
  const data = await res.json()
  return data.token
}

async function test() {
  const token = await login()
  console.log('Login OK\n')

  // Fetch menu ADMIN per vedere gli ingredienti associati
  const res = await fetch(`${API_URL}/menu/admin/categories`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })

  const categories = await res.json()

  // Trova la categoria Bagel
  const bagelCat = categories.find(c => c.name === 'Bagel')
  if (bagelCat && bagelCat.items) {
    console.log('=== Categoria Bagel (Admin) ===')
    for (const item of bagelCat.items) {
      console.log(`\n${item.name}:`)

      // Fetch ingredienti del prodotto
      const ingRes = await fetch(`${API_URL}/menu/items/${item.id}/ingredients`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      const ingredients = await ingRes.json()

      if (ingredients && ingredients.length > 0) {
        for (const ing of ingredients) {
          console.log(`  - ${ing.ingredientId} (isPrimary: ${ing.isPrimary})`)
        }
      } else {
        console.log('  NESSUN INGREDIENTE ASSOCIATO!')
      }
    }
  }

  // Test menu pubblico
  console.log('\n\n=== Menu Pubblico ===')
  const menuRes = await fetch(`${API_URL}/menu`, {
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    }
  })
  const menu = await menuRes.json()

  for (const cat of menu) {
    console.log(`\n${cat.name}: ${cat.items?.length || 0} prodotti`)
  }
}

test().catch(console.error)
