import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

interface TopProduct {
  menuItemId: string
  name: string
  totalQuantity: number
  totalRevenue: number
}

interface HourlyData {
  hour: number
  orderCount: number
  revenue: number
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
    const reportsIndex = pathParts.indexOf('reports')
    const subPath = reportsIndex >= 0 ? pathParts.slice(reportsIndex + 1) : []

    // GET /reports/top-products?period=week|month
    if (req.method === 'GET' && subPath[0] === 'top-products') {
      const period = url.searchParams.get('period') || 'week'

      // Calculate date range
      const now = new Date()
      let startDate: Date

      if (period === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      } else {
        // Week: last 7 days
        startDate = new Date(now)
        startDate.setDate(startDate.getDate() - 7)
      }

      // Get orders with items in the period
      const { data: orders, error } = await supabase
        .from('Order')
        .select(`
          id,
          createdAt,
          totalAmount,
          items:OrderItem(
            quantity,
            menuItem:MenuItem(
              id,
              name
            )
          )
        `)
        .gte('createdAt', startDate.toISOString())
        .eq('status', 'SERVED') // Only count completed orders

      if (error) throw error

      // Aggregate products
      const productMap = new Map<string, TopProduct>()

      for (const order of orders || []) {
        for (const item of order.items || []) {
          if (!item.menuItem) continue

          const existing = productMap.get(item.menuItem.id)
          if (existing) {
            existing.totalQuantity += item.quantity
          } else {
            productMap.set(item.menuItem.id, {
              menuItemId: item.menuItem.id,
              name: item.menuItem.name,
              totalQuantity: item.quantity,
              totalRevenue: 0 // Will be calculated separately if needed
            })
          }
        }
      }

      // Sort by quantity and take top 10
      const topProducts = Array.from(productMap.values())
        .sort((a, b) => b.totalQuantity - a.totalQuantity)
        .slice(0, 10)

      return new Response(JSON.stringify({
        period,
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
        products: topProducts
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // GET /reports/peak-hours?period=week|month
    if (req.method === 'GET' && subPath[0] === 'peak-hours') {
      const period = url.searchParams.get('period') || 'week'

      // Calculate date range
      const now = new Date()
      let startDate: Date

      if (period === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      } else {
        startDate = new Date(now)
        startDate.setDate(startDate.getDate() - 7)
      }

      // Get orders in the period
      const { data: orders, error } = await supabase
        .from('Order')
        .select('createdAt, totalAmount')
        .gte('createdAt', startDate.toISOString())
        .in('status', ['SERVED', 'READY', 'PREPARING', 'PENDING'])

      if (error) throw error

      // Aggregate by hour
      const hourlyMap = new Map<number, HourlyData>()

      // Initialize all hours
      for (let h = 0; h < 24; h++) {
        hourlyMap.set(h, { hour: h, orderCount: 0, revenue: 0 })
      }

      for (const order of orders || []) {
        const orderDate = new Date(order.createdAt)
        const hour = orderDate.getHours()
        const data = hourlyMap.get(hour)!
        data.orderCount++
        data.revenue += order.totalAmount || 0
      }

      const hourlyData = Array.from(hourlyMap.values())
        .sort((a, b) => a.hour - b.hour)

      // Find peak hours (top 3)
      const peakHours = [...hourlyData]
        .sort((a, b) => b.orderCount - a.orderCount)
        .slice(0, 3)
        .map(h => h.hour)

      return new Response(JSON.stringify({
        period,
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
        hourlyData,
        peakHours,
        totalOrders: orders?.length || 0,
        totalRevenue: orders?.reduce((sum, o) => sum + (o.totalAmount || 0), 0) || 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // GET /reports/summary?period=week|month
    if (req.method === 'GET' && subPath[0] === 'summary') {
      const period = url.searchParams.get('period') || 'week'

      const now = new Date()
      let startDate: Date

      if (period === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      } else {
        startDate = new Date(now)
        startDate.setDate(startDate.getDate() - 7)
      }

      // Get orders in the period
      const { data: orders, error } = await supabase
        .from('Order')
        .select(`
          id,
          createdAt,
          totalAmount,
          status,
          orderType,
          items:OrderItem(quantity)
        `)
        .gte('createdAt', startDate.toISOString())

      if (error) throw error

      const completedOrders = orders?.filter(o => o.status === 'SERVED') || []
      const totalItems = orders?.reduce((sum, o) =>
        sum + (o.items?.reduce((s, i) => s + i.quantity, 0) || 0), 0) || 0

      // Orders by type
      const ordersByType = {
        DINE_IN: orders?.filter(o => o.orderType === 'DINE_IN').length || 0,
        TAKEAWAY: orders?.filter(o => o.orderType === 'TAKEAWAY').length || 0,
        COUNTER: orders?.filter(o => o.orderType === 'COUNTER').length || 0
      }

      return new Response(JSON.stringify({
        period,
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
        totalOrders: orders?.length || 0,
        completedOrders: completedOrders.length,
        totalRevenue: completedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
        totalItems,
        ordersByType,
        averageOrderValue: completedOrders.length > 0
          ? completedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0) / completedOrders.length
          : 0
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
