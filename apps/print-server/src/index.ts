/**
 * MyKafe Print Server
 *
 * Listens for new orders via WebSocket and prints to thermal printers.
 * Supports dual printer setup: one for CLASSIC menu, one for SUSHI menu.
 */

import { io, Socket } from 'socket.io-client'
import dotenv from 'dotenv'

dotenv.config()

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3001'
const RESTAURANT_NAME = process.env.RESTAURANT_NAME || 'MyKafe'
const SUSHI_CATEGORIES = (process.env.SUSHI_CATEGORIES || 'Sushi,Sashimi,Roll,Nigiri')
  .split(',')
  .map(s => s.trim().toLowerCase())

// Printer configuration
const PRINTER_CLASSIC = {
  type: process.env.PRINTER_CLASSIC_TYPE || 'network',
  ip: process.env.PRINTER_CLASSIC_IP || '192.168.1.100',
  port: parseInt(process.env.PRINTER_CLASSIC_PORT || '9100'),
}

const PRINTER_SUSHI = {
  type: process.env.PRINTER_SUSHI_TYPE || 'network',
  ip: process.env.PRINTER_SUSHI_IP || '192.168.1.101',
  port: parseInt(process.env.PRINTER_SUSHI_PORT || '9100'),
}

// Types
interface OrderItem {
  id: string
  quantity: number
  notes?: string
  consumeMode: string
  menuItem: {
    id: string
    name: string
    price: number
    category?: {
      name: string
    }
  }
  modifiers?: Array<{
    modifier: {
      name: string
      price: number
    }
  }>
}

interface Order {
  id: string
  status: string
  orderType: string
  customerName?: string
  customerPhone?: string
  notes?: string
  totalAmount: number
  createdAt: string
  table?: {
    number: number
    isCounter: boolean
  }
  items: OrderItem[]
}

// ESC/POS Commands
const ESC = '\x1B'
const GS = '\x1D'
const COMMANDS = {
  INIT: ESC + '@',
  ALIGN_CENTER: ESC + 'a' + '\x01',
  ALIGN_LEFT: ESC + 'a' + '\x00',
  BOLD_ON: ESC + 'E' + '\x01',
  BOLD_OFF: ESC + 'E' + '\x00',
  DOUBLE_HEIGHT: GS + '!' + '\x10',
  DOUBLE_WIDTH: GS + '!' + '\x20',
  DOUBLE_SIZE: GS + '!' + '\x30',
  NORMAL_SIZE: GS + '!' + '\x00',
  CUT: GS + 'V' + '\x00',
  PARTIAL_CUT: GS + 'V' + '\x01',
  FEED_LINES: (n: number) => ESC + 'd' + String.fromCharCode(n),
}

// Format price in euros
function formatPrice(cents: number): string {
  return `${(cents / 100).toFixed(2)}`
}

// Format date/time
function formatDateTime(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Generate receipt content
function generateReceipt(order: Order, items: OrderItem[], printerType: 'CLASSIC' | 'SUSHI'): string {
  const lines: string[] = []

  // Header
  lines.push(COMMANDS.INIT)
  lines.push(COMMANDS.ALIGN_CENTER)
  lines.push(COMMANDS.DOUBLE_SIZE)
  lines.push(COMMANDS.BOLD_ON)
  lines.push(printerType === 'SUSHI' ? '** SUSHI **' : '** CUCINA **')
  lines.push(COMMANDS.NORMAL_SIZE)
  lines.push(COMMANDS.BOLD_OFF)
  lines.push('')

  // Order info
  lines.push(COMMANDS.DOUBLE_HEIGHT)
  if (order.table?.isCounter || order.orderType === 'TAKEAWAY') {
    lines.push(`ASPORTO: ${order.customerName || 'N/A'}`)
  } else {
    lines.push(`TAVOLO ${order.table?.number || '?'}`)
  }
  lines.push(COMMANDS.NORMAL_SIZE)
  lines.push('')

  // Time
  lines.push(formatDateTime(order.createdAt))
  lines.push('')
  lines.push('--------------------------------')
  lines.push('')

  // Items
  lines.push(COMMANDS.ALIGN_LEFT)
  for (const item of items) {
    lines.push(COMMANDS.BOLD_ON)
    lines.push(COMMANDS.DOUBLE_HEIGHT)
    lines.push(`${item.quantity}x ${item.menuItem.name}`)
    lines.push(COMMANDS.NORMAL_SIZE)
    lines.push(COMMANDS.BOLD_OFF)

    // Modifiers
    if (item.modifiers && item.modifiers.length > 0) {
      for (const mod of item.modifiers) {
        lines.push(`   + ${mod.modifier.name}`)
      }
    }

    // Notes
    if (item.notes) {
      lines.push(`   >> ${item.notes}`)
    }

    // Consume mode
    if (item.consumeMode === 'TAKEAWAY') {
      lines.push('   [DA ASPORTO]')
    }

    lines.push('')
  }

  // Order notes
  if (order.notes) {
    lines.push('--------------------------------')
    lines.push(COMMANDS.BOLD_ON)
    lines.push('NOTE:')
    lines.push(COMMANDS.BOLD_OFF)
    lines.push(order.notes)
    lines.push('')
  }

  // Footer
  lines.push('--------------------------------')
  lines.push(COMMANDS.ALIGN_CENTER)
  lines.push(`#${order.id.slice(-6).toUpperCase()}`)
  lines.push('')
  lines.push(COMMANDS.FEED_LINES(3))
  lines.push(COMMANDS.PARTIAL_CUT)

  return lines.join('\n')
}

// Print to network printer
async function printToNetwork(ip: string, port: number, content: string): Promise<void> {
  const net = await import('net')

  return new Promise((resolve, reject) => {
    const socket = new net.Socket()

    socket.setTimeout(5000)

    socket.connect(port, ip, () => {
      console.log(`  Connected to printer at ${ip}:${port}`)
      socket.write(content, 'binary', () => {
        socket.end()
        resolve()
      })
    })

    socket.on('error', (err) => {
      console.error(`  Printer error (${ip}:${port}):`, err.message)
      reject(err)
    })

    socket.on('timeout', () => {
      socket.destroy()
      reject(new Error('Connection timeout'))
    })
  })
}

// Separate items by category
function separateItems(items: OrderItem[]): { classic: OrderItem[], sushi: OrderItem[] } {
  const classic: OrderItem[] = []
  const sushi: OrderItem[] = []

  for (const item of items) {
    const categoryName = item.menuItem.category?.name?.toLowerCase() || ''

    if (SUSHI_CATEGORIES.some(cat => categoryName.includes(cat))) {
      sushi.push(item)
    } else {
      classic.push(item)
    }
  }

  return { classic, sushi }
}

// Process and print order
async function processOrder(order: Order): Promise<void> {
  console.log(`\nProcessing order #${order.id.slice(-6).toUpperCase()}`)
  console.log(`  Type: ${order.orderType}, Items: ${order.items.length}`)

  const { classic, sushi } = separateItems(order.items)

  // Print classic items
  if (classic.length > 0) {
    console.log(`  Printing ${classic.length} CLASSIC items...`)
    const receipt = generateReceipt(order, classic, 'CLASSIC')

    try {
      await printToNetwork(PRINTER_CLASSIC.ip, PRINTER_CLASSIC.port, receipt)
      console.log('  CLASSIC printer: OK')
    } catch (err) {
      console.error('  CLASSIC printer: FAILED')
    }
  }

  // Print sushi items
  if (sushi.length > 0) {
    console.log(`  Printing ${sushi.length} SUSHI items...`)
    const receipt = generateReceipt(order, sushi, 'SUSHI')

    try {
      await printToNetwork(PRINTER_SUSHI.ip, PRINTER_SUSHI.port, receipt)
      console.log('  SUSHI printer: OK')
    } catch (err) {
      console.error('  SUSHI printer: FAILED')
    }
  }
}

// Main
function main(): void {
  console.log('========================================')
  console.log('       MyKafe Print Server v1.0')
  console.log('========================================')
  console.log('')
  console.log('Configuration:')
  console.log(`  API URL: ${API_URL}`)
  console.log(`  Classic Printer: ${PRINTER_CLASSIC.ip}:${PRINTER_CLASSIC.port}`)
  console.log(`  Sushi Printer: ${PRINTER_SUSHI.ip}:${PRINTER_SUSHI.port}`)
  console.log(`  Sushi Categories: ${SUSHI_CATEGORIES.join(', ')}`)
  console.log('')

  // Connect to API
  console.log('Connecting to API...')
  const socket: Socket = io(API_URL, {
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
  })

  socket.on('connect', () => {
    console.log('Connected to API!')
    console.log('Joining kitchen room...')
    socket.emit('join:kitchen')
    console.log('')
    console.log('Waiting for orders...')
    console.log('')
  })

  socket.on('disconnect', () => {
    console.log('Disconnected from API. Reconnecting...')
  })

  socket.on('connect_error', (err) => {
    console.error('Connection error:', err.message)
  })

  // Listen for new orders
  socket.on('order:new', async (order: Order) => {
    console.log('')
    console.log('========== NEW ORDER ==========')
    await processOrder(order)
    console.log('===============================')
  })
}

main()
