/**
 * PATCH: Server-side validation to block orders from unauthorized tables
 * File: supabase/functions/orders/index.ts
 * 
 * Aggiungere questo blocco di validazione PRIMA della creazione dell'ordine
 * (dopo la validazione del partyCode e tableSessionId)
 */

// === ADD THIS VALIDATION BLOCK ===

// Validate table access when tableSessionId is provided
if (tableSessionId) {
  // Get the session
  const { data: session, error: sessionError } = await supabase
    .from('TableSession')
    .select('id, hostTableId, linkedTables, isActive')
    .eq('id', tableSessionId)
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
      status: 403, // Forbidden
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}

// Additional validation: Check if table is trying to join an existing session it's not part of
if (!tableSessionId) {
  // Check if this table is linked to an active session it should be using
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
      // This could be someone trying to bypass the group
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

// === END VALIDATION BLOCK ===
