import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { CreateOrderSchema, UpdateOrderStatusSchema, validateRequest } from "../_shared/validation.ts"
import { applyCardSurcharge } from "../_shared/pricing.ts"

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

      // Validate input
      const validation = validateRequest(CreateOrderSchema, body)
      if (!validation.success) {
        return new Response(JSON.stringify({ error: 'Validation error', details: validation.error }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const { tableId, items, notes, orderType, paymentMethod, customerName, customerPhone, partyCode, tableSessionId } = validation.data

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

      // === VALIDATION: Table access for sessions ===

      // Validate table access when tableSessionId is provided
      if (validTableSessionId) {
        // Get the session details
        const { data: session, error: sessionError } = await supabase
          .from('TableSession')
          .select('id, hostTableId, linkedTables, isActive')
          .eq('id', validTableSessionId)
          .single()

        if (sessionError || !session) {
          return new Response(JSON.stringify({ error: 'Invalid table session' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        if (!session.isActive) {
          return new Response(JSON.stringify({ error: 'Table session has expired' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        // Get the table number for the order's tableId
        const { data: orderTable } = await supabase
          .from('Table')
          .select('id, number')
          .eq('id', tableId)
          .single()

        if (!orderTable) {
          return new Response(JSON.stringify({ error: 'Table not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        // Check if this table is part of the session
        const isHostTable = session.hostTableId === tableId
        const isLinkedTable = (session.linkedTables || []).includes(orderTable.number)

        if (!isHostTable && !isLinkedTable) {
          return new Response(JSON.stringify({
            error: 'This table is not part of the specified session',
            code: 'TABLE_NOT_IN_SESSION'
          }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
      }

      // Additional validation: Check if table is trying to order without session when it should use one
      if (!validTableSessionId) {
        // Get the table info
        const { data: orderTable } = await supabase
          .from('Table')
          .select('id, number')
          .eq('id', tableId)
          .single()

        if (orderTable) {
          // Check if any active session includes this table
          const { data: activeSessions } = await supabase
            .from('TableSession')
            .select('id, linkedTables, hostTableId')
            .eq('isActive', true)

          const belongsToSession = activeSessions?.find(session => {
            const isHost = session.hostTableId === tableId
            const isLinked = (session.linkedTables || []).includes(orderTable.number)
            return isHost || isLinked
          })

          if (belongsToSession) {
            // Table is part of a session but didn't provide sessionId
            return new Response(JSON.stringify({
              error: 'This table is part of an active group session. Please use the session to order.',
              code: 'TABLE_IN_SESSION',
              sessionId: belongsToSession.id
            }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
          }
        }
      }

      // === END VALIDATION ===

      const isCard = paymentMethod === 'CARD'
      // CARD_MULTIPLIER rimosso – ora gestito da _shared/pricing.ts

      // Calculate totals - OPTIMIZED: Batch fetch instead of N+1 queries
      let subtotal = 0
      let totalAmount = 0

      // Batch fetch all menu items in ONE query
      const menuItemIds = [...new Set(items.map((item: { menuItemId: string }) => item.menuItemId))]
      const { data: menuItems } = await supabase
        .from('MenuItem')
        .select('id, price')
        .in('id', menuItemIds)

      const menuItemMap = new Map(menuItems?.map(mi => [mi.id, mi]) || [])

      // Batch fetch all modifiers in ONE query (if any)
      const allModifierIds = items.flatMap((item: { modifierIds?: string[] }) => item.modifierIds || [])
      let modifierMap = new Map<string, { price: number }>()

      if (allModifierIds.length > 0) {
        const { data: modifiers } = await supabase
          .from('Modifier')
          .select('id, price')
          .in('id', [...new Set(allModifierIds)])

        modifierMap = new Map(modifiers?.map(m => [m.id, m]) || [])
      }

      // Now calculate totals using the cached data (no more queries)
      for (const item of items) {
        const menuItem = menuItemMap.get(item.menuItemId)
        if (!menuItem) continue

        let itemBasePrice = menuItem.price * item.quantity

        // Add modifier prices from cache
        if (item.modifierIds && item.modifierIds.length > 0) {
          for (const modId of item.modifierIds) {
            const modifier = modifierMap.get(modId)
            if (modifier) {
              itemBasePrice += modifier.price * item.quantity
            }
          }
        }

        subtotal += itemBasePrice

        // Usa la utility condivisa per il sovrapprezzo carta
        totalAmount += applyCardSurcharge(itemBasePrice, isCard)
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

      // Validate input
      const validation = validateRequest(UpdateOrderStatusSchema, body)
      if (!validation.success) {
        return new Response(JSON.stringify({ error: 'Validation error', details: validation.error }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const { status } = validation.data

      // Get current order to know the tableId
      const { data: currentOrder } = await supabase
        .from('Order')
        .select('tableId, orderType')
        .eq('id', orderId)
        .single()

      const { error: updateError } = await supabase
        .from('Order')
        .update({ status })
        .eq('id', orderId)

      if (updateError) throw updateError

      // If order is served or cancelled, check if table should be freed
      // NOTE: valid statuses are PENDING, PREPARING, READY, SERVED, CANCELLED (no COMPLETED/PAID)
      if (currentOrder?.tableId && ['SERVED', 'CANCELLED'].includes(status)) {
        // Count remaining active orders for this table
        const { count: activeOrdersCount } = await supabase
          .from('Order')
          .select('*', { count: 'exact', head: true })
          .eq('tableId', currentOrder.tableId)
          .in('status', ['PENDING', 'PREPARING', 'READY'])

        // If no more active orders, free the table
        if ((activeOrdersCount || 0) === 0) {
          await supabase
            .from('Table')
            .update({ status: 'AVAILABLE' })
            .eq('id', currentOrder.tableId)
          console.log(`Table ${currentOrder.tableId} freed - no more active orders`)
        }
      }

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
