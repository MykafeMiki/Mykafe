import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { verifyAdminToken, unauthorizedResponse } from "../_shared/validation.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
}

// In-memory cache for out-of-stock ingredients
interface CacheEntry<T> {
  data: T
  timestamp: number
}
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
let outOfStockCache: CacheEntry<Set<string>> | null = null
let lastMenuUpdate = Date.now()

// Helper: Get out-of-stock ingredient IDs with caching
async function getOutOfStockIds(supabase: ReturnType<typeof createClient>): Promise<Set<string>> {
  if (outOfStockCache && (Date.now() - outOfStockCache.timestamp) < CACHE_TTL) {
    return outOfStockCache.data
  }

  const { data: ingredients } = await supabase
    .from('Ingredient')
    .select('id')
    .eq('inStock', false)

  const ids = new Set<string>(ingredients?.map(i => i.id) || [])
  outOfStockCache = { data: ids, timestamp: Date.now() }
  return ids
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(Boolean)
    // Path: /functions/v1/menu/admin/categories -> pathParts = ['functions', 'v1', 'menu', 'admin', 'categories']
    // We need to find 'menu' and take everything after it
    const menuIndex = pathParts.indexOf('menu')
    const subPath = menuIndex >= 0 ? pathParts.slice(menuIndex + 1) : []

    // Protect all write operations (POST, PATCH, DELETE, PUT) with admin token
    const isWriteMethod = ['POST', 'PATCH', 'DELETE', 'PUT'].includes(req.method)
    if (isWriteMethod) {
      const isAdmin = await verifyAdminToken(req)
      if (!isAdmin) return unauthorizedResponse(corsHeaders)
    }

    // GET /menu - OPTIMIZED: Get full menu with categories and items
    if (req.method === 'GET' && subPath.length === 0) {
      // Quick ETag check first (before any DB queries)
      const etag = `"menu-${lastMenuUpdate}"`
      const ifNoneMatch = req.headers.get('If-None-Match')
      if (ifNoneMatch === etag) {
        return new Response(null, {
          status: 304,
          headers: { ...corsHeaders, 'ETag': etag }
        })
      }

      // OPTIMIZATION: Parallel queries instead of deeply nested joins
      const [categoriesResult, outOfStockResult, outOfStockIds] = await Promise.all([
        // Main menu query - simplified
        supabase
          .from('Category')
          .select(`
            *,
            items:MenuItem(
              *,
              modifierGroups:ModifierGroup(
                *,
                modifiers:Modifier(id, name, nameEn, nameFr, nameEs, nameHe, price, available, modifierGroupId, ingredientId)
              ),
              ingredients:MenuItemIngredient(
                ingredient:Ingredient(id, name, nameEn, nameFr, nameEs, nameHe, inStock)
              )
            )
          `)
          .eq('active', true)
          .order('sortOrder', { ascending: true }),

        // Out-of-stock ingredients WITH pre-calculated description matches
        supabase
          .from('Ingredient')
          .select(`
            id, name, nameEn, nameFr, nameEs, nameHe,
            menuItemMatches:MenuItemUnavailableIngredient(menuItemId)
          `)
          .eq('inStock', false),

        // Out-of-stock ingredient IDs only (cached)
        getOutOfStockIds(supabase)
      ])

      if (categoriesResult.error) throw categoriesResult.error

      const categories = categoriesResult.data || []

      // Build map: menuItemId -> unavailable ingredients (from pre-calculated description matching)
      const itemUnavailableMap = new Map<string, { id: string, name: string, nameEn?: string, nameFr?: string, nameEs?: string, nameHe?: string }[]>()

      for (const ing of outOfStockResult.data || []) {
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

      // Carica mappa sostituti per controllare se ingredienti primari out-of-stock hanno un sostituto
      const substitutesRes = await supabase
        .from('AppSettings')
        .select('value')
        .eq('key', 'ingredient_substitutes')
        .single()

      const substituteMap: Record<string, unknown> = (substitutesRes.data as { value?: Record<string, unknown> } | null)?.value as Record<string, unknown> || {}

      // OPTIMIZATION: Single pass filtering
      const filteredCategories = categories.map(cat => ({
        ...cat,
        items: (cat.items || [])
          .filter((item: { available: boolean }) => item.available)
          .sort((a: { sortOrder: number }, b: { sortOrder: number }) => a.sortOrder - b.sortOrder)
          .map((item: {
            id: string
            modifierGroups?: {
              modifiers?: {
                available: boolean
                ingredientId?: string
              }[]
            }[]
            ingredients?: { ingredient: { inStock: boolean, id: string, name: string, nameEn?: string, nameFr?: string, nameEs?: string, nameHe?: string } }[]
          }) => {
            // All explicitly linked ingredients that are out of stock
            const explicitUnavailable = (item.ingredients || [])
              .filter(assoc => assoc.ingredient && !assoc.ingredient.inStock)
              .map(assoc => ({
                id: assoc.ingredient.id,
                name: assoc.ingredient.name,
                nameEn: assoc.ingredient.nameEn,
                nameFr: assoc.ingredient.nameFr,
                nameEs: assoc.ingredient.nameEs,
                nameHe: assoc.ingredient.nameHe
              }))

            // Pre-calculated description matches (MenuItemUnavailableIngredient)
            const descriptionMatches = itemUnavailableMap.get(item.id) || []

            // Merge and deduplicate by ingredient ID, attach substitute if configured
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
              ingredients: undefined, // Remove raw ingredients from response
              modifierGroups: item.modifierGroups?.map(group => ({
                ...group,
                modifiers: group.modifiers?.filter(mod => {
                  if (!mod.available) return false
                  if (mod.ingredientId && outOfStockIds.has(mod.ingredientId)) return false
                  return true
                })
              }))
            }
          })
      }))

      const responseBody = JSON.stringify(filteredCategories)

      return new Response(responseBody, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          // OPTIMIZATION: Aggressive caching - 5 min + stale-while-revalidate 30 min
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=1800',
          'ETag': etag,
          'Vary': 'Accept-Encoding'
        }
      })
    }

    // GET /menu/items/:id/ingredients - Get menu item ingredients (must be BEFORE /menu/items/:id)
    if (req.method === 'GET' && subPath[0] === 'items' && subPath[1] && subPath[2] === 'ingredients') {
      const menuItemId = subPath[1]

      const { data: ingredients, error } = await supabase
        .from('MenuItemIngredient')
        .select('ingredientId')
        .eq('menuItemId', menuItemId)

      if (error) throw error

      return new Response(JSON.stringify(ingredients || []), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // GET /menu/items/:id - Get single menu item
    if (req.method === 'GET' && subPath[0] === 'items' && subPath[1] && !subPath[2]) {
      const itemId = subPath[1]
      const { data: item, error } = await supabase
        .from('MenuItem')
        .select(`
          *,
          modifierGroups:ModifierGroup(
            *,
            modifiers:Modifier(*)
          )
        `)
        .eq('id', itemId)
        .single()

      if (error || !item) {
        return new Response(JSON.stringify({ error: 'Item not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Filter available modifiers
      const filteredItem = {
        ...item,
        modifierGroups: item.modifierGroups?.map((group: { modifiers: { available: boolean }[] }) => ({
          ...group,
          modifiers: group.modifiers?.filter((mod: { available: boolean }) => mod.available)
        }))
      }

      return new Response(JSON.stringify(filteredItem), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // GET /menu/admin/categories - Get all categories (including inactive) for admin
    if (req.method === 'GET' && subPath[0] === 'admin' && subPath[1] === 'categories') {
      const { data: categories, error } = await supabase
        .from('Category')
        .select(`
          *,
          items:MenuItem(*)
        `)
        .order('sortOrder', { ascending: true })

      if (error) throw error

      // Sort items by sortOrder
      const sortedCategories = categories?.map(cat => ({
        ...cat,
        items: cat.items?.sort((a: { sortOrder: number }, b: { sortOrder: number }) => a.sortOrder - b.sortOrder)
      }))

      return new Response(JSON.stringify(sortedCategories), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // POST /menu/categories - Create category
    if (req.method === 'POST' && subPath[0] === 'categories') {
      const body = await req.json()
      const { name, description, sortOrder } = body

      // Generate a cuid-like ID
      const id = 'c' + crypto.randomUUID().replace(/-/g, '').slice(0, 24)
      const now = new Date().toISOString()

      const { data: category, error } = await supabase
        .from('Category')
        .insert({
          id,
          name,
          description,
          sortOrder: sortOrder || 0,
          updatedAt: now
        })
        .select()
        .single()

      if (error) throw error

      return new Response(JSON.stringify(category), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // POST /menu/items - Create menu item (con supporto per modifierGroups e ingredients)
    if (req.method === 'POST' && subPath[0] === 'items') {
      const body = await req.json()
      const { name, description, price, categoryId, imageUrl, sortOrder, modifierGroups, ingredientIds } = body

      // Generate ID and timestamp
      const id = 'c' + crypto.randomUUID().replace(/-/g, '').slice(0, 24)
      const now = new Date().toISOString()

      // Crea il menu item
      const { data: item, error } = await supabase
        .from('MenuItem')
        .insert({
          id,
          name,
          description,
          price: Math.round(price * 100), // Store in cents
          categoryId,
          imageUrl,
          sortOrder: sortOrder || 0,
          updatedAt: now
        })
        .select()
        .single()

      if (error) throw error

      // Crea i modifier groups se forniti
      if (modifierGroups && modifierGroups.length > 0) {
        for (const group of modifierGroups) {
          const { data: modGroup, error: groupError } = await supabase
            .from('ModifierGroup')
            .insert({
              name: group.name,
              menuItemId: item.id,
              required: group.required || false,
              multiSelect: group.multiSelect || false,
              minSelect: group.minSelect || 0,
              maxSelect: group.maxSelect || 5
            })
            .select()
            .single()

          if (groupError) throw groupError

          // Crea i modifiers per questo gruppo
          if (group.modifiers && group.modifiers.length > 0) {
            const modifiersToInsert = group.modifiers.map((mod: { name: string, price?: number, ingredientId?: string }) => ({
              name: mod.name,
              price: mod.price ? Math.round(mod.price * 100) : 0,
              modifierGroupId: modGroup.id,
              ingredientId: mod.ingredientId || null,
              available: true
            }))

            const { error: modError } = await supabase
              .from('Modifier')
              .insert(modifiersToInsert)

            if (modError) throw modError
          }
        }
      }

      // Associa ingredienti se forniti (ingredientIds: [{ id }])
      if (ingredientIds && ingredientIds.length > 0) {
        const ingredientAssociations = ingredientIds.map((ing: { id: string }) => ({
          menuItemId: item.id,
          ingredientId: ing.id,
          isPrimary: false
        }))

        const { error: ingError } = await supabase
          .from('MenuItemIngredient')
          .insert(ingredientAssociations)

        if (ingError) throw ingError
      }

      // Fetch complete item with relations
      const { data: completeItem, error: fetchError } = await supabase
        .from('MenuItem')
        .select(`
          *,
          modifierGroups:ModifierGroup(
            *,
            modifiers:Modifier(*)
          ),
          ingredients:MenuItemIngredient(
            *,
            ingredient:Ingredient(*)
          )
        `)
        .eq('id', item.id)
        .single()

      if (fetchError) throw fetchError

      return new Response(JSON.stringify(completeItem), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // PATCH /menu/items/:id - Update menu item
    if (req.method === 'PATCH' && subPath[0] === 'items' && subPath[1]) {
      const itemId = subPath[1]
      const body = await req.json()
      const { name, description, price, priceTakeaway, priceTakeawayRemote, imageUrl, sortOrder, available } = body

      const updateData: Record<string, unknown> = {}
      if (name !== undefined) updateData.name = name
      if (description !== undefined) updateData.description = description
      if (price !== undefined) updateData.price = Math.round(price * 100)
      // priceTakeaway e priceTakeawayRemote: null = usa prezzo base, numero = prezzo specifico
      if (priceTakeaway !== undefined) {
        updateData.priceTakeaway = priceTakeaway !== null ? Math.round(priceTakeaway * 100) : null
      }
      if (priceTakeawayRemote !== undefined) {
        updateData.priceTakeawayRemote = priceTakeawayRemote !== null ? Math.round(priceTakeawayRemote * 100) : null
      }
      if (imageUrl !== undefined) updateData.imageUrl = imageUrl
      if (sortOrder !== undefined) updateData.sortOrder = sortOrder
      if (available !== undefined) updateData.available = available

      const { data: item, error } = await supabase
        .from('MenuItem')
        .update(updateData)
        .eq('id', itemId)
        .select()
        .single()

      if (error) throw error

      return new Response(JSON.stringify(item), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // PATCH /menu/categories/:id - Update category
    if (req.method === 'PATCH' && subPath[0] === 'categories' && subPath[1]) {
      const categoryId = subPath[1]
      const body = await req.json()
      const { name, description, imageUrl, sortOrder, active } = body

      const updateData: Record<string, unknown> = {}
      if (name !== undefined) updateData.name = name
      if (description !== undefined) updateData.description = description
      if (imageUrl !== undefined) updateData.imageUrl = imageUrl
      if (sortOrder !== undefined) updateData.sortOrder = sortOrder
      if (active !== undefined) updateData.active = active

      const { data: category, error } = await supabase
        .from('Category')
        .update(updateData)
        .eq('id', categoryId)
        .select()
        .single()

      if (error) throw error

      return new Response(JSON.stringify(category), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // POST /menu/items/:id/modifier-groups - Add modifier group to menu item
    if (req.method === 'POST' && subPath[0] === 'items' && subPath[1] && subPath[2] === 'modifier-groups') {
      const menuItemId = subPath[1]
      const body = await req.json()
      const { name, required, multiSelect, minSelect, maxSelect, modifiers } = body

      const { data: modGroup, error: groupError } = await supabase
        .from('ModifierGroup')
        .insert({
          name,
          menuItemId,
          required: required || false,
          multiSelect: multiSelect || false,
          minSelect: minSelect || 0,
          maxSelect: maxSelect || 5
        })
        .select()
        .single()

      if (groupError) throw groupError

      // Crea modifiers se forniti
      if (modifiers && modifiers.length > 0) {
        const modifiersToInsert = modifiers.map((mod: { name: string, price?: number, ingredientId?: string }) => ({
          name: mod.name,
          price: mod.price ? Math.round(mod.price * 100) : 0,
          modifierGroupId: modGroup.id,
          ingredientId: mod.ingredientId || null,
          available: true
        }))

        await supabase.from('Modifier').insert(modifiersToInsert)
      }

      // Fetch complete group
      const { data: completeGroup } = await supabase
        .from('ModifierGroup')
        .select('*, modifiers:Modifier(*)')
        .eq('id', modGroup.id)
        .single()

      return new Response(JSON.stringify(completeGroup), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // POST /menu/modifier-groups/:id/modifiers - Add modifier to group
    if (req.method === 'POST' && subPath[0] === 'modifier-groups' && subPath[1] && subPath[2] === 'modifiers') {
      const modifierGroupId = subPath[1]
      const body = await req.json()
      const { name, price, ingredientId } = body

      const { data: modifier, error } = await supabase
        .from('Modifier')
        .insert({
          name,
          price: price ? Math.round(price * 100) : 0,
          modifierGroupId,
          ingredientId: ingredientId || null,
          available: true
        })
        .select()
        .single()

      if (error) throw error

      return new Response(JSON.stringify(modifier), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // PATCH /menu/modifiers/:id - Update modifier
    if (req.method === 'PATCH' && subPath[0] === 'modifiers' && subPath[1]) {
      const modifierId = subPath[1]
      const body = await req.json()
      const { name, price, available, ingredientId } = body

      const updateData: Record<string, unknown> = {}
      if (name !== undefined) updateData.name = name
      if (price !== undefined) updateData.price = Math.round(price * 100)
      if (available !== undefined) updateData.available = available
      if (ingredientId !== undefined) updateData.ingredientId = ingredientId

      const { data: modifier, error } = await supabase
        .from('Modifier')
        .update(updateData)
        .eq('id', modifierId)
        .select()
        .single()

      if (error) throw error

      return new Response(JSON.stringify(modifier), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // DELETE /menu/modifiers/:id - Delete modifier
    if (req.method === 'DELETE' && subPath[0] === 'modifiers' && subPath[1]) {
      const modifierId = subPath[1]

      const { error } = await supabase
        .from('Modifier')
        .delete()
        .eq('id', modifierId)

      if (error) throw error

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // DELETE /menu/modifier-groups/:id - Delete modifier group
    if (req.method === 'DELETE' && subPath[0] === 'modifier-groups' && subPath[1]) {
      const groupId = subPath[1]

      // Delete modifiers first
      await supabase.from('Modifier').delete().eq('modifierGroupId', groupId)

      const { error } = await supabase
        .from('ModifierGroup')
        .delete()
        .eq('id', groupId)

      if (error) throw error

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // PUT /menu/items/:id/ingredients - Set menu item ingredients (replace all)
    if (req.method === 'PUT' && subPath[0] === 'items' && subPath[1] && subPath[2] === 'ingredients') {
      const menuItemId = subPath[1]
      const body = await req.json()
      const { ingredients } = body // array of { id }

      // Delete existing associations
      await supabase
        .from('MenuItemIngredient')
        .delete()
        .eq('menuItemId', menuItemId)

      // Insert new associations
      if (ingredients && ingredients.length > 0) {
        const associations = ingredients.map((ing: { id: string }) => ({
          menuItemId,
          ingredientId: ing.id,
          isPrimary: false
        }))

        const { error } = await supabase
          .from('MenuItemIngredient')
          .insert(associations)

        if (error) throw error
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error:', error)
    // Return detailed error for debugging
    let errorMessage: string
    let errorDetails: unknown

    if (error instanceof Error) {
      errorMessage = error.message
      errorDetails = error.stack
    } else if (typeof error === 'object' && error !== null) {
      // Supabase errors are objects with message, code, details, hint
      errorMessage = JSON.stringify(error)
      errorDetails = error
    } else {
      errorMessage = String(error)
    }

    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: errorMessage,
      details: errorDetails
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
