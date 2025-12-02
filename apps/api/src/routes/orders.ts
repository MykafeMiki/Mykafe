import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { Server } from 'socket.io'
import { emitNewOrder, emitOrderUpdate } from '../services/socket.js'

const router = Router()
const prisma = new PrismaClient()

// Get all orders (for kitchen display)
router.get('/', async (req, res) => {
  try {
    const { status } = req.query
    const where = status ? { status: status as string } : {}

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        table: true,
        items: {
          include: {
            menuItem: {
              include: {
                category: true,
              },
            },
            modifiers: {
              include: {
                modifier: true,
              },
            },
          },
        },
      },
    })
    res.json(orders)
  } catch (error) {
    console.error('Error fetching orders:', error)
    res.status(500).json({ error: 'Failed to fetch orders' })
  }
})

// Get active orders for kitchen
router.get('/active', async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        status: {
          in: ['PENDING', 'PREPARING'],
        },
      },
      orderBy: { createdAt: 'asc' },
      include: {
        table: true,
        items: {
          include: {
            menuItem: {
              include: {
                category: true,
              },
            },
            modifiers: {
              include: {
                modifier: true,
              },
            },
          },
        },
      },
    })
    res.json(orders)
  } catch (error) {
    console.error('Error fetching active orders:', error)
    res.status(500).json({ error: 'Failed to fetch active orders' })
  }
})

// Helper: arrotonda ai 10 centesimi per eccesso
function roundUpToTenCents(amount: number): number {
  return Math.ceil(amount / 10) * 10
}

// Create new order
router.post('/', async (req, res) => {
  try {
    const { tableId, items, notes, orderType, paymentMethod, customerName, customerPhone } = req.body
    const io: Server = req.app.get('io')

    const isCard = paymentMethod === 'CARD'
    const CARD_MULTIPLIER = 1.03

    // Calculate totals - for card payments, each item is priced +3% rounded to 10 cents
    let subtotal = 0  // Base price without card surcharge
    let totalAmount = 0  // Final price (with card surcharge if applicable)

    for (const item of items) {
      const menuItem = await prisma.menuItem.findUnique({
        where: { id: item.menuItemId },
      })
      if (!menuItem) continue

      let itemBasePrice = menuItem.price * item.quantity

      // Add modifier prices
      if (item.modifierIds && item.modifierIds.length > 0) {
        const modifiers = await prisma.modifier.findMany({
          where: { id: { in: item.modifierIds } },
        })
        for (const mod of modifiers) {
          itemBasePrice += mod.price * item.quantity
        }
      }

      subtotal += itemBasePrice

      // For card: apply +3% rounded up to 10 cents per item
      if (isCard) {
        totalAmount += roundUpToTenCents(Math.round(itemBasePrice * CARD_MULTIPLIER))
      } else {
        totalAmount += itemBasePrice
      }
    }

    // Surcharge is the difference between total and subtotal
    const surcharge = totalAmount - subtotal

    // Create order with items
    const order = await prisma.order.create({
      data: {
        tableId,
        notes,
        orderType: orderType || 'DINE_IN',
        paymentMethod,
        customerName,
        customerPhone,
        subtotal,
        surcharge,
        totalAmount,
        status: 'PENDING',
        items: {
          create: items.map((item: { menuItemId: string; quantity: number; notes?: string; modifierIds?: string[]; consumeMode?: string }) => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            notes: item.notes,
            consumeMode: item.consumeMode || 'DINE_IN',
            modifiers: item.modifierIds ? {
              create: item.modifierIds.map((modId: string) => ({
                modifierId: modId,
              })),
            } : undefined,
          })),
        },
      },
      include: {
        table: true,
        items: {
          include: {
            menuItem: {
              include: {
                category: true,
              },
            },
            modifiers: {
              include: {
                modifier: true,
              },
            },
          },
        },
      },
    })

    // Update table status (only for dine-in orders)
    if (orderType !== 'TAKEAWAY') {
      await prisma.table.update({
        where: { id: tableId },
        data: { status: 'OCCUPIED' },
      })
    }

    // Emit to kitchen
    emitNewOrder(io, order)

    res.status(201).json(order)
  } catch (error) {
    console.error('Error creating order:', error)
    res.status(500).json({ error: 'Failed to create order' })
  }
})

// Update order status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body
    const io: Server = req.app.get('io')

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { status },
      include: {
        table: true,
        items: {
          include: {
            menuItem: {
              include: {
                category: true,
              },
            },
            modifiers: {
              include: {
                modifier: true,
              },
            },
          },
        },
      },
    })

    // Emit update
    emitOrderUpdate(io, order)

    res.json(order)
  } catch (error) {
    console.error('Error updating order status:', error)
    res.status(500).json({ error: 'Failed to update order status' })
  }
})

export { router as orderRouter }
