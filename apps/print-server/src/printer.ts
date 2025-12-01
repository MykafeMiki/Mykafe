import escpos from 'escpos'

// Tipo di connessione configurabile
type ConnectionType = 'usb' | 'network' | 'console'

interface PrinterConfig {
  type: ConnectionType
  // Per network
  host?: string
  port?: number
  // Per USB
  vendorId?: number
  productId?: number
}

let printerDevice: escpos.USB | escpos.Network | null = null
let printer: escpos.Printer | null = null

// Configurazione da variabili d'ambiente
function getConfig(): PrinterConfig {
  const type = (process.env.PRINTER_TYPE || 'console') as ConnectionType
  return {
    type,
    host: process.env.PRINTER_HOST || '192.168.1.100',
    port: parseInt(process.env.PRINTER_PORT || '9100'),
    vendorId: parseInt(process.env.PRINTER_VENDOR_ID || '0x0483'),
    productId: parseInt(process.env.PRINTER_PRODUCT_ID || '0x5720')
  }
}

/**
 * Inizializza la stampante
 */
export async function initPrinter(): Promise<boolean> {
  const config = getConfig()

  if (config.type === 'console') {
    console.log('🖨️  Modalità console: le ricevute verranno stampate nel terminale')
    return true
  }

  try {
    if (config.type === 'usb') {
      // Importa dinamicamente escpos-usb
      const escposUsb = await import('escpos-usb')
      escposUsb.default(escpos)
      printerDevice = new escpos.USB(config.vendorId, config.productId)
    } else if (config.type === 'network') {
      // Importa dinamicamente escpos-network
      const escposNetwork = await import('escpos-network')
      escposNetwork.default(escpos)
      printerDevice = new escpos.Network(config.host!, config.port)
    }

    return new Promise((resolve, reject) => {
      printerDevice!.open((err: Error | null) => {
        if (err) {
          console.error('❌ Errore connessione stampante:', err.message)
          printerDevice = null
          resolve(false)
        } else {
          printer = new escpos.Printer(printerDevice)
          console.log(`✅ Stampante ${config.type} connessa`)
          resolve(true)
        }
      })
    })
  } catch (err) {
    console.error('❌ Errore inizializzazione stampante:', err)
    return false
  }
}

/**
 * Stampa le righe dello scontrino
 */
export async function printOrder(lines: string[]): Promise<void> {
  const config = getConfig()

  if (config.type === 'console' || !printer) {
    // Modalità console: stampa nel terminale
    console.log('\n' + '='.repeat(50))
    console.log('📄 SCONTRINO ORDINE:')
    console.log('='.repeat(50))
    for (const line of lines) {
      // Rimuovi codici ESC/POS per visualizzazione console
      const cleanLine = line.replace(/\x1b\[\dx\]/g, '')
      console.log(cleanLine)
    }
    console.log('='.repeat(50) + '\n')
    return
  }

  return new Promise((resolve, reject) => {
    try {
      printer!
        .font('A')
        .align('LT')
        .style('NORMAL')
        .size(1, 1)

      for (const line of lines) {
        // Gestisci testo grande (ESC/POS double size)
        if (line.includes('\x1b[2x]')) {
          const text = line.replace(/\x1b\[\dx\]/g, '')
          printer!.size(2, 2).text(text).size(1, 1)
        } else {
          printer!.text(line)
        }
      }

      printer!
        .feed(3)
        .cut()
        .close(() => {
          resolve()
        })
    } catch (err) {
      console.error('❌ Errore stampa:', err)
      reject(err)
    }
  })
}

/**
 * Chiude la connessione alla stampante
 */
export function closePrinter(): void {
  if (printerDevice) {
    try {
      printerDevice.close()
      printerDevice = null
      printer = null
      console.log('🔌 Stampante disconnessa')
    } catch (err) {
      console.error('Errore chiusura stampante:', err)
    }
  }
}
