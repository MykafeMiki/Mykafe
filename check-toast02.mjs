// Check Toast 02 ingredients

const API_URL = 'https://biefwzrprjqusjynqwus.supabase.co/functions/v1'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpZWZ3enJwcmpxdXNqeW5xd3VzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxMDgzMTgsImV4cCI6MjA3OTY4NDMxOH0.CfLbUJa3znC9zNYXdYa0zrFzZM4ASvgw9Ousq27ZqCw'
const ADMIN_PASSWORD = 'Mykafe2010!'

async function check() {
  // Login
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ password: ADMIN_PASSWORD })
  })
  const { token } = await loginRes.json()

  // Get all ingredients
  const ingRes = await fetch(`${API_URL}/ingredients`, {
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    }
  })
  const ingredients = await ingRes.json()
  const ingMap = new Map(ingredients.map(i => [i.id, i.name]))

  console.log('=== Ingredienti disponibili ===')
  for (const ing of ingredients) {
    if (['pomodoro', 'zucchine', 'mozzarella', 'bagel'].some(n => ing.name.toLowerCase().includes(n))) {
      console.log(`${ing.name}: ${ing.id}`)
    }
  }

  // Get admin menu
  const menuRes = await fetch(`${API_URL}/menu/admin/categories`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
  const categories = await menuRes.json()

  // Find Toast 02
  const bagelCat = categories.find(c => c.name === 'Bagel')
  const toast02 = bagelCat?.items?.find(i => i.name === 'Toast 02')

  if (!toast02) {
    console.log('Toast 02 non trovato')
    return
  }

  console.log('\n=== Toast 02 ===')
  console.log('ID:', toast02.id)
  console.log('Descrizione:', toast02.description)

  // Get ingredients for Toast 02
  const itemIngRes = await fetch(`${API_URL}/menu/items/${toast02.id}/ingredients`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
  const itemIngredients = await itemIngRes.json()

  console.log('\nIngredienti associati:')
  for (const ing of itemIngredients) {
    const name = ingMap.get(ing.ingredientId) || 'UNKNOWN'
    console.log(`  - ${name} (${ing.ingredientId}) - isPrimary: ${ing.isPrimary}`)
  }
}

check().catch(console.error)
