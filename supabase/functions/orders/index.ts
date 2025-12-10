import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Generate cuid-like ID
function generateId(): string {
  const timestamp = Date.now().toString(36)
  const randomStr = Math.random().toString(36).substring(2, 15)
  return `c${timestamp}${randomStr}`
}

// Check if text is likely already in Italian (skip translation)
function isLikelyItalian(text: string): boolean {
  if (!text || text.length < 3) return true // Too short to translate

  const lowerText = text.toLowerCase()

  // Common Italian words - if found, assume Italian
  const italianIndicators = [
    'senza', 'con ', 'poco', 'molto', 'ben ', 'cotto', 'crudo', 'freddo', 'caldo',
    'più', 'meno', 'solo', 'doppio', 'niente', 'tutto', 'metà',
    'grande', 'piccolo', 'leggero', 'pesante', 'dolce', 'salato', 'amaro',
    'per favore', 'grazie', 'prego', 'vorrei', 'voglio', 'anche', 'ancora',
    'allergi', 'intolleran', 'glutine', 'lattosio', 'vegetarian', 'vegan'
  ]

  for (const word of italianIndicators) {
    if (lowerText.includes(word)) {
      return true
    }
  }

  return false
}

// Translate text to Italian using MyMemory API
async function translateToItalian(text: string): Promise<string> {
  if (!text || text.trim().length === 0) return text
  if (isLikelyItalian(text)) return text // Skip if already Italian

  try {
    const response = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=autodetect|it`
    )

    if (!response.ok) {
      console.warn('Translation API error:', response.status)
      return text
    }

    const data = await response.json()

    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      const translated = data.responseData.translatedText
      console.log(`Translated "${text}" -> "${translated}"`)
      return translated
    }

    return text
  } catch (error) {
    console.warn('Translation failed:', error)
    return text
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
}

// Helper: arrotonda ai 10 centesimi per eccesso
function roundUpToTenCents(amount: number): number {
  return Math.ceil(amount / 10) * 10
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
    // Path: /functions/v1/orders/... -> find 'orders' and take everything after
    const ordersIndex = pathParts.indexOf('orders')
    const subPath = ordersIndex >= 0 ? pathParts.slice(ordersIndex + 1) : []

    // GET /orders - Get all orders (with optional status filter)
    if (req.method === 'GET' && subPath.length === 0) {
      const status = url.searchParams.get('status')

      let query = supabase
        .from('Order')
        .select(`
          *,
          table:Table(*),
          items:OrderItem(
            *,
            menuItem:MenuItem(*),
            modifiers:OrderItemModifier(
              *,
              modifier:Modifier(*)
            )
          )
        `)
        .order('createdAt', { ascending: false })

      if (status) {
        query = query.eq('status', status)
      }

      const { data: orders, error } = await query

      if (error) throw error

      return new Response(JSON.stringify(orders), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // GET /orders/active - Get active orders for kitchen
    if (req.method === 'GET' && subPath[0] === 'active') {
      const { data: orders, error } = await supabase
        .from('Order')
        .select(`
          *,
          table:Table(*),
          items:OrderItem(
            *,
            menuItem:MenuItem(*),
            modifiers:OrderItemModifier(
              *,
              modifier:Modifier(*)
            )
          )
        `)
        .in('status', ['PENDING', 'PREPARING'])
        .order('createdAt', { ascending: true })

      if (error) throw error

      return new Response(JSON.stringify(orders), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // POST /orders - Create new order
    if (req.method === 'POST' && subPath.length === 0) {
      const body = await req.json()
      console.log('Creating order with body:', JSON.stringify(body))
      const { tableId, items, notes, orderType, paymentMethod, customerName, customerPhone, partyCode, tableSessionId } = body

      // Verifica se il tavolo è un banco (richiede customerName)
      const { data: table } = await supabase
        .from('Table')
        .select('isCounter')
        .eq('id', tableId)
        .single()

      if (table?.isCounter && !customerName) {
        return new Response(JSON.stringify({ error: 'Customer name required for counter orders' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Verifica partyCode se fornito (deprecato)
      let partySessionId: string | null = null
      if (partyCode) {
        const { data: party } = await supabase
          .from('PartySession')
          .select('id')
          .eq('code', partyCode.toUpperCase())
          .eq('isActive', true)
          .single()

        if (!party) {
          return new Response(JSON.stringify({ error: 'Invalid party code' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
        partySessionId = party.id
      }

      // Verifica tableSessionId se fornito (tavoli uniti)
      let validTableSessionId: string | null = tableSessionId || null
      if (tableSessionId) {
        const { data: session } = await supabase
          .from('TableSession')
          .select('id')
          .eq('id', tableSessionId)
          .eq('isActive', true)
          .single()

        if (!session) {
          validTableSessionId = null // Session expired or invalid, ignore
        }
      }

      const isCard = paymentMethod === 'CARD'
      const CARD_MULTIPLIER = 1.03

      // Calculate totals
      let subtotal = 0
      let totalAmount = 0

      for (const item of items) {
        const { data: menuItem } = await supabase
          .from('MenuItem')
          .select('price')
          .eq('id', item.menuItemId)
          .single()

        if (!menuItem) continue

        let itemBasePrice = menuItem.price * item.quantity

        // Add modifier prices
        if (item.modifierIds && item.modifierIds.length > 0) {
          const { data: modifiers } = await supabase
            .from('Modifier')
            .select('price')
            .in('id', item.modifierIds)

          for (const mod of modifiers || []) {
            itemBasePrice += mod.price * item.quantity
          }
        }

        subtotal += itemBasePrice

        if (isCard) {
          totalAmount += roundUpToTenCents(Math.round(itemBasePrice * CARD_MULTIPLIER))
        } else {
          totalAmount += itemBasePrice
        }
      }

      const surcharge = totalAmount - subtotal

      // Translate order notes to Italian for kitchen
      const translatedOrderNotes = notes ? await translateToItalian(notes) : null

      // Translate item notes to Italian
      for (const item of items) {
        if (item.notes) {
          item.notes = await translateToItalian(item.notes)
        }
      }

      // Create order - build insert object dynamically to avoid missing column errors
      const now = new Date().toISOString()
      const orderData: Record<string, unknown> = {
        id: generateId(),
        tableId,
        notes: translatedOrderNotes,
        orderType: orderType || 'DINE_IN',
        paymentMethod,
        customerName,
        customerPhone,
        subtotal,
        surcharge,
        totalAmount,
        status: 'PENDING',
        createdAt: now,
        updatedAt: now,
      }

      // Only add optional foreign keys if they have values
      if (partySessionId) orderData.partySessionId = partySessionId
      if (validTableSessionId) orderData.tableSessionId = validTableSessionId

      console.log('Creating order with data:', orderData)
      const { data: order, error: orderError } = await supabase
        .from('Order')
        .insert(orderData)
        .select()
        .single()

      if (orderError) {
        console.error('Order creation error:', orderError)
        throw orderError
      }
      console.log('Order created:', order.id)

      // Create order items
      for (const item of items) {
        const orderItemId = generateId()
        const { data: orderItem, error: itemError } = await supabase
          .from('OrderItem')
          .insert({
            id: orderItemId,
            orderId: order.id,
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            notes: item.notes,
            consumeMode: item.consumeMode || 'DINE_IN',
            createdAt: now
          })
          .select()
          .single()

        if (itemError) {
          console.error('OrderItem creation error:', itemError)
          throw itemError
        }

        // Create order item modifiers
        if (item.modifierIds && item.modifierIds.length > 0) {
          const modifierInserts = item.modifierIds.map((modId: string) => ({
            id: generateId(),
            orderItemId: orderItem.id,
            modifierId: modId
          }))

          const { error: modError } = await supabase
            .from('OrderItemModifier')
            .insert(modifierInserts)

          if (modError) {
            console.error('OrderItemModifier creation error:', modError)
            throw modError
          }
        }
      }

      // Update table status for dine-in orders
      if (orderType !== 'TAKEAWAY' && tableId) {
        await supabase
          .from('Table')
          .update({ status: 'OCCUPIED' })
          .eq('id', tableId)
      }

      // Fetch complete order with relations
      const { data: completeOrder, error: fetchError } = await supabase
        .from('Order')
        .select(`
          *,
          table:Table(*),
          items:OrderItem(
            *,
            menuItem:MenuItem(*),
            modifiers:OrderItemModifier(
              *,
              modifier:Modifier(*)
            )
          )
        `)
        .eq('id', order.id)
        .single()

      if (fetchError) throw fetchError

      // Calculate estimated wait time based on orders in queue
      const { count: pendingCount } = await supabase
        .from('Order')
        .select('*', { count: 'exact', head: true })
        .in('status', ['PENDING', 'PREPARING'])
        .lt('createdAt', order.createdAt)

      // Base time per order: 5 minutes, minimum 5 minutes, maximum 30 minutes
      const BASE_TIME_PER_ORDER = 5
      const MIN_WAIT_TIME = 5
      const MAX_WAIT_TIME = 30
      const estimatedWaitMinutes = Math.min(
        MAX_WAIT_TIME,
        Math.max(MIN_WAIT_TIME, (pendingCount || 0) * BASE_TIME_PER_ORDER + BASE_TIME_PER_ORDER)
      )

      return new Response(JSON.stringify({
        ...completeOrder,
        estimatedWaitMinutes,
        queuePosition: (pendingCount || 0) + 1
      }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // PATCH /orders/:id/status - Update order status
    if (req.method === 'PATCH' && subPath[0] && subPath[1] === 'status') {
      const orderId = subPath[0]
      const body = await req.json()
      const { status } = body

      const { error: updateError } = await supabase
        .from('Order')
        .update({ status })
        .eq('id', orderId)

      if (updateError) throw updateError

      // Fetch updated order
      const { data: order, error: fetchError } = await supabase
        .from('Order')
        .select(`
          *,
          table:Table(*),
          items:OrderItem(
            *,
            menuItem:MenuItem(*),
            modifiers:OrderItemModifier(
              *,
              modifier:Modifier(*)
            )
          )
        `)
        .eq('id', orderId)
        .single()

      if (fetchError) throw fetchError

      return new Response(JSON.stringify(order), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error:', error)
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error)
    return new Response(JSON.stringify({ error: 'Internal server error', details: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
