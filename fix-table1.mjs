import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://biefwzrprjqusjynqwus.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpZWZ3enJwcmpxdXNqeW5xd3VzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDEwODMxOCwiZXhwIjoyMDc5Njg0MzE4fQ.42_W-K86lC4KaeOeKhv-a1Hf-oqynNwxbHyGdLvkpmc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixTable1() {
  // Get table 1
  const { data: table1 } = await supabase
    .from('Table')
    .select('*')
    .eq('qrCode', 'tavolo1')
    .single()

  console.log('Table 1 status:', table1?.status)
  console.log('Table 1 ID:', table1?.id)

  if (!table1) {
    console.log('Table 1 not found!')
    return
  }

  // Check active customers at this table
  const { data: customers } = await supabase
    .from('TableCustomer')
    .select('*')
    .eq('tableId', table1.id)
    .eq('isActive', true)

  console.log('Active customers at table 1:', customers?.length || 0)
  if (customers && customers.length > 0) {
    console.log('Customers:', JSON.stringify(customers, null, 2))
  }

  // Check active orders at this table
  const { data: orders } = await supabase
    .from('Order')
    .select('*')
    .eq('tableId', table1.id)
    .in('status', ['PENDING', 'PREPARING', 'READY'])

  console.log('Active orders at table 1:', orders?.length || 0)
  if (orders && orders.length > 0) {
    console.log('Orders:', JSON.stringify(orders, null, 2))
  }

  // Check table sessions
  const { data: sessions } = await supabase
    .from('TableSession')
    .select('*')
    .eq('tableId', table1.id)
    .is('endedAt', null)

  console.log('Active sessions at table 1:', sessions?.length || 0)
  if (sessions && sessions.length > 0) {
    console.log('Sessions:', JSON.stringify(sessions, null, 2))
  }

  // Fix: Clear active customers
  if (customers && customers.length > 0) {
    console.log('\nClearing active customers...')
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('TableCustomer')
      .update({ isActive: false, leftAt: now })
      .eq('tableId', table1.id)
      .eq('isActive', true)

    if (error) {
      console.error('Error clearing customers:', error)
    } else {
      console.log('Customers cleared!')
    }
  }

  // Fix: End active sessions
  if (sessions && sessions.length > 0) {
    console.log('\nEnding active sessions...')
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('TableSession')
      .update({ endedAt: now })
      .eq('tableId', table1.id)
      .is('endedAt', null)

    if (error) {
      console.error('Error ending sessions:', error)
    } else {
      console.log('Sessions ended!')
    }
  }

  // Fix: Set table status to AVAILABLE
  if (table1.status !== 'AVAILABLE') {
    console.log('\nSetting table status to AVAILABLE...')
    const { error } = await supabase
      .from('Table')
      .update({ status: 'AVAILABLE' })
      .eq('id', table1.id)

    if (error) {
      console.error('Error updating status:', error)
    } else {
      console.log('Table status updated to AVAILABLE!')
    }
  }

  console.log('\nDone!')
}

fixTable1()
