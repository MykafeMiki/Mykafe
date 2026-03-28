// Debug script to check ingredient associations

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

async function debug() {
  const token = await login()
  console.log('Token:', token ? 'OK' : 'FAILED')

  // Get admin menu
  const res = await fetch(`${API_URL}/menu/admin/categories`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
  const categories = await res.json()

  // Find Bagel category
  const bagelCat = categories.find(c => c.name === 'Bagel')
  if (!bagelCat) {
    console.log('Bagel category not found!')
    return
  }

  console.log(`\nBagel category has ${bagelCat.items?.length || 0} items`)

  // Get first Bagel product
  const firstItem = bagelCat.items?.[0]
  if (!firstItem) {
    console.log('No items in Bagel category')
    return
  }

  console.log(`\nFirst item: ${firstItem.name} (ID: ${firstItem.id})`)
  console.log('Description:', firstItem.description)

  // Try to GET ingredients
  console.log('\n--- GET ingredients ---')
  const getRes = await fetch(`${API_URL}/menu/items/${firstItem.id}/ingredients`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
  console.log('Status:', getRes.status)
  const getBody = await getRes.text()
  console.log('Response:', getBody)

  // Try PUT with a test ingredient
  // First get ingredients list
  const ingRes = await fetch(`${API_URL}/ingredients`, {
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    }
  })
  const ingredients = await ingRes.json()
  const bagelIng = ingredients.find(i => i.name.toLowerCase() === 'bagel')
  const mozzarellaIng = ingredients.find(i => i.name.toLowerCase() === 'mozzarella')

  console.log('\nBagel ingredient:', bagelIng?.id || 'NOT FOUND')
  console.log('Mozzarella ingredient:', mozzarellaIng?.id || 'NOT FOUND')

  if (bagelIng && mozzarellaIng) {
    console.log('\n--- PUT ingredients ---')
    const putRes = await fetch(`${API_URL}/menu/items/${firstItem.id}/ingredients`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ingredients: [
          { id: bagelIng.id, isPrimary: true },
          { id: mozzarellaIng.id, isPrimary: true }
        ]
      })
    })
    console.log('Status:', putRes.status)
    const putBody = await putRes.text()
    console.log('Response:', putBody)

    // Now GET again
    console.log('\n--- GET after PUT ---')
    const getRes2 = await fetch(`${API_URL}/menu/items/${firstItem.id}/ingredients`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    console.log('Status:', getRes2.status)
    const getBody2 = await getRes2.text()
    console.log('Response:', getBody2)
  }
}

debug().catch(console.error)
