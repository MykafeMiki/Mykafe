import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
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

    // GET /menu - Get full menu with categories and items
    if (req.method === 'GET' && subPath.length === 0) {
      const { data: categories, error } = await supabase
        .from('Category')
        .select(`
          *,
          items:MenuItem(
            *,
            modifierGroups:ModifierGroup(
              *,
              modifiers:Modifier(
                *,
                ingredient:Ingredient(inStock)
              )
            ),
            ingredients:MenuItemIngredient(
              isPrimary,
              ingredient:Ingredient(inStock)
            )
          )
        `)
        .eq('active', true)
        .order('sortOrder', { ascending: true })

      if (error) throw error

      // Filter items based on ingredient availability
      const filteredCategories = categories?.map(cat => ({
        ...cat,
        items: cat.items
          ?.filter((item: {
            available: boolean,
            ingredients?: { isPrimary: boolean, ingredient: { inStock: boolean } }[]
          }) => {
            // Check if item is marked as available
            if (!item.available) return false

            // Check if any PRIMARY ingredient is out of stock
            const primaryOutOfStock = item.ingredients?.some(
              ing => ing.isPrimary && !ing.ingredient?.inStock
            )

            return !primaryOutOfStock
          })
          ?.sort((a: { sortOrder: number }, b: { sortOrder: number }) => a.sortOrder - b.sortOrder)
          ?.map((item: {
            modifierGroups: { modifiers: { available: boolean, ingredient?: { inStock: boolean } }[] }[],
            ingredients?: unknown[]
          }) => ({
            ...item,
            // Remove ingredients from response (internal use only)
            ingredients: undefined,
            modifierGroups: item.modifierGroups?.map(group => ({
              ...group,
              modifiers: group.modifiers?.filter((mod: {
                available: boolean,
                ingredient?: { inStock: boolean }
              }) => {
                // Filter out unavailable modifiers or those with out-of-stock ingredients
                if (!mod.available) return false
                if (mod.ingredient && !mod.ingredient.inStock) return false
                return true
              }).map((mod: { ingredient?: unknown }) => {
                // Remove ingredient details from response
                const { ingredient, ...rest } = mod
                return rest
              })
            }))
          }))
      }))

      return new Response(JSON.stringify(filteredCategories), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // GET /menu/items/:id - Get single menu item
    if (req.method === 'GET' && subPath[0] === 'items' && subPath[1]) {
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

      const { data: category, error } = await supabase
        .from('Category')
        .insert({ name, description, sortOrder: sortOrder || 0 })
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

      // Crea il menu item
      const { data: item, error } = await supabase
        .from('MenuItem')
        .insert({
          name,
          description,
          price: Math.round(price * 100), // Store in cents
          categoryId,
          imageUrl,
          sortOrder: sortOrder || 0
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

      // Associa ingredienti se forniti (ingredientIds: [{ id, isPrimary }])
      if (ingredientIds && ingredientIds.length > 0) {
        const ingredientAssociations = ingredientIds.map((ing: { id: string, isPrimary?: boolean }) => ({
          menuItemId: item.id,
          ingredientId: ing.id,
          isPrimary: ing.isPrimary || false
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
      const { name, description, price, imageUrl, sortOrder, available } = body

      const updateData: Record<string, unknown> = {}
      if (name !== undefined) updateData.name = name
      if (description !== undefined) updateData.description = description
      if (price !== undefined) updateData.price = Math.round(price * 100)
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

    // GET /menu/items/:id/ingredients - Get menu item ingredients
    if (req.method === 'GET' && subPath[0] === 'items' && subPath[1] && subPath[2] === 'ingredients') {
      const menuItemId = subPath[1]

      const { data: ingredients, error } = await supabase
        .from('MenuItemIngredient')
        .select('ingredientId, isPrimary')
        .eq('menuItemId', menuItemId)

      if (error) throw error

      return new Response(JSON.stringify(ingredients || []), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // PUT /menu/items/:id/ingredients - Set menu item ingredients (replace all)
    if (req.method === 'PUT' && subPath[0] === 'items' && subPath[1] && subPath[2] === 'ingredients') {
      const menuItemId = subPath[1]
      const body = await req.json()
      const { ingredientIds } = body // array of ingredient IDs

      // Delete existing associations
      await supabase
        .from('MenuItemIngredient')
        .delete()
        .eq('menuItemId', menuItemId)

      // Insert new associations
      if (ingredientIds && ingredientIds.length > 0) {
        const associations = ingredientIds.map((ingredientId: string) => ({
          menuItemId,
          ingredientId,
          isPrimary: false // Default to non-primary
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
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
