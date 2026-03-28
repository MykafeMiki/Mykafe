import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://biefwzrprjqusjynqwus.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpZWZ3enJwcmpxdXNqeW5xd3VzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDEwODMxOCwiZXhwIjoyMDc5Njg0MzE4fQ.42_W-K86lC4KaeOeKhv-a1Hf-oqynNwxbHyGdLvkpmc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkAndFixTable1() {
  // Get table 1
  const { data: table1, error: tableError } = await supabase
    .from('Table')
    .select('*')
    .eq('qrCode', 'tavolo1')
    .single()

  console.log('Table 1:', table1)

  if (!allTables || allTables.length === 0) {
    console.log('No tables found, will create one.')
  } else {
    // Check if tavolo1 exists
    const tavolo1 = allTables.find(t => t.qrCode === 'tavolo1')
    if (tavolo1) {
      console.log('Tavolo1 already exists:', tavolo1)
      return
    }

    // Check if table number 1 exists
    const table1 = allTables.find(t => t.number === 1)
    if (table1) {
      console.log('Table with number 1 exists but has different qrCode:', table1.qrCode)
      console.log('Updating qrCode to tavolo1...')

      const { data: updated, error: updateError } = await supabase
        .from('Table')
        .update({ qrCode: 'tavolo1' })
        .eq('id', table1.id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating qrCode:', updateError)
        return
      }
      console.log('Updated successfully:', updated)
      return
    }
  }

  // Generate a cuid-like ID
  const timestamp = Date.now().toString(36)
  const randomStr = Math.random().toString(36).substring(2, 15)
  const id = `c${timestamp}${randomStr}`

  // Create the table
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('Table')
    .insert({
      id,
      number: 1,
      seats: 4,
      qrCode: 'tavolo1',
      status: 'AVAILABLE',
      isCounter: false,
      createdAt: now,
      updatedAt: now
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating table:', error)
    return
  }

  console.log('Table created successfully:', data)
}

createTable()
