import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
}

function generateSessionCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
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
    const sessionsIndex = pathParts.indexOf('table-sessions')
    const subPath = sessionsIndex >= 0 ? pathParts.slice(sessionsIndex + 1) : []

    // POST /table-sessions - Create a new table session (merge tables)
    if (req.method === 'POST' && subPath.length === 0) {
      const body = await req.json()
      const { hostTableId, linkedTableNumbers } = body

      if (!hostTableId || !linkedTableNumbers || !Array.isArray(linkedTableNumbers)) {
        return new Response(JSON.stringify({ error: 'hostTableId and linkedTableNumbers are required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Generate unique code
      let code = generateSessionCode()
      let attempts = 0
      while (attempts < 10) {
        const { data: existing } = await supabase
          .from('TableSession')
          .select('id')
          .eq('code', code)
          .single()

        if (!existing) break
        code = generateSessionCode()
        attempts++
      }

      // Get host table number
      const { data: hostTable } = await supabase
        .from('Table')
        .select('number')
        .eq('id', hostTableId)
        .single()

      // All linked table numbers including the host
      const allTables = [hostTable?.number, ...linkedTableNumbers].filter(Boolean)

      // Create the session
      const { data: session, error } = await supabase
        .from('TableSession')
        .insert({
          code,
          hostTableId,
          linkedTables: linkedTableNumbers,
          isActive: true
        })
        .select()
        .single()

      if (error) throw error

      return new Response(JSON.stringify({
        ...session,
        allTableNumbers: allTables
      }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // GET /table-sessions/by-table/:tableNumber - Find active session for a table number
    if (req.method === 'GET' && subPath[0] === 'by-table' && subPath[1]) {
      const tableNumber = parseInt(subPath[1])

      // First check if this table is the host of an active session
      const { data: hostTable } = await supabase
        .from('Table')
        .select('id')
        .eq('number', tableNumber)
        .single()

      if (hostTable) {
        const { data: hostSession } = await supabase
          .from('TableSession')
          .select('*')
          .eq('hostTableId', hostTable.id)
          .eq('isActive', true)
          .single()

        if (hostSession) {
          return new Response(JSON.stringify(hostSession), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
      }

      // Check if this table is linked to an active session
      const { data: sessions } = await supabase
        .from('TableSession')
        .select('*')
        .eq('isActive', true)
        .contains('linkedTables', [tableNumber])

      if (sessions && sessions.length > 0) {
        return new Response(JSON.stringify(sessions[0]), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // No active session found
      return new Response(JSON.stringify(null), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // GET /table-sessions/:code - Get session by code
    if (req.method === 'GET' && subPath[0] && subPath[0] !== 'by-table') {
      const code = subPath[0]

      const { data: session, error } = await supabase
        .from('TableSession')
        .select(`
          *,
          orders:Order(
            *,
            items:OrderItem(
              *,
              menuItem:MenuItem(name, price),
              modifiers:OrderItemModifier(
                modifier:Modifier(name, price)
              )
            )
          )
        `)
        .eq('code', code)
        .single()

      if (error || !session) {
        return new Response(JSON.stringify({ error: 'Session not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      return new Response(JSON.stringify(session), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // PATCH /table-sessions/:code/close - Close the session
    if (req.method === 'PATCH' && subPath[0] && subPath[1] === 'close') {
      const code = subPath[0]

      const { data: session, error } = await supabase
        .from('TableSession')
        .update({
          isActive: false,
          closedAt: new Date().toISOString()
        })
        .eq('code', code)
        .select()
        .single()

      if (error) throw error

      return new Response(JSON.stringify(session), {
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
