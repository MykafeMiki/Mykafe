// Crea la categoria Sushi nel database
const API_URL = 'https://biefwzrprjqusjynqwus.supabase.co/functions/v1'
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpZWZ3enJwcmpxdXNqeW5xd3VzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxMDgzMTgsImV4cCI6MjA3OTY4NDMxOH0.CfLbUJa3znC9zNYXdYa0zrFzZM4ASvgw9Ousq27ZqCw'

async function createSushiCategory() {
  console.log('Creando categoria Sushi...')

  const res = await fetch(`${API_URL}/menu/categories`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'Sushi',
      description: 'Sushi fresco',
      sortOrder: 100 // Metti in fondo
    })
  })

  if (res.ok) {
    const category = await res.json()
    console.log('Categoria Sushi creata:', category)
  } else {
    const err = await res.text()
    console.log('Errore:', err)
  }
}

createSushiCategory().catch(console.error)
