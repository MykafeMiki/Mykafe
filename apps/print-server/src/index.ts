import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { printOrder } from './printer'
import { formatOrderReceipt } from './receipt'
import type { Order } from './types'

dotenv.config()

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Errore: SUPABASE_URL e SUPABASE_ANON_KEY sono richiesti')
  console.error('   Copia .env.example in .env e configura le variabili')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

console.log('🖨️  MyKafe Print Server')
console.log('========================')
console.log(`📡 Connesso a: ${SUPABASE_URL}`)
console.log('👂 In ascolto per nuovi ordini...\n')

// Sottoscrivi ai nuovi ordini
const channel = supabase
  .channel('kitchen-printer')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'Order'
    },
    async (payload) => {
      console.log('📥 Nuovo ordine ricevuto:', payload.new.id)

      try {
        // Fetch ordine completo con relazioni
        const { data: order, error } = await supabase
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
          .eq('id', payload.new.id)
          .single()

        if (error || !order) {
          console.error('❌ Errore nel recupero ordine:', error)
          return
        }

        // Formatta e stampa
        const receipt = formatOrderReceipt(order as Order)
        await printOrder(receipt)

        console.log(`✅ Ordine #${order.id.slice(-6)} stampato!\n`)
      } catch (err) {
        console.error('❌ Errore stampa:', err)
      }
    }
  )
  .subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      console.log('✅ Connesso a Supabase Realtime')
    } else if (status === 'CHANNEL_ERROR') {
      console.error('❌ Errore connessione Realtime')
    }
  })

// Gestisci chiusura
process.on('SIGINT', async () => {
  console.log('\n👋 Chiusura Print Server...')
  await supabase.removeChannel(channel)
  process.exit(0)
})

// Mantieni il processo attivo
setInterval(() => {}, 1000)
