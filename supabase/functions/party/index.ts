import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
}

// Helper: genera codice festa a 6 caratteri
function generatePartyCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Escluso I, O, 0, 1 per evitare confusione
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
    const subPath = pathParts.slice(2) // Remove 'functions' and 'party'

    // POST /party - Create new party session
    if (req.method === 'POST' && subPath.length === 0) {
      const body = await req.json()
      const { tableId, name } = body

      // Genera codice unico
      let code = generatePartyCode()
      let attempts = 0

      // Verifica unicità del codice
      while (attempts < 10) {
        const { data: existing } = await supabase
          .from('PartySession')
          .select('id')
          .eq('code', code)
          .eq('isActive', true)
          .single()

        if (!existing) break
        code = generatePartyCode()
        attempts++
      }

      const { data: party, error } = await supabase
        .from('PartySession')
        .insert({
          code,
          name,
          hostTableId: tableId,
          isActive: true
        })
        .select()
        .single()

      if (error) throw error

      return new Response(JSON.stringify(party), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // GET /party/:code - Get party session by code
    if (req.method === 'GET' && subPath[0] && subPath[0] !== 'bill') {
      const code = subPath[0].toUpperCase()

      const { data: party, error } = await supabase
        .from('PartySession')
        .select(`
          *,
          orders:Order(
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
          )
        `)
        .eq('code', code)
        .eq('isActive', true)
        .single()

      if (error || !party) {
        return new Response(JSON.stringify({ error: 'Party not found or expired' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      return new Response(JSON.stringify(party), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // GET /party/:code/bill - Get party bill summary
    if (req.method === 'GET' && subPath[0] && subPath[1] === 'bill') {
      const code = subPath[0].toUpperCase()

      const { data: party, error } = await supabase
        .from('PartySession')
        .select(`
          *,
          orders:Order(
            id,
            subtotal,
            surcharge,
            totalAmount,
            status,
            customerName,
            table:Table(number)
          )
        `)
        .eq('code', code)
        .eq('isActive', true)
        .single()

      if (error || !party) {
        return new Response(JSON.stringify({ error: 'Party not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Calcola totali aggregati (escludi ordini cancellati)
      const activeOrders = party.orders?.filter(
        (o: { status: string }) => o.status !== 'CANCELLED'
      ) || []

      const totalAmount = activeOrders.reduce(
        (sum: number, o: { totalAmount: number }) => sum + o.totalAmount, 0
      )
      const subtotal = activeOrders.reduce(
        (sum: number, o: { subtotal: number }) => sum + o.subtotal, 0
      )
      const surcharge = activeOrders.reduce(
        (sum: number, o: { surcharge: number }) => sum + o.surcharge, 0
      )

      return new Response(JSON.stringify({
        partySession: party,
        orders: activeOrders,
        totalAmount,
        subtotal,
        surcharge,
        orderCount: activeOrders.length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // PATCH /party/:code/close - Close party session
    if (req.method === 'PATCH' && subPath[0] && subPath[1] === 'close') {
      const code = subPath[0].toUpperCase()

      const { data: party, error } = await supabase
        .from('PartySession')
        .update({
          isActive: false,
          closedAt: new Date().toISOString()
        })
        .eq('code', code)
        .eq('isActive', true)
        .select()
        .single()

      if (error) {
        return new Response(JSON.stringify({ error: 'Party not found or already closed' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      return new Response(JSON.stringify(party), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // POST /party/:code/join - Join existing party (validate code)
    if (req.method === 'POST' && subPath[0] && subPath[1] === 'join') {
      const code = subPath[0].toUpperCase()
      const body = await req.json()
      const { tableId } = body

      const { data: party, error } = await supabase
        .from('PartySession')
        .select('*')
        .eq('code', code)
        .eq('isActive', true)
        .single()

      if (error || !party) {
        return new Response(JSON.stringify({ error: 'Invalid party code' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Return party info for the joining table
      return new Response(JSON.stringify({
        ...party,
        joinedTableId: tableId
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
