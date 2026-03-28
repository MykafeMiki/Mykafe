// Test ingrediente secondario

const API_URL = 'https://biefwzrprjqusjynqwus.supabase.co/functions/v1'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpZWZ3enJwcmpxdXNqeW5xd3VzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxMDgzMTgsImV4cCI6MjA3OTY4NDMxOH0.CfLbUJa3znC9zNYXdYa0zrFzZM4ASvgw9Ousq27ZqCw'
const ADMIN_PASSWORD = 'Mykafe2010!'

async function test() {
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
  const pomodoro = ingredients.find(i => i.name.toLowerCase() === 'pomodoro')

  if (!pomodoro) {
    console.log('Ingrediente Pomodoro non trovato!')
    return
  }

  console.log(`Pomodoro attuale: inStock = ${pomodoro.inStock}`)

  // Disabilita pomodoro
  await fetch(`${API_URL}/ingredients/${pomodoro.id}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ inStock: false })
  })
  console.log('Pomodoro disabilitato')

  // Check menu pubblico - Toast 02 (Bagel, mozzarella, zucchine, pomodoro)
  const menuRes = await fetch(`${API_URL}/menu`, {
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    }
  })
  const menu = await menuRes.json()

  const bagelCat = menu.find(c => c.name === 'Bagel')
  const toast02 = bagelCat?.items?.find(i => i.name === 'Toast 02')

  if (toast02) {
    console.log('\n=== Toast 02 ===')
    console.log('Descrizione:', toast02.description)
    console.log('unavailableIngredients:', JSON.stringify(toast02.unavailableIngredients, null, 2))
  } else {
    console.log('Toast 02 non trovato nel menu')
  }

  // Riabilita pomodoro
  await fetch(`${API_URL}/ingredients/${pomodoro.id}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ inStock: true })
  })
  console.log('\nPomodoro riabilitato')
}

test().catch(console.error)
