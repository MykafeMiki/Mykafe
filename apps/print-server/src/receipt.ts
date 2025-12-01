import type { Order, OrderItem } from './types'

/**
 * Formatta un ordine in formato scontrino per la cucina
 * Ottimizzato per stampanti termiche 80mm
 */
export function formatOrderReceipt(order: Order): string[] {
  const lines: string[] = []
  const width = 48 // Caratteri per riga (80mm)
  const divider = '='.repeat(width)
  const thinDivider = '-'.repeat(width)

  // Header
  lines.push('')
  lines.push(center('*** NUOVO ORDINE ***', width))
  lines.push(divider)

  // Info tavolo/cliente
  const tableInfo = order.table.isCounter
    ? `BANCO - ${order.customerName || 'Cliente'}`
    : `TAVOLO ${order.table.number}`

  lines.push(center(tableInfo, width, true)) // Grande
  lines.push('')

  // Tipo ordine
  if (order.orderType === 'TAKEAWAY') {
    lines.push(center('>> ASPORTO <<', width))
    lines.push('')
  }

  // Orario
  const time = new Date(order.createdAt).toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit'
  })
  lines.push(`Ora: ${time}`)
  lines.push(`Ordine: #${order.id.slice(-6).toUpperCase()}`)
  lines.push(divider)

  // Items
  lines.push('')
  for (const item of order.items) {
    // Quantità e nome piatto
    const qtyName = `${item.quantity}x ${item.menuItem.name.toUpperCase()}`
    lines.push(qtyName)

    // Modalità consumo se diversa dall'ordine
    if (item.consumeMode === 'TAKEAWAY' && order.orderType !== 'TAKEAWAY') {
      lines.push('   >> ASPORTO')
    }

    // Modificatori
    for (const mod of item.modifiers) {
      lines.push(`   + ${mod.modifier.name}`)
    }

    // Note item
    if (item.notes) {
      lines.push(`   * ${item.notes}`)
    }

    lines.push('')
  }

  // Note ordine
  if (order.notes) {
    lines.push(thinDivider)
    lines.push('NOTE:')
    lines.push(order.notes)
    lines.push('')
  }

  // Footer
  lines.push(divider)

  // Pagamento
  const payment = order.paymentMethod === 'CARD' ? 'CARTA' : 'CONTANTI'
  lines.push(`Pagamento: ${payment}`)
  lines.push('')
  lines.push(center(time, width))
  lines.push('')
  lines.push('')
  lines.push('') // Spazio per taglio

  return lines
}

/**
 * Centra testo
 */
function center(text: string, width: number, large = false): string {
  const padding = Math.max(0, Math.floor((width - text.length) / 2))
  const centered = ' '.repeat(padding) + text
  return large ? `\x1b[2x]${centered}\x1b[0x]` : centered // ESC/POS double size
}

/**
 * Formatta prezzo
 */
export function formatPrice(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`
}
