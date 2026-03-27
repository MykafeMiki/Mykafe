/**
 * NEW FILE: supabase/functions/cleanup-stale/index.ts
 * 
 * Cron job per pulire automaticamente:
 * - TableCustomer inattivi da più di 4 ore
 * - TableSession inattive da più di 6 ore
 * - Sincronizza Table.status con la presenza effettiva di clienti
 * 
 * Configurare in supabase/config.toml:
 * [functions.cleanup-stale]
 * schedule = "0 * * * *"  # Ogni ora
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Configuration
const CUSTOMER_STALE_HOURS = 4  // Clienti considerati stale dopo 4 ore
const SESSION_STALE_HOURS = 6  // Sessioni considerate stale dopo 6 ore

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const now = new Date()
    const customerCutoff = new Date(now.getTime() - CUSTOMER_STALE_HOURS * 60 * 60 * 1000)
    const sessionCutoff = new Date(now.getTime() - SESSION_STALE_HOURS * 60 * 60 * 1000)

    const results = {
      staleCustomers: 0,
      staleSessions: 0,
      syncedTables: 0,
      errors: [] as string[]
    }

    // 1. Deactivate stale customers (active for more than 4 hours)
    const { data: staleCustomers, error: customerError } = await supabase
      .from('TableCustomer')
      .update({ 
        isActive: false, 
        leftAt: now.toISOString() 
      })
      .eq('isActive', true)
      .lt('createdAt', customerCutoff.toISOString())
      .select('id, tableId')

    if (customerError) {
      results.errors.push(`Customer cleanup error: ${customerError.message}`)
    } else {
      results.staleCustomers = staleCustomers?.length || 0
    }

    // 2. Close stale table sessions (active for more than 6 hours)
    const { data: staleSessions, error: sessionError } = await supabase
      .from('TableSession')
      .update({ 
        isActive: false, 
        closedAt: now.toISOString() 
      })
      .eq('isActive', true)
      .lt('createdAt', sessionCutoff.toISOString())
      .select('id')

    if (sessionError) {
      results.errors.push(`Session cleanup error: ${sessionError.message}`)
    } else {
      results.staleSessions = staleSessions?.length || 0
    }

    // 3. Sync table status with actual customer presence
    // Get all tables
    const { data: allTables } = await supabase
      .from('Table')
      .select('id, status')

    if (allTables) {
      for (const table of allTables) {
        // Count active customers for this table
        const { count } = await supabase
          .from('TableCustomer')
          .select('id', { count: 'exact', head: true })
          .eq('tableId', table.id)
          .eq('isActive', true)

        const hasCustomers = (count || 0) > 0
        const shouldBeOccupied = hasCustomers
        const isOccupied = table.status === 'OCCUPIED'

        // Sync status if mismatched (but don't change RESERVED tables)
        if (table.status !== 'RESERVED') {
          if (shouldBeOccupied && !isOccupied) {
            await supabase
              .from('Table')
              .update({ status: 'OCCUPIED' })
              .eq('id', table.id)
            results.syncedTables++
          } else if (!shouldBeOccupied && isOccupied) {
            await supabase
              .from('Table')
              .update({ status: 'AVAILABLE' })
              .eq('id', table.id)
            results.syncedTables++
          }
        }
      }
    }

    // 4. Close PartySession stale (deprecated but still clean them)
    await supabase
      .from('PartySession')
      .update({ 
        isActive: false, 
        closedAt: now.toISOString() 
      })
      .eq('isActive', true)
      .lt('createdAt', sessionCutoff.toISOString())

    console.log('Cleanup completed:', results)

    return new Response(JSON.stringify({
      success: true,
      timestamp: now.toISOString(),
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Cleanup error:', error)
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
