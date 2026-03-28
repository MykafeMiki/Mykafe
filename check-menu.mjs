// Check menu API response

const API_URL = 'https://biefwzrprjqusjynqwus.supabase.co/functions/v1'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpZWZ3enJwcmpxdXNqeW5xd3VzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxMDgzMTgsImV4cCI6MjA3OTY4NDMxOH0.CfLbUJa3znC9zNYXdYa0zrFzZM4ASvgw9Ousq27ZqCw'

async function check() {
  const menuRes = await fetch(`${API_URL}/menu`, {
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    }
  })
  const menu = await menuRes.json()

  // Find products with pomodoro in description
  console.log('=== Prodotti con "pomodoro" nella descrizione ===\n')

  for (const cat of menu) {
    for (const item of (cat.items || [])) {
      if (item.description?.toLowerCase().includes('pomodoro')) {
        console.log(`${cat.name} > ${item.name}`)
        console.log(`  Descrizione: ${item.description}`)
        console.log(`  unavailableIngredients: ${JSON.stringify(item.unavailableIngredients || [])}`)
        console.log()
      }
    }
  }
}

check().catch(console.error)
