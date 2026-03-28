// Toggle Bagel ingredient availability

const API_URL = 'https://biefwzrprjqusjynqwus.supabase.co/functions/v1'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpZWZ3enJwcmpxdXNqeW5xd3VzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxMDgzMTgsImV4cCI6MjA3OTY4NDMxOH0.CfLbUJa3znC9zNYXdYa0zrFzZM4ASvgw9Ousq27ZqCw'
const ADMIN_PASSWORD = 'Mykafe2010!'

async function toggle() {
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

  // Get ingredients
  const ingRes = await fetch(`${API_URL}/ingredients`, {
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    }
  })
  const ingredients = await ingRes.json()
  const bagel = ingredients.find(i => i.name.toLowerCase() === 'bagel')

  if (!bagel) {
    console.log('Ingrediente Bagel non trovato!')
    return
  }

  console.log(`Bagel attuale: inStock = ${bagel.inStock}`)

  // Toggle
  const newStock = !bagel.inStock
  console.log(`Token: ${token ? token.substring(0, 20) + '...' : 'MISSING'}`)
  const updateRes = await fetch(`${API_URL}/ingredients/${bagel.id}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ inStock: newStock })
  })
  console.log('Status:', updateRes.status)

  if (updateRes.ok) {
    console.log(`Bagel aggiornato: inStock = ${newStock}`)
  } else {
    console.log('Errore:', await updateRes.text())
  }

  // Check menu
  const menuRes = await fetch(`${API_URL}/menu`, {
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    }
  })
  const menu = await menuRes.json()
  const bagelCat = menu.find(c => c.name === 'Bagel')
  console.log(`\nCategoria Bagel: ${bagelCat?.items?.length || 0} prodotti nel menu`)
}

toggle().catch(console.error)
