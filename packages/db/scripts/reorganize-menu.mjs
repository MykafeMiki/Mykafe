// Script per riorganizzare le categorie del menu
// Nuova struttura:
// 1. Panini Farciti (ex Toast + Bruschetta)
// 2. Piadine
// 3. Insalate (ex Salad)
// 4. Caprese
// 5. Affumicato
// 6. Focacce e Pizze (ex Pizza e Focaccia)
// 7. Caffetteria e Dolci (ex Caffetteria)
// 8. Bibite (ex Bevande)

const SUPABASE_URL = 'https://biefwzrprjqusjynqwus.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpZWZ3enJwcmpxdXNqeW5xd3VzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDEwODMxOCwiZXhwIjoyMDc5Njg0MzE4fQ.42_W-K86lC4KaeOeKhv-a1Hf-oqynNwxbHyGdLvkpmc'

async function updateCategory(id, data) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/menu/categories/${id}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })

  if (!response.ok) {
    throw new Error(`Failed to update category ${id}: ${await response.text()}`)
  }
  return response.json()
}

async function reorganizeMenu() {
  console.log('Riorganizzazione categorie menu...\n')

  // Categorie da rinominare e riordinare
  const updates = [
    {
      id: 'cmiiv7sch000gfv0rgdc87cd6', // Toast
      name: 'Panini Farciti',
      sortOrder: 1
    },
    {
      id: 'cmiiv7sfb000ifv0r5n3p6lpu', // Piadina
      name: 'Piadine',
      sortOrder: 2
    },
    {
      id: 'cmiiv7sed000hfv0r66boscqo', // Salad
      name: 'Insalate',
      sortOrder: 3
    },
    {
      id: 'cmiiv7sh6000kfv0r8ptaqj2l', // Caprese
      name: 'Caprese',
      sortOrder: 4
    },
    {
      id: 'cmiiv7sg9000jfv0r0cyo3d69', // Affumicato
      name: 'Affumicato',
      sortOrder: 5
    },
    {
      id: 'cmiiv7sj0000mfv0rgf5jqejd', // Pizza e Focaccia
      name: 'Focacce e Pizze',
      sortOrder: 6
    },
    {
      id: 'cmiiv7skw000ofv0rr8geyoez', // Caffetteria
      name: 'Caffetteria e Dolci',
      sortOrder: 7
    },
    {
      id: 'cmiiv7sjy000nfv0rxubx8ezt', // Bevande
      name: 'Bibite',
      sortOrder: 8
    },
    {
      id: 'cmiiv7si4000lfv0r9kbw8pb2', // Bruschetta - disattivare
      name: 'Bruschetta',
      active: false,
      sortOrder: 99
    }
  ]

  for (const update of updates) {
    const { id, ...data } = update
    console.log(`Aggiornamento: ${data.name} (sortOrder: ${data.sortOrder})${data.active === false ? ' [DISATTIVATA]' : ''}`)

    try {
      await updateCategory(id, data)
      console.log(`  ✓ OK`)
    } catch (error) {
      console.error(`  ✗ Errore: ${error.message}`)
    }
  }

  console.log('\n\nRiorganizzazione completata!')
}

reorganizeMenu().catch(console.error)
