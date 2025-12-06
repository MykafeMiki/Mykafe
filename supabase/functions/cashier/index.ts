import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
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
    const cashierIndex = pathParts.indexOf('cashier')
    const subPath = cashierIndex >= 0 ? pathParts.slice(cashierIndex + 1) : []

    // GET /cashier/unpaid - Get all unpaid orders (SERVED but not paid)
    if (req.method === 'GET' && subPath[0] === 'unpaid') {
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
        .eq('status', 'SERVED')
        .eq('isPaid', false)
        .order('createdAt', { ascending: true })

      if (error) throw error

      return new Response(JSON.stringify(orders), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // GET /cashier/tables - Get tables with unpaid orders grouped
    if (req.method === 'GET' && subPath[0] === 'tables') {
      // Get all unpaid orders
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
        .in('status', ['PENDING', 'PREPARING', 'READY', 'SERVED'])
        .eq('isPaid', false)
        .order('createdAt', { ascending: true })

      if (error) throw error

      // Group by table
      const tableMap = new Map<string, {
        table: any,
        orders: any[],
        totalAmount: number,
        orderCount: number
      }>()

      for (const order of orders || []) {
        if (!order.table) continue // Skip orders without table (takeaway handled separately)

        const tableId = order.table.id
        if (!tableMap.has(tableId)) {
          tableMap.set(tableId, {
            table: order.table,
            orders: [],
            totalAmount: 0,
            orderCount: 0
          })
        }
        const tableData = tableMap.get(tableId)!
        tableData.orders.push(order)
        tableData.totalAmount += order.totalAmount || 0
        tableData.orderCount++
      }

      // Also get takeaway/counter orders (no table)
      const takeawayOrders = (orders || []).filter(o => !o.table || o.table.isCounter)

      return new Response(JSON.stringify({
        tables: Array.from(tableMap.values()).sort((a, b) => a.table.number - b.table.number),
        takeawayOrders
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // GET /cashier/table/:tableId - Get all unpaid orders for a specific table
    if (req.method === 'GET' && subPath[0] === 'table' && subPath[1]) {
      const tableId = subPath[1]

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
        .eq('tableId', tableId)
        .in('status', ['PENDING', 'PREPARING', 'READY', 'SERVED'])
        .eq('isPaid', false)
        .order('createdAt', { ascending: true })

      if (error) throw error

      const totalAmount = orders?.reduce((sum, o) => sum + (o.totalAmount || 0), 0) || 0

      return new Response(JSON.stringify({
        orders,
        totalAmount
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // PATCH /cashier/pay/:orderId - Mark single order as paid
    if (req.method === 'PATCH' && subPath[0] === 'pay' && subPath[1]) {
      const orderId = subPath[1]
      const body = await req.json()
      const { paymentMethod } = body // CASH or CARD

      const { data: order, error: updateError } = await supabase
        .from('Order')
        .update({
          isPaid: true,
          paidAt: new Date().toISOString(),
          paymentMethod: paymentMethod || 'CASH'
        })
        .eq('id', orderId)
        .select()
        .single()

      if (updateError) throw updateError

      return new Response(JSON.stringify(order), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // POST /cashier/pay-table/:tableId - Pay all orders for a table
    if (req.method === 'POST' && subPath[0] === 'pay-table' && subPath[1]) {
      const tableId = subPath[1]
      const body = await req.json()
      const { paymentMethod } = body

      // Update all unpaid orders for this table
      const { data: orders, error: updateError } = await supabase
        .from('Order')
        .update({
          isPaid: true,
          paidAt: new Date().toISOString(),
          paymentMethod: paymentMethod || 'CASH'
        })
        .eq('tableId', tableId)
        .eq('isPaid', false)
        .in('status', ['PENDING', 'PREPARING', 'READY', 'SERVED'])
        .select()

      if (updateError) throw updateError

      // Free up the table
      await supabase
        .from('Table')
        .update({ status: 'FREE' })
        .eq('id', tableId)

      // Close any active table sessions
      await supabase
        .from('TableSession')
        .update({ isActive: false, closedAt: new Date().toISOString() })
        .eq('hostTableId', tableId)
        .eq('isActive', true)

      const totalPaid = orders?.reduce((sum, o) => sum + (o.totalAmount || 0), 0) || 0

      return new Response(JSON.stringify({
        paidOrders: orders?.length || 0,
        totalPaid,
        orders
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // GET /cashier/history - Get paid orders for today
    if (req.method === 'GET' && subPath[0] === 'history') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const { data: orders, error } = await supabase
        .from('Order')
        .select(`
          *,
          table:Table(number, isCounter),
          items:OrderItem(
            quantity,
            menuItem:MenuItem(name, price)
          )
        `)
        .eq('isPaid', true)
        .gte('paidAt', today.toISOString())
        .order('paidAt', { ascending: false })

      if (error) throw error

      const totalCash = orders?.filter(o => o.paymentMethod === 'CASH')
        .reduce((sum, o) => sum + (o.totalAmount || 0), 0) || 0
      const totalCard = orders?.filter(o => o.paymentMethod === 'CARD')
        .reduce((sum, o) => sum + (o.totalAmount || 0), 0) || 0

      return new Response(JSON.stringify({
        orders,
        summary: {
          totalOrders: orders?.length || 0,
          totalCash,
          totalCard,
          grandTotal: totalCash + totalCard
        }
      }), {
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
