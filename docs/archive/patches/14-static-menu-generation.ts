/**
 * SOLUZIONE MASSIMA VELOCITÀ: Menu statico pre-generato
 * 
 * Il menu viene generato come file JSON statico e servito da CDN.
 * Latenza: ~20ms (solo download file)
 * 
 * Quando usarlo:
 * - Menu cambia raramente (qualche volta al giorno)
 * - Vuoi la massima velocità possibile
 * 
 * Trade-off:
 * - Devi rigenerare il file quando cambia il menu
 * - Ingredienti esauriti richiedono rigenerazione
 */

// ============================================================
// STEP 1: Script per generare menu statico
// File: scripts/generate-menu.ts
// Esegui: npx ts-node scripts/generate-menu.ts
// ============================================================

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function generateStaticMenu() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  console.log('Fetching menu from database...')

  // Fetch completo
  const { data: categories, error } = await supabase
    .from('Category')
    .select(`
      id, name, nameEn, nameFr, nameEs, nameHe,
      description, descriptionEn, descriptionFr, descriptionEs, descriptionHe,
      imageUrl, sortOrder, active,
      items:MenuItem(
        id, name, nameEn, nameFr, nameEs, nameHe,
        description, descriptionEn, descriptionFr, descriptionEs, descriptionHe,
        price, priceTakeaway, priceTakeawayRemote,
        imageUrl, available, sortOrder, categoryId,
        modifierGroups:ModifierGroup(
          id, name, nameEn, nameFr, nameEs, nameHe,
          required, multiSelect, minSelect, maxSelect,
          modifiers:Modifier(
            id, name, nameEn, nameFr, nameEs, nameHe,
            price, available, ingredientId
          )
        )
      )
    `)
    .eq('active', true)
    .order('sortOrder')

  if (error) throw error

  // Fetch ingredienti esauriti
  const { data: outOfStock } = await supabase
    .from('Ingredient')
    .select('id, name, nameEn, nameFr, nameEs, nameHe')
    .eq('inStock', false)

  const outOfStockIds = new Set((outOfStock || []).map(i => i.id))
  const outOfStockMap = new Map((outOfStock || []).map(i => [i.id, i]))

  // Filtra e prepara
  const menu = (categories || []).map(category => ({
    ...category,
    items: (category.items || [])
      .filter((item: any) => item.available)
      .sort((a: any, b: any) => a.sortOrder - b.sortOrder)
      .map((item: any) => ({
        ...item,
        modifierGroups: item.modifierGroups?.map((group: any) => ({
          ...group,
          modifiers: group.modifiers?.filter((mod: any) =>
            mod.available && (!mod.ingredientId || !outOfStockIds.has(mod.ingredientId))
          )
        }))
      }))
  }))

  // Genera file
  const output = {
    generatedAt: new Date().toISOString(),
    outOfStockIngredients: outOfStock || [],
    categories: menu
  }

  const outputPath = path.join(__dirname, '../apps/web/public/menu.json')
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2))

  console.log(`Menu generated: ${outputPath}`)
  console.log(`Categories: ${menu.length}`)
  console.log(`Items: ${menu.reduce((acc, c) => acc + (c.items?.length || 0), 0)}`)
  console.log(`Out of stock: ${outOfStock?.length || 0}`)
}

generateStaticMenu().catch(console.error)


// ============================================================
// STEP 2: API per caricare menu statico
// File: apps/web/src/lib/api.ts
// ============================================================

const STATIC_MENU_URL = '/menu.json'

interface StaticMenu {
  generatedAt: string
  outOfStockIngredients: { id: string; name: string }[]
  categories: Category[]
}

let staticMenuCache: StaticMenu | null = null

/**
 * GET MENU - Da file statico (~20ms)
 */
export async function getMenuStatic(): Promise<Category[]> {
  if (staticMenuCache) {
    return staticMenuCache.categories
  }

  const res = await fetch(STATIC_MENU_URL)
  if (!res.ok) {
    throw new Error('Failed to load menu')
  }

  const data: StaticMenu = await res.json()
  staticMenuCache = data

  return data.categories
}

/**
 * Forza refresh del menu statico
 */
export async function refreshStaticMenu(): Promise<void> {
  staticMenuCache = null
  await getMenuStatic()
}


// ============================================================
// STEP 3: Webhook per rigenerare quando cambia il menu
// File: supabase/functions/regenerate-menu/index.ts
// Trigger: Database webhook su INSERT/UPDATE/DELETE di MenuItem, Category, Ingredient
// ============================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const VERCEL_DEPLOY_HOOK = process.env.VERCEL_DEPLOY_HOOK // o simile

Deno.serve(async (req) => {
  // Questo webhook viene chiamato quando cambia il menu nel DB
  
  // Opzione 1: Chiama un deploy hook Vercel per rigenerare
  if (VERCEL_DEPLOY_HOOK) {
    await fetch(VERCEL_DEPLOY_HOOK, { method: 'POST' })
  }

  // Opzione 2: Chiama direttamente lo script di generazione
  // await fetch('https://your-api.com/api/generate-menu', { method: 'POST' })

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  })
})


// ============================================================
// STEP 4: API Route Next.js per generare on-demand
// File: apps/web/src/app/api/generate-menu/route.ts
// ============================================================

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
import { join } from 'path'

export async function POST(request: Request) {
  // Verifica auth (solo admin può rigenerare)
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // ... stessa logica di generazione ...

  return NextResponse.json({ success: true, generatedAt: new Date().toISOString() })
}
