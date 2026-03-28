// Script per creare ingredienti e associarli ai prodotti automaticamente

const API_URL = 'https://biefwzrprjqusjynqwus.supabase.co/functions/v1'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpZWZ3enJwcmpxdXNqeW5xd3VzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxMDgzMTgsImV4cCI6MjA3OTY4NDMxOH0.CfLbUJa3znC9zNYXdYa0zrFzZM4ASvgw9Ousq27ZqCw'
const ADMIN_PASSWORD = 'Mykafe2010!'

let adminToken = null

// Ingredienti SEMPRE primari (fondamentali) - se finiscono, il piatto sparisce
const ALWAYS_PRIMARY = [
  'tonno',
  'salmone affumicato',
  'mozzarella',
  'formaggi misti',
  'mozzarelline',
  'feta'
]

// Ingredienti base (pane) - sempre primari se sono il primo ingrediente
const BASE_INGREDIENTS = [
  'bagel', 'ciabatta', 'pane arabo', 'focaccia', 'piadina', 'pizza', 'pane tostato', 'insalata'
]

// Traduzioni ingredienti
const TRANSLATIONS = {
  'bagel': { en: 'Bagel', fr: 'Bagel', es: 'Bagel', he: 'בייגל' },
  'ciabatta': { en: 'Ciabatta', fr: 'Ciabatta', es: 'Ciabatta', he: 'צ\'יאבטה' },
  'pane arabo': { en: 'Arabic bread', fr: 'Pain arabe', es: 'Pan árabe', he: 'פיתה' },
  'focaccia': { en: 'Focaccia', fr: 'Focaccia', es: 'Focaccia', he: 'פוקאצ\'ה' },
  'piadina': { en: 'Piadina', fr: 'Piadina', es: 'Piadina', he: 'פיאדינה' },
  'pizza': { en: 'Pizza', fr: 'Pizza', es: 'Pizza', he: 'פיצה' },
  'pane tostato': { en: 'Toasted bread', fr: 'Pain grillé', es: 'Pan tostado', he: 'לחם קלוי' },
  'mozzarella': { en: 'mozzarella', fr: 'mozzarella', es: 'mozzarella', he: 'מוצרלה' },
  'pomodoro': { en: 'tomato', fr: 'tomate', es: 'tomate', he: 'עגבנייה' },
  'rucola': { en: 'arugula', fr: 'roquette', es: 'rúcula', he: 'רוקט' },
  'melanzane': { en: 'eggplant', fr: 'aubergine', es: 'berenjena', he: 'חציל' },
  'zucchine': { en: 'zucchini', fr: 'courgette', es: 'calabacín', he: 'קישוא' },
  'funghi': { en: 'mushrooms', fr: 'champignons', es: 'champiñones', he: 'פטריות' },
  'tonno': { en: 'tuna', fr: 'thon', es: 'atún', he: 'טונה' },
  'salmone affumicato': { en: 'smoked salmon', fr: 'saumon fumé', es: 'salmón ahumado', he: 'סלמון מעושן' },
  'avocado': { en: 'avocado', fr: 'avocat', es: 'aguacate', he: 'אבוקדו' },
  'lattuga': { en: 'lettuce', fr: 'laitue', es: 'lechuga', he: 'חסה' },
  'insalata': { en: 'salad', fr: 'salade', es: 'ensalada', he: 'סלט' },
  'cetrioli': { en: 'cucumbers', fr: 'concombres', es: 'pepinos', he: 'מלפפונים' },
  'carote': { en: 'carrots', fr: 'carottes', es: 'zanahorias', he: 'גזר' },
  'olive': { en: 'olives', fr: 'olives', es: 'aceitunas', he: 'זיתים' },
  'cipolle': { en: 'onions', fr: 'oignons', es: 'cebollas', he: 'בצל' },
  'cipolla': { en: 'onion', fr: 'oignon', es: 'cebolla', he: 'בצל' },
  'mais': { en: 'corn', fr: 'maïs', es: 'maíz', he: 'תירס' },
  'peperoni': { en: 'peppers', fr: 'poivrons', es: 'pimientos', he: 'פלפלים' },
  'carciofi': { en: 'artichokes', fr: 'artichauts', es: 'alcachofas', he: 'ארטישוק' },
  'formaggi misti': { en: 'mixed cheeses', fr: 'fromages mélangés', es: 'quesos mixtos', he: 'גבינות מעורבות' },
  'feta': { en: 'feta', fr: 'feta', es: 'feta', he: 'פטה' },
  'mozzarelline': { en: 'mozzarella balls', fr: 'billes de mozzarella', es: 'bolitas de mozzarella', he: 'כדורי מוצרלה' },
  'pesto': { en: 'pesto', fr: 'pesto', es: 'pesto', he: 'פסטו' },
  'maionese': { en: 'mayonnaise', fr: 'mayonnaise', es: 'mayonesa', he: 'מיונז' },
  'ketchup': { en: 'ketchup', fr: 'ketchup', es: 'ketchup', he: 'קטשופ' },
  'chimichurri': { en: 'chimichurri', fr: 'chimichurri', es: 'chimichurri', he: 'צ\'ימיצ\'ורי' },
  'patè di olive': { en: 'olive pâté', fr: 'pâté d\'olives', es: 'paté de aceitunas', he: 'ממרח זיתים' },
  'origano': { en: 'oregano', fr: 'origan', es: 'orégano', he: 'אורגנו' },
  'pomodori': { en: 'tomatoes', fr: 'tomates', es: 'tomates', he: 'עגבניות' },
}

async function login() {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ password: ADMIN_PASSWORD })
  })

  if (!res.ok) {
    throw new Error(`Login failed: ${await res.text()}`)
  }

  const data = await res.json()
  adminToken = data.token
  console.log('Login effettuato con successo')
}

async function fetchApi(endpoint, options = {}) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    }
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API Error ${res.status}: ${text}`)
  }

  return res.json()
}

async function fetchApiAuth(endpoint, options = {}) {
  if (!adminToken) {
    await login()
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    }
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API Error ${res.status}: ${text}`)
  }

  return res.json()
}

function isPrimaryIngredient(ingredientName, position) {
  const name = ingredientName.toLowerCase()

  // 1. Ingredienti SEMPRE primari (fondamentali) - ovunque appaiano
  // Tonno, Salmone, Mozzarella, Formaggi misti, Mozzarelline, Feta
  if (ALWAYS_PRIMARY.some(p => name === p)) {
    return true
  }

  // 2. Primo ingrediente se è una base (pane)
  if (position === 0 && BASE_INGREDIENTS.some(b => name.includes(b))) {
    return true
  }

  return false
}

async function main() {
  console.log('=== Setup Ingredienti (v2) ===\n')
  console.log('Regole PRIMARY (se mancano, il piatto sparisce):')
  console.log('- Primo ingrediente (base/pane): Bagel, Ciabatta, Pane arabo, Focaccia, etc.')
  console.log('- Ingredienti fondamentali: Tonno, Salmone, Mozzarella, Formaggi misti, Feta\n')

  // 0. Login
  await login()

  // 1. Fetch menu completo con ID
  console.log('1. Recupero menu...')
  const categories = await fetchApiAuth('/menu/admin/categories')
  console.log(`   Trovate ${categories.length} categorie`)

  // 2. Fetch ingredienti esistenti
  console.log('2. Recupero ingredienti esistenti...')
  const existingIngredients = await fetchApi('/ingredients')
  const ingredientMap = new Map()
  for (const ing of existingIngredients) {
    ingredientMap.set(ing.name.toLowerCase(), ing)
  }
  console.log(`   Trovati ${existingIngredients.length} ingredienti esistenti`)

  // 3. Associa ingredienti ai prodotti
  console.log('\n3. Associo ingredienti ai prodotti...')
  let associations = 0
  let skipped = 0

  for (const cat of categories) {
    console.log(`\n   === ${cat.name} ===`)

    for (const item of (cat.items || [])) {
      if (!item.description) {
        skipped++
        continue
      }

      const itemIngredients = []
      const parts = item.description.split(',').map(p => p.trim())

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i].toLowerCase()
        const ing = ingredientMap.get(part)

        if (ing) {
          const isPrimary = isPrimaryIngredient(part, i)
          itemIngredients.push({
            id: ing.id,
            isPrimary
          })
        }
      }

      if (itemIngredients.length > 0) {
        try {
          await fetchApiAuth(`/menu/items/${item.id}/ingredients`, {
            method: 'PUT',
            body: JSON.stringify({ ingredients: itemIngredients })
          })
          associations++
          const primaryList = itemIngredients
            .filter(i => i.isPrimary)
            .map(i => {
              const ing = existingIngredients.find(e => e.id === i.id)
              return ing ? ing.name : '?'
            })
          console.log(`   ✓ ${item.name}`)
          console.log(`     PRIMARY: ${primaryList.join(', ')}`)
        } catch (e) {
          console.log(`   ✗ ${item.name}: ${e.message}`)
        }
      }
    }
  }

  console.log(`\n=== COMPLETATO! ===`)
  console.log(`Prodotti aggiornati: ${associations}`)
  console.log(`Prodotti senza descrizione: ${skipped}`)
  console.log(`\n📋 Come funziona ora:`)
  console.log(`   - Disattivi "Bagel" → spariscono tutti i toast Bagel`)
  console.log(`   - Disattivi "Mozzarella" → spariscono tutti i piatti con mozzarella`)
  console.log(`   - Disattivi "Tonno" → spariscono tutti i piatti con tonno`)
  console.log(`   - Disattivi "Pomodoro" → viene rimosso dalla descrizione (secondario)`)
}

main().catch(console.error)
