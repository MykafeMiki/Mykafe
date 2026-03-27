/**
 * SOLUZIONE: Query diretta a Supabase (bypass Edge Functions)
 * 
 * Il menu è dati pubblici, non serve passare per le Edge Functions.
 * Chiamiamo Supabase direttamente dal client = ~100ms invece di ~400ms
 * 
 * File: apps/web/src/lib/api.ts
 */

import { createClient } from '@supabase/supabase-js'

// Client Supabase per query dirette (solo lettura pubblica)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://biefwzrprjqusjynqwus.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Cache in memoria
let menuCache: { data: Category[]; timestamp: number } | null = null
const CACHE_TTL = 60 * 1000 // 1 minuto

/**
 * GET MENU - Query diretta a Supabase (bypassa Edge Function)
 * ~100ms invece di ~400ms
 */
export async function getMenuFast(): Promise<Category[]> {
  // Check cache
  if (menuCache && (Date.now() - menuCache.timestamp) < CACHE_TTL) {
    return menuCache.data
  }

  // Query diretta a Supabase
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
          required, multiSelect, minSelect, maxSelect, menuItemId,
          modifiers:Modifier(
            id, name, nameEn, nameFr, nameEs, nameHe,
            price, available, modifierGroupId, ingredientId
          )
        )
      )
    `)
    .eq('active', true)
    .order('sortOrder', { ascending: true })

  if (error) {
    console.error('Menu fetch error:', error)
    throw error
  }

  // Fetch ingredienti non disponibili (per filtrare modifiers)
  const { data: outOfStockIngredients } = await supabase
    .from('Ingredient')
    .select('id')
    .eq('inStock', false)

  const outOfStockIds = new Set((outOfStockIngredients || []).map(i => i.id))

  // Filtra items e modifiers
  const filtered = (categories || []).map(category => ({
    ...category,
    items: (category.items || [])
      .filter((item: { available: boolean }) => item.available)
      .sort((a: { sortOrder: number }, b: { sortOrder: number }) => a.sortOrder - b.sortOrder)
      .map((item: { modifierGroups?: { modifiers?: { available: boolean; ingredientId?: string }[] }[] }) => ({
        ...item,
        modifierGroups: item.modifierGroups?.map(group => ({
          ...group,
          modifiers: group.modifiers?.filter(mod =>
            mod.available && (!mod.ingredientId || !outOfStockIds.has(mod.ingredientId))
          )
        }))
      }))
  }))

  // Aggiorna cache
  menuCache = { data: filtered, timestamp: Date.now() }

  return filtered
}

/**
 * Invalida cache (chiamare dopo modifiche admin)
 */
export function invalidateMenuCache() {
  menuCache = null
}
