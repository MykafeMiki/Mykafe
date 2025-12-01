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
    const subPath = pathParts.slice(2) // Remove 'functions' and 'tables'

    // GET /tables - Get all tables
    if (req.method === 'GET' && subPath.length === 0) {
      const { data: tables, error } = await supabase
        .from('Table')
        .select('*')
        .order('number', { ascending: true })

      if (error) throw error

      return new Response(JSON.stringify(tables), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // GET /tables/qr/:qrCode - Get table by QR code
    if (req.method === 'GET' && subPath[0] === 'qr' && subPath[1]) {
      const qrCode = subPath[1]
      const { data: table, error } = await supabase
        .from('Table')
        .select('*')
        .eq('qrCode', qrCode)
        .single()

      if (error || !table) {
        return new Response(JSON.stringify({ error: 'Table not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      return new Response(JSON.stringify(table), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // GET /tables/:id - Get table by ID with active orders
    if (req.method === 'GET' && subPath[0] && subPath[0] !== 'qr') {
      const tableId = subPath[0]
      const { data: table, error } = await supabase
        .from('Table')
        .select(`
          *,
          orders:Order(*)
        `)
        .eq('id', tableId)
        .single()

      if (error || !table) {
        return new Response(JSON.stringify({ error: 'Table not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Filter only active orders
      const activeOrders = table.orders?.filter((order: { status: string }) =>
        ['PENDING', 'PREPARING', 'READY'].includes(order.status)
      ).sort((a: { createdAt: string }, b: { createdAt: string }) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )

      return new Response(JSON.stringify({ ...table, orders: activeOrders }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // POST /tables - Create table
    if (req.method === 'POST' && subPath.length === 0) {
      const body = await req.json()
      const { number, seats, isCounter } = body

      // Generate unique QR code
      const prefix = isCounter ? 'counter' : 'table'
      const qrCode = `${prefix}-${number}-${Date.now()}`

      const { data: table, error } = await supabase
        .from('Table')
        .insert({
          number,
          seats: seats || 4,
          qrCode,
          isCounter: isCounter || false
        })
        .select()
        .single()

      if (error) throw error

      return new Response(JSON.stringify(table), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // PATCH /tables/:id/status - Update table status
    if (req.method === 'PATCH' && subPath[0] && subPath[1] === 'status') {
      const tableId = subPath[0]
      const body = await req.json()
      const { status } = body

      const { data: table, error } = await supabase
        .from('Table')
        .update({ status })
        .eq('id', tableId)
        .select()
        .single()

      if (error) throw error

      return new Response(JSON.stringify(table), {
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
