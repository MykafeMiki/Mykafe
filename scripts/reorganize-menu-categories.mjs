// Script per riorganizzare le categorie del menu
// Esegui con: node scripts/reorganize-menu-categories.mjs

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://biefwzrprjqusjynqwus.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpZWZ3enJwcmpxdXNqeW5xd3VzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDEwODMxOCwiZXhwIjoyMDc5Njg0MzE4fQ.088dP_1Bxz-LHMcEDwn0Q3k6LsYUhLfUc31DT7QUXFM'

const supabase = createClient(supabaseUrl, supabaseKey)

// Funzione per generare ID simili a cuid
function generateId() {
  const timestamp = Date.now().toString(36)
  const randomPart = Math.random().toString(36).substring(2, 9)
  return `c${timestamp}${randomPart}`
}

async function reorganizeMenu() {
  console.log('🍽️  Riorganizzazione menu in corso...\n')

  // 1. Crea nuove categorie
  const newCategories = [
    {
      id: generateId(),
      name: 'Panini',
      nameEn: 'Sandwiches',
      nameFr: 'Sandwichs',
      nameEs: 'Bocadillos',
      nameHe: 'כריכים',
      description: 'Panini su ciabatta o pita',
      descriptionEn: 'Sandwiches on ciabatta or pita bread',
      sortOrder: 1,
      active: true
    },
    {
      id: generateId(),
      name: 'Bagel',
      nameEn: 'Bagels',
      nameFr: 'Bagels',
      nameEs: 'Bagels',
      nameHe: 'בייגל',
      description: 'Bagel farciti con ingredienti freschi',
      descriptionEn: 'Bagels stuffed with fresh ingredients',
      sortOrder: 2,
      active: true
    },
    {
      id: generateId(),
      name: 'Focaccia Farcita',
      nameEn: 'Stuffed Focaccia',
      nameFr: 'Focaccia Farcie',
      nameEs: 'Focaccia Rellena',
      nameHe: 'פוקצ\'ה ממולאה',
      description: 'Focaccia ripiena con ingredienti gustosi',
      descriptionEn: 'Focaccia filled with tasty ingredients',
      sortOrder: 3,
      active: true
    }
  ]

  console.log('📦 Creando nuove categorie...')

  const createdCategories = {}
  for (const cat of newCategories) {
    const { data, error } = await supabase
      .from('Category')
      .insert(cat)
      .select()
      .single()

    if (error) {
      console.error(`❌ Errore creando ${cat.name}:`, error.message)
    } else {
      console.log(`✅ Creata categoria: ${cat.name} (${data.id})`)
      createdCategories[cat.name] = data.id
    }
  }

  // 2. Mappatura degli item per tipo di pane
  // Basato sui dati del menu:
  const itemMappings = {
    // Ciabatta -> Panini
    'cmiiv7slt000qfv0ryvv3qggs': 'Panini', // Toast 01
    'cmiiv7u2y003efv0regxs1xy1': 'Panini', // Toast 09
    'cmiiv7usa004qfv0rdi7vumds': 'Panini', // Toast 13
    'cmiiv7vbb005qfv0r1b01qzao': 'Panini', // Toast 17
    'cmiiv7vhg0062fv0rk06tl3vm': 'Panini', // Toast 18
    // Pita -> Panini
    'cmiiv7t14001efv0rpgwqlz0i': 'Panini', // Toast 03
    'cmiiv7twn0032fv0r1llhjp8t': 'Panini', // Toast 08
    'cmiiv7ulx004efv0r48ugu9xs': 'Panini', // Toast 12
    // Bagel -> Bagel
    'cmiiv7suu0012fv0rpgaj3cju': 'Bagel', // Toast 02
    'cmiiv7t7j001qfv0rq53091gg': 'Bagel', // Toast 04
    'cmiiv7tdv0022fv0r1igxwq2m': 'Bagel', // Toast 05
    'cmiiv7tqf002qfv0rch92grjw': 'Bagel', // Toast 07
    'cmiiv7u9f003qfv0rgyfolvoa': 'Bagel', // Toast 10
    'cmiiv7ufq0042fv0rumpkd4do': 'Bagel', // Toast 11
    'cmiiv7uyo0052fv0r7e83o57c': 'Bagel', // Toast 15
    // Focaccia -> Focaccia Farcita
    'cmiiv7tk7002efv0rf4orxijt': 'Focaccia Farcita', // Toast 06
    'cmiiv7v52005efv0r2ielw88c': 'Focaccia Farcita', // Toast 16
  }

  console.log('\n📋 Spostando prodotti nelle nuove categorie...')

  for (const [itemId, categoryName] of Object.entries(itemMappings)) {
    const categoryId = createdCategories[categoryName]
    if (!categoryId) {
      console.error(`❌ Categoria ${categoryName} non trovata`)
      continue
    }

    const { error } = await supabase
      .from('MenuItem')
      .update({ categoryId })
      .eq('id', itemId)

    if (error) {
      console.error(`❌ Errore spostando item ${itemId}:`, error.message)
    } else {
      console.log(`✅ Spostato item ${itemId} -> ${categoryName}`)
    }
  }

  // 3. Aggiorna sortOrder delle categorie esistenti
  console.log('\n📊 Aggiornando ordine categorie esistenti...')

  const categoryUpdates = [
    { name: 'Piadine', sortOrder: 4, newName: 'Piadina' },
    { name: 'Focacce e Pizze', sortOrder: 5, newName: 'Focaccia e Pizza' },
    { name: 'Insalate', sortOrder: 6 },
    { name: 'Caprese', sortOrder: 7 },
    { name: 'Affumicato', sortOrder: 8 },
    { name: 'Bruschette', sortOrder: 9, newName: 'Bruschetta' },
    { name: 'Caffetteria e Dolci', sortOrder: 10, newName: 'Caffetteria' },
    { name: 'Bevande', sortOrder: 11 },
  ]

  for (const update of categoryUpdates) {
    const updateData = { sortOrder: update.sortOrder }
    if (update.newName) {
      updateData.name = update.newName
    }

    const { error } = await supabase
      .from('Category')
      .update(updateData)
      .eq('name', update.name)

    if (error) {
      console.error(`❌ Errore aggiornando ${update.name}:`, error.message)
    } else {
      console.log(`✅ Aggiornata categoria: ${update.name} -> sortOrder: ${update.sortOrder}${update.newName ? `, nome: ${update.newName}` : ''}`)
    }
  }

  // 4. Disattiva la vecchia categoria "Panini Farciti"
  console.log('\n🗑️  Disattivando vecchia categoria Panini Farciti...')

  const { error: deactivateError } = await supabase
    .from('Category')
    .update({ active: false })
    .eq('name', 'Panini Farciti')

  if (deactivateError) {
    console.error('❌ Errore disattivando Panini Farciti:', deactivateError.message)
  } else {
    console.log('✅ Categoria Panini Farciti disattivata')
  }

  console.log('\n✨ Riorganizzazione completata!')
}

reorganizeMenu().catch(console.error)
