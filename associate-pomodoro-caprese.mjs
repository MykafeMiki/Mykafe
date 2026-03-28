// Associa Pomodoro come ingrediente PRIMARIO alle Caprese
const API_URL = 'https://biefwzrprjqusjynqwus.supabase.co/functions/v1'
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpZWZ3enJwcmpxdXNqeW5xd3VzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxMDgzMTgsImV4cCI6MjA3OTY4NDMxOH0.CfLbUJa3znC9zNYXdYa0zrFzZM4ASvgw9Ousq27ZqCw'

const POMODORO_ID = '1391cd01-cde6-46bb-9d6c-b13b7b2a60cc'
const CAPRESE_IDS = [
  'cmiiv7woi0089fv0redlxb1qs', // Caprese 01
  'cmiiv7wpg008bfv0rv49sv59m'  // Caprese 02
]

async function associate() {
  for (const menuItemId of CAPRESE_IDS) {
    console.log('Associando Pomodoro a', menuItemId, 'come PRIMARY...')

    const res = await fetch(`${API_URL}/ingredients/${POMODORO_ID}/menu-items`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        menuItemId,
        isPrimary: true
      })
    })

    if (res.ok) {
      console.log('  OK!')
    } else {
      const err = await res.text()
      console.log('  Errore:', err)
    }
  }

  console.log('\nFatto! Ora se il Pomodoro è out of stock, le Caprese saranno nascoste.')
}

associate().catch(console.error)
