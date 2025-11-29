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
    // Path: /menu, /menu/items/:id, /menu/categories, /menu/admin/categories
    const subPath = pathParts.slice(2) // Remove 'functions' and 'menu'

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
              modifiers:Modifier(*)
            )
          )
        `)
        .eq('active', true)
        .order('sortOrder', { ascending: true })

      if (error) throw error

      // Filter available items and modifiers
      const filteredCategories = categories?.map(cat => ({
        ...cat,
        items: cat.items
          ?.filter((item: { available: boolean }) => item.available)
          ?.sort((a: { sortOrder: number }, b: { sortOrder: number }) => a.sortOrder - b.sortOrder)
          ?.map((item: { modifierGroups: { modifiers: { available: boolean }[] }[] }) => ({
            ...item,
            modifierGroups: item.modifierGroups?.map(group => ({
              ...group,
              modifiers: group.modifiers?.filter((mod: { available: boolean }) => mod.available)
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

    // POST /menu/items - Create menu item
    if (req.method === 'POST' && subPath[0] === 'items') {
      const body = await req.json()
      const { name, description, price, categoryId, imageUrl, sortOrder } = body

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

      return new Response(JSON.stringify(item), {
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
