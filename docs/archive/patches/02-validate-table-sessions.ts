/**
 * PATCH: Validate table numbers and check for existing sessions
 * File: supabase/functions/table-sessions/index.ts
 * 
 * Sostituire il blocco POST con questo codice migliorato
 */

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

  // Validate: linkedTableNumbers must be positive integers
  const validNumbers = linkedTableNumbers.every(n => 
    Number.isInteger(n) && n > 0
  )
  if (!validNumbers || linkedTableNumbers.length === 0) {
    return new Response(JSON.stringify({ 
      error: 'linkedTableNumbers must be an array of positive integers' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // Get host table
  const { data: hostTable, error: hostError } = await supabase
    .from('Table')
    .select('id, number')
    .eq('id', hostTableId)
    .single()

  if (hostError || !hostTable) {
    return new Response(JSON.stringify({ error: 'Host table not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // Validate: all linked table numbers exist in database
  const { data: existingTables, error: tablesError } = await supabase
    .from('Table')
    .select('number')
    .in('number', linkedTableNumbers)

  if (tablesError) {
    return new Response(JSON.stringify({ error: 'Failed to validate tables' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const existingNumbers = new Set(existingTables?.map(t => t.number) || [])
  const invalidNumbers = linkedTableNumbers.filter(n => !existingNumbers.has(n))
  
  if (invalidNumbers.length > 0) {
    return new Response(JSON.stringify({ 
      error: `Tables not found: ${invalidNumbers.join(', ')}`,
      invalidNumbers 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // Check: none of these tables (including host) are already in an active session
  const allTableNumbers = [hostTable.number, ...linkedTableNumbers]
  
  const { data: existingSessions } = await supabase
    .from('TableSession')
    .select('id, linkedTables, hostTableId')
    .eq('isActive', true)

  // Check if any table is already in an active session
  const conflictingSessions = existingSessions?.filter(session => {
    // Check if host table is this session's host
    if (session.hostTableId === hostTableId) return true
    
    // Check if any of our tables are in this session's linkedTables
    const sessionTables = session.linkedTables || []
    return allTableNumbers.some(num => sessionTables.includes(num))
  })

  if (conflictingSessions && conflictingSessions.length > 0) {
    return new Response(JSON.stringify({ 
      error: 'One or more tables are already in an active session',
      conflictingSessionIds: conflictingSessions.map(s => s.id)
    }), {
      status: 409, // Conflict
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

  // Create the session
  const { data: session, error } = await supabase
    .from('TableSession')
    .insert({
      id: generateCuid(),
      code,
      hostTableId,
      linkedTables: linkedTableNumbers,
      isActive: true,
      createdAt: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to create session:', error)
    return new Response(JSON.stringify({ error: 'Failed to create session' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  return new Response(JSON.stringify(session), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}
