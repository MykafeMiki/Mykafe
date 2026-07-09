/**
 * OPTIMIZED: supabase/functions/menu/index.ts
 * 
 * Ottimizzazioni applicate:
 * 1. Query parallele invece di nested joins
 * 2. Cache in-memory per ingredienti out-of-stock (5 min TTL)
 * 3. Rimosso description matching (troppo costoso) - usa solo associazioni esplicite
 * 4. ETag basato su timestamp invece di SHA-256
 * 5. Cache-Control più aggressivo (5 min + stale-while-revalidate 30 min)
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
}

// In-memory cache for out-of-stock ingredients (Edge Functions are short-lived, but helps within request)
interface CacheEntry<T> {
  data: T
  timestamp: number
}

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
let outOfStockCache: CacheEntry<Map<string, { id: string; name: string; nameEn?: string; nameFr?: string; nameEs?: string; nameHe?: string }>> | null = null

// Last modified timestamp for ETag (updated when menu changes)
let lastMenuUpdate = Date.now()

Deno.serve(async (req) => {
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
    const menuIndex = pathParts.indexOf('menu')
    const subPath = menuIndex >= 0 ? pathParts.slice(menuIndex + 1) : []

    // GET /menu - OPTIMIZED: Get full menu
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

      // OPTIMIZATION 1: Parallel queries instead of deeply nested joins
      const [categoriesResult, outOfStockResult] = await Promise.all([
        // Main menu query - simplified, without ingredient joins
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
              )
            )
          `)
          .eq('active', true)
          .order('sortOrder', { ascending: true }),

        // Out-of-stock ingredients (cached)
        getOutOfStockIngredients(supabase)
      ])

      if (categoriesResult.error) throw categoriesResult.error

      const categories = categoriesResult.data || []
      const outOfStockMap = outOfStockResult

      // OPTIMIZATION 2: Get unavailable ingredient IDs for modifier filtering
      const outOfStockIds = new Set(outOfStockMap.keys())

      // OPTIMIZATION 3: Single pass filtering (no description matching)
      const filteredCategories = categories.map(category => ({
        ...category,
        items: (category.items || [])
          .filter((item: { available: boolean }) => item.available)
          .sort((a: { sortOrder: number }, b: { sortOrder: number }) => a.sortOrder - b.sortOrder)
          .map((item: {
            modifierGroups?: {
              modifiers?: {
                available: boolean
                ingredientId?: string
              }[]
            }[]
          }) => ({
            ...item,
            modifierGroups: item.modifierGroups?.map(group => ({
              ...group,
              modifiers: group.modifiers?.filter(mod => {
                if (!mod.available) return false
                if (mod.ingredientId && outOfStockIds.has(mod.ingredientId)) return false
                return true
              })
            }))
          }))
      }))

      const responseBody = JSON.stringify(filteredCategories)

      return new Response(responseBody, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          // OPTIMIZATION 4: Aggressive caching
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=1800',
          'ETag': etag,
          // Help CDNs
          'Vary': 'Accept-Encoding'
        }
      })
    }

    // ... rest of the endpoints remain the same ...

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Menu Error:', error)
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

// Helper: Get out-of-stock ingredients with caching
async function getOutOfStockIngredients(supabase: ReturnType<typeof createClient>) {
  // Check cache
  if (outOfStockCache && (Date.now() - outOfStockCache.timestamp) < CACHE_TTL) {
    return outOfStockCache.data
  }

  const { data: ingredients } = await supabase
    .from('Ingredient')
    .select('id, name, nameEn, nameFr, nameEs, nameHe')
    .eq('inStock', false)

  const map = new Map<string, { id: string; name: string; nameEn?: string; nameFr?: string; nameEs?: string; nameHe?: string }>()
  
  for (const ing of ingredients || []) {
    map.set(ing.id, ing)
  }

  // Update cache
  outOfStockCache = { data: map, timestamp: Date.now() }

  return map
}

// Call this when menu is updated (from admin endpoints)
export function invalidateMenuCache() {
  lastMenuUpdate = Date.now()
  outOfStockCache = null
}
