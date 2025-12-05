import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
}

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
    const subPath = pathParts.slice(2) // Remove 'functions' and 'ingredients'

    // GET /ingredients - Get all ingredients (opzionale ?menuType=CLASSIC|SUSHI)
    if (req.method === 'GET' && subPath.length === 0) {
      const menuType = url.searchParams.get('menuType')

      let query = supabase
        .from('Ingredient')
        .select(`
          *,
          menuItems:MenuItemIngredient(
            id,
            isPrimary,
            menuItem:MenuItem(id, name)
          ),
          modifiers:Modifier(id, name)
        `)
        .order('name', { ascending: true })

      if (menuType) {
        query = query.eq('menuType', menuType)
      }

      const { data: ingredients, error } = await query

      if (error) throw error

      return new Response(JSON.stringify(ingredients), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // POST /ingredients - Create ingredient
    if (req.method === 'POST' && subPath.length === 0) {
      const body = await req.json()
      const { name, nameEn, nameFr, nameEs, nameHe, menuType } = body

      const { data: ingredient, error } = await supabase
        .from('Ingredient')
        .insert({
          name,
          nameEn: nameEn || null,
          nameFr: nameFr || null,
          nameEs: nameEs || null,
          nameHe: nameHe || null,
          inStock: true,
          menuType: menuType || 'CLASSIC'
        })
        .select()
        .single()

      if (error) throw error

      return new Response(JSON.stringify(ingredient), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // PATCH /ingredients/:id - Update ingredient (principalmente per inStock)
    if (req.method === 'PATCH' && subPath[0]) {
      const ingredientId = subPath[0]
      const body = await req.json()
      const { name, nameEn, nameFr, nameEs, nameHe, inStock, menuType } = body

      const updateData: Record<string, unknown> = {}
      if (name !== undefined) updateData.name = name
      if (nameEn !== undefined) updateData.nameEn = nameEn
      if (nameFr !== undefined) updateData.nameFr = nameFr
      if (nameEs !== undefined) updateData.nameEs = nameEs
      if (nameHe !== undefined) updateData.nameHe = nameHe
      if (inStock !== undefined) updateData.inStock = inStock
      if (menuType !== undefined) updateData.menuType = menuType

      // Update ingredient
      const { data: ingredient, error } = await supabase
        .from('Ingredient')
        .update(updateData)
        .eq('id', ingredientId)
        .select()
        .single()

      if (error) throw error

      // Se l'ingrediente è stato marcato come esaurito, aggiorna menu items e modifiers
      if (inStock === false) {
        // 1. Disabilita tutti i MenuItem dove questo ingrediente è PRIMARY
        const { data: primaryItems } = await supabase
          .from('MenuItemIngredient')
          .select('menuItemId')
          .eq('ingredientId', ingredientId)
          .eq('isPrimary', true)

        if (primaryItems && primaryItems.length > 0) {
          const menuItemIds = primaryItems.map(item => item.menuItemId)
          await supabase
            .from('MenuItem')
            .update({ available: false })
            .in('id', menuItemIds)
        }

        // 2. Disabilita tutti i Modifier collegati a questo ingrediente
        await supabase
          .from('Modifier')
          .update({ available: false })
          .eq('ingredientId', ingredientId)
      } else if (inStock === true) {
        // Se l'ingrediente torna disponibile, riabilita i modifier collegati
        await supabase
          .from('Modifier')
          .update({ available: true })
          .eq('ingredientId', ingredientId)

        // Per i MenuItem, dobbiamo verificare che TUTTI gli ingredienti primari siano disponibili
        // prima di riabilitare il piatto
        const { data: affectedItems } = await supabase
          .from('MenuItemIngredient')
          .select('menuItemId')
          .eq('ingredientId', ingredientId)
          .eq('isPrimary', true)

        if (affectedItems) {
          for (const item of affectedItems) {
            // Verifica se tutti gli ingredienti primari sono in stock
            const { data: primaryIngredients } = await supabase
              .from('MenuItemIngredient')
              .select(`
                ingredientId,
                ingredient:Ingredient(inStock)
              `)
              .eq('menuItemId', item.menuItemId)
              .eq('isPrimary', true)

            const allPrimaryInStock = primaryIngredients?.every(
              (pi: { ingredient: { inStock: boolean } }) => pi.ingredient?.inStock
            )

            if (allPrimaryInStock) {
              await supabase
                .from('MenuItem')
                .update({ available: true })
                .eq('id', item.menuItemId)
            }
          }
        }
      }

      return new Response(JSON.stringify(ingredient), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // POST /ingredients/:id/menu-items - Associate ingredient with menu item
    if (req.method === 'POST' && subPath[0] && subPath[1] === 'menu-items') {
      const ingredientId = subPath[0]
      const body = await req.json()
      const { menuItemId, isPrimary } = body

      const { data: association, error } = await supabase
        .from('MenuItemIngredient')
        .insert({
          ingredientId,
          menuItemId,
          isPrimary: isPrimary || false
        })
        .select()
        .single()

      if (error) throw error

      return new Response(JSON.stringify(association), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // DELETE /ingredients/:ingredientId/menu-items/:menuItemId - Remove association
    if (req.method === 'DELETE' && subPath[0] && subPath[1] === 'menu-items' && subPath[2]) {
      const ingredientId = subPath[0]
      const menuItemId = subPath[2]

      const { error } = await supabase
        .from('MenuItemIngredient')
        .delete()
        .eq('ingredientId', ingredientId)
        .eq('menuItemId', menuItemId)

      if (error) throw error

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // POST /ingredients/:id/modifiers - Associate ingredient with modifier
    if (req.method === 'POST' && subPath[0] && subPath[1] === 'modifiers') {
      const ingredientId = subPath[0]
      const body = await req.json()
      const { modifierId } = body

      const { data: modifier, error } = await supabase
        .from('Modifier')
        .update({ ingredientId })
        .eq('id', modifierId)
        .select()
        .single()

      if (error) throw error

      return new Response(JSON.stringify(modifier), {
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
