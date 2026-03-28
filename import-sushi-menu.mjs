// Import menu sushi nella categoria Sushi
const API_URL = 'https://biefwzrprjqusjynqwus.supabase.co/functions/v1'
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpZWZ3enJwcmpxdXNqeW5xd3VzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxMDgzMTgsImV4cCI6MjA3OTY4NDMxOH0.CfLbUJa3znC9zNYXdYa0zrFzZM4ASvgw9Ousq27ZqCw'

// Menu sushi estratto dal PDF
const sushiItems = [
  {
    name: 'Vaschetta 10 pz. Salmone Crudo',
    description: '1 Uramaki + 2 Nigiri Salmone Crudo. Scelta tra: Avocado, Mango, Cetriolo',
    price: 12,
    sortOrder: 1
  },
  {
    name: 'Vaschetta 10 pz. Salmone Cotto',
    description: '1 Uramaki Salmone Cotto + 2 Nigiri Salmone Affumicato. Scelta tra: Avocado, Mango, Cetriolo',
    price: 13,
    sortOrder: 2
  },
  {
    name: 'Vaschetta 10 pz. Spicy Salmon',
    description: '1 Uramaki + 2 Nigiri Salmone Crudo',
    price: 13,
    sortOrder: 3
  },
  {
    name: 'Hosomaki Salmone',
    description: '1 Hosomaki 6 pezzi, salmone cotto o crudo',
    price: 6,
    sortOrder: 4
  },
  {
    name: 'Hosomaki Vegetariano',
    description: '1 Hosomaki 6 pezzi con Avocado, Cetriolo o Mango',
    price: 4,
    sortOrder: 5
  },
  {
    name: 'Tartare di Salmone',
    description: 'Salmone cotto o crudo. Scelta tra: Avocado, Mango',
    price: 10,
    sortOrder: 6
  },
  {
    name: 'Poké Salmone Crudo',
    description: 'Letto di riso con salmone crudo + 3 verdure a scelta: Avocado, Mango, Cetriolo, Edamame, Arancio, Finocchio',
    price: 15,
    sortOrder: 7
  },
  {
    name: 'Sandwich Salmone',
    description: '2 pezzi, salmone cotto o crudo. Scelta tra: Avocado, Mango, Cetriolo',
    price: 8,
    sortOrder: 8
  },
  {
    name: 'Temaki Salmone',
    description: '1 cono con salmone crudo, cotto o spicy. Scelta tra: Avocado, Mango, Cetriolo',
    price: 6,
    sortOrder: 9
  },
  {
    name: 'Futomaki Salmone',
    description: 'Roll da 10 pezzi con salmone cotto o crudo. Scelta tra: Avocado, Mango, Cetriolo, Edamame',
    price: 12,
    sortOrder: 10
  },
  {
    name: 'Sashimi Salmone',
    description: 'Letto di riso con 6 fette di filetto di salmone fresco',
    price: 10,
    sortOrder: 11
  },
  {
    name: 'Uramaki Salmone',
    description: 'Roll da 8 pezzi con salmone crudo o cotto. Scelta tra: Avocado, Cetriolo, Mango',
    price: 9.5,
    sortOrder: 12
  },
  {
    name: 'Uramaki Vegetariano',
    description: 'Roll da 8 pezzi. Scelta tra: Avocado, Cetriolo, Mango',
    price: 6,
    sortOrder: 13
  },
  {
    name: 'Onigiri',
    description: 'Palla di riso con tartare di salmone cotto o crudo',
    price: 8,
    sortOrder: 14
  },
  {
    name: 'Nigiri Salmone Crudo',
    description: '1 pezzo di riso con sopra filetto di salmone fresco',
    price: 1.5,
    sortOrder: 15
  },
  {
    name: 'Nigiri Salmone Cotto',
    description: '1 pezzo di riso con sopra filetto di salmone cotto',
    price: 1.5,
    sortOrder: 16
  },
  {
    name: 'Gunkan Salmone',
    description: 'Pallina di riso avvolta in striscia di salmone con sopra tartarina di salmone fresco',
    price: 3,
    sortOrder: 17
  },
  {
    name: 'Uramaki Ricoperto',
    description: 'Roll da 8 pezzi. Scelta ripieno: salmone crudo/cotto + avocado/mango/cetriolo. Copertura: salmone, avocado o mango',
    price: 11,
    sortOrder: 18
  },
  {
    name: 'Flying Dragon',
    description: 'Roll con salmone cotto o crudo + avocado o mango, ricoperto con salmone cotto, fili di kataifi e salsa teriyaki',
    price: 11,
    sortOrder: 19
  },
  {
    name: 'Oshi',
    description: 'Cubetti di riso con salmone crudo o cotto + avocado o mango. Sopra: sesamo o cipolla fritta',
    price: 8,
    sortOrder: 20
  }
]

async function importSushi() {
  // 1. Trova la categoria Sushi
  console.log('Cercando categoria Sushi...')
  const catsRes = await fetch(`${API_URL}/menu/admin/categories`, {
    headers: { 'Authorization': `Bearer ${KEY}` }
  })
  const categories = await catsRes.json()
  const sushiCat = categories.find(c => c.name === 'Sushi')

  if (!sushiCat) {
    console.error('Categoria Sushi non trovata!')
    return
  }

  console.log('Categoria Sushi trovata:', sushiCat.id)

  // 2. Inserisci ogni piatto
  let success = 0
  let failed = 0

  for (const item of sushiItems) {
    console.log(`Inserendo: ${item.name}...`)

    const res = await fetch(`${API_URL}/menu/items`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: item.name,
        description: item.description,
        price: item.price,
        categoryId: sushiCat.id,
        sortOrder: item.sortOrder
      })
    })

    if (res.ok) {
      console.log(`  ✓ ${item.name} inserito`)
      success++
    } else {
      const err = await res.text()
      console.log(`  ✗ Errore: ${err}`)
      failed++
    }
  }

  console.log(`\n=== COMPLETATO ===`)
  console.log(`Successi: ${success}`)
  console.log(`Falliti: ${failed}`)
}

importSushi().catch(console.error)
