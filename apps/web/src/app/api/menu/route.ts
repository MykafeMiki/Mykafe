import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Force dynamic: evita pre-rendering a build time (env vars non disponibili)
export const dynamic = 'force-dynamic'
export const revalidate = 0

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://biefwzrprjqusjynqwus.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )
}

export async function GET() {
  const supabase = getSupabase()

  try {
    // Query parallele per massima velocità
    const [categoriesResult, outOfStockResult] = await Promise.all([
      // Menu principale con ingredienti
      supabase
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
            ),
            ingredients:MenuItemIngredient(
              isPrimary,
              ingredient:Ingredient(id, name, nameEn, nameFr, nameEs, nameHe, inStock)
            )
          )
        `)
        .eq('active', true)
        .order('sortOrder', { ascending: true }),

      // Ingredienti non disponibili con match pre-calcolati
      supabase
        .from('Ingredient')
        .select(`
          id, name, nameEn, nameFr, nameEs, nameHe,
          menuItemMatches:MenuItemUnavailableIngredient(menuItemId)
        `)
        .eq('inStock', false)
    ])

    if (categoriesResult.error) throw categoriesResult.error

    const categories = categoriesResult.data || []

    // Mappa sostituti: ingredientId -> { id, name, ... } — query separata per non rompere i tipi
    const substitutesRes = await supabase
      .from('AppSettings')
      .select('value')
      .eq('key', 'ingredient_substitutes')
      .single()

    const substituteMap: Record<string, { id: string; name: string; nameEn?: string; nameFr?: string; nameEs?: string; nameHe?: string }> =
      (substitutesRes.data as { value?: Record<string, unknown> } | null)?.value as Record<string, { id: string; name: string }> || {}

    // Mappa: menuItemId -> ingredienti non disponibili (da description matching pre-calcolato)
    const itemUnavailableMap = new Map<string, { id: string, name: string, nameEn?: string, nameFr?: string, nameEs?: string, nameHe?: string }[]>()
    const outOfStockIds = new Set<string>()

    for (const ing of outOfStockResult.data || []) {
      outOfStockIds.add(ing.id)
      for (const match of ing.menuItemMatches || []) {
        if (!itemUnavailableMap.has(match.menuItemId)) {
          itemUnavailableMap.set(match.menuItemId, [])
        }
        itemUnavailableMap.get(match.menuItemId)!.push({
          id: ing.id,
          name: ing.name,
          nameEn: ing.nameEn,
          nameFr: ing.nameFr,
          nameEs: ing.nameEs,
          nameHe: ing.nameHe
        })
      }
    }

    // Filtra items e modifiers
    const menu = categories.map(category => ({
      ...category,
      items: (category.items || [])
        .filter((item: { available: boolean, ingredients?: { isPrimary: boolean, ingredient: { id: string, inStock: boolean } }[] }) => {
          if (!item.available) return false
          const primaryOutOfStockWithoutSubstitute = item.ingredients?.some((ing: { isPrimary: boolean, ingredient: { id: string, inStock: boolean } }) => {
            if (!ing.isPrimary || ing.ingredient?.inStock) return false
            return !substituteMap[ing.ingredient.id]
          })
          return !primaryOutOfStockWithoutSubstitute
        })
        .sort((a: { sortOrder: number }, b: { sortOrder: number }) => a.sortOrder - b.sortOrder)
        .map((item: {
          id: string,
          modifierGroups?: { modifiers?: { available: boolean; ingredientId?: string }[] }[],
          ingredients?: { isPrimary: boolean, ingredient: { id: string, name: string, nameEn?: string, nameFr?: string, nameEs?: string, nameHe?: string, inStock: boolean } }[]
        }) => {
          // Ingredienti non disponibili da associazioni esplicite
          const explicitUnavailable = (item.ingredients || [])
            .filter(assoc => !assoc.isPrimary && assoc.ingredient && !assoc.ingredient.inStock)
            .map(assoc => ({
              id: assoc.ingredient.id,
              name: assoc.ingredient.name,
              nameEn: assoc.ingredient.nameEn,
              nameFr: assoc.ingredient.nameFr,
              nameEs: assoc.ingredient.nameEs,
              nameHe: assoc.ingredient.nameHe
            }))

          // Ingredienti non disponibili da description matching pre-calcolato
          const descriptionMatches = itemUnavailableMap.get(item.id) || []

          // Merge e deduplica, aggiunge sostituto se disponibile
          const seenIds = new Set<string>()
          const unavailableIngredients: { id: string, name: string, nameEn?: string, nameFr?: string, nameEs?: string, nameHe?: string, substitute?: { id: string, name: string, nameEn?: string, nameFr?: string, nameEs?: string, nameHe?: string } }[] = []
          for (const ing of [...explicitUnavailable, ...descriptionMatches]) {
            if (!seenIds.has(ing.id)) {
              seenIds.add(ing.id)
              unavailableIngredients.push({
                ...ing,
                substitute: substituteMap[ing.id] ?? undefined
              })
            }
          }

          return {
            ...item,
            unavailableIngredients,
            ingredients: undefined, // Rimuovi raw ingredients
            modifierGroups: item.modifierGroups?.map(group => ({
              ...group,
              modifiers: group.modifiers?.filter(mod =>
                mod.available && (!mod.ingredientId || !outOfStockIds.has(mod.ingredientId))
              )
            }))
          }
        })
    }))

    return NextResponse.json(menu, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      }
    })

  } catch (error) {
    console.error('Menu API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch menu' },
      { status: 500 }
    )
  }
}
