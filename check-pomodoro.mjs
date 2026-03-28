const API_URL = 'https://biefwzrprjqusjynqwus.supabase.co/functions/v1'
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpZWZ3enJwcmpxdXNqeW5xd3VzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxMDgzMTgsImV4cCI6MjA3OTY4NDMxOH0.CfLbUJa3znC9zNYXdYa0zrFzZM4ASvgw9Ousq27ZqCw'

async function check() {
  const res = await fetch(API_URL + '/ingredients', {
    headers: { 'Authorization': 'Bearer ' + KEY }
  })
  const data = await res.json()

  // Cerca Pomodoro
  const pomodoro = data.find(i => i.name.toLowerCase().includes('pomodoro'))
  if (pomodoro) {
    console.log('Pomodoro trovato:')
    console.log('  ID:', pomodoro.id)
    console.log('  inStock:', pomodoro.inStock)
    console.log('  menuItems associati:', pomodoro.menuItems?.length || 0)
  } else {
    console.log('POMODORO NON TROVATO nel database!')
  }

  // Mostra ingredienti NON in stock
  const outOfStock = data.filter(i => i.inStock === false)
  console.log('\nIngredienti NON in stock:', outOfStock.length)
  outOfStock.forEach(i => console.log('  -', i.name))

  // Mostra tutti gli ingredienti
  console.log('\nTutti gli ingredienti (' + data.length + '):')
  data.forEach(i => console.log('  -', i.name, '(inStock:', i.inStock + ')'))
}

check().catch(console.error)
