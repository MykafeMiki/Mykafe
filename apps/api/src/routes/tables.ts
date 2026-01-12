import { Router } from 'express'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

// Get all tables
router.get('/', async (req, res) => {
  try {
    const tables = await prisma.table.findMany({
      orderBy: { number: 'asc' },
    })
    res.json(tables)
  } catch (error) {
    console.error('Error fetching tables:', error)
    res.status(500).json({ error: 'Failed to fetch tables' })
  }
})

// Get table by QR code (includes active customers)
router.get('/qr/:qrCode', async (req, res) => {
  try {
    const table = await prisma.table.findUnique({
      where: { qrCode: req.params.qrCode },
      include: {
        customers: {
          where: { isActive: true },
          orderBy: { createdAt: 'asc' }
        }
      }
    })
    if (!table) {
      return res.status(404).json({ error: 'Table not found' })
    }
    res.json(table)
  } catch (error) {
    console.error('Error fetching table:', error)
    res.status(500).json({ error: 'Failed to fetch table' })
  }
})

// Get table by ID
router.get('/:id', async (req, res) => {
  try {
    const table = await prisma.table.findUnique({
      where: { id: req.params.id },
      include: {
        orders: {
          where: {
            status: { in: ['PENDING', 'PREPARING', 'READY'] },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })
    if (!table) {
      return res.status(404).json({ error: 'Table not found' })
    }
    res.json(table)
  } catch (error) {
    console.error('Error fetching table:', error)
    res.status(500).json({ error: 'Failed to fetch table' })
  }
})

// Create table
router.post('/', async (req, res) => {
  try {
    const { number, seats } = req.body
    // Generate unique QR code
    const qrCode = `table-${number}-${Date.now()}`

    const table = await prisma.table.create({
      data: {
        number,
        seats: seats || 4,
        qrCode,
      },
    })
    res.status(201).json(table)
  } catch (error) {
    console.error('Error creating table:', error)
    res.status(500).json({ error: 'Failed to create table' })
  }
})

// Update table status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body
    const table = await prisma.table.update({
      where: { id: req.params.id },
      data: { status },
    })
    res.json(table)
  } catch (error) {
    console.error('Error updating table status:', error)
    res.status(500).json({ error: 'Failed to update table status' })
  }
})

// ========== Table Customers Management ==========

// Add customer to table (with atomic isHost assignment to prevent race condition)
router.post('/:id/customers', async (req, res) => {
  try {
    const tableId = req.params.id
    const { name } = req.body

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name is required' })
    }

    // Use transaction with serializable isolation to prevent race condition
    const result = await prisma.$transaction(async (tx) => {
      // Lock: count existing active customers
      const existingCount = await tx.tableCustomer.count({
        where: { tableId, isActive: true }
      })

      // First customer is the host
      const isHost = existingCount === 0

      // Create the customer atomically
      const customer = await tx.tableCustomer.create({
        data: {
          tableId,
          name: name.trim(),
          isHost
        }
      })

      // Update table status to OCCUPIED if it was AVAILABLE
      await tx.table.update({
        where: { id: tableId },
        data: { status: 'OCCUPIED' }
      })

      return customer
    }, {
      isolationLevel: 'Serializable' // Prevents phantom reads
    })

    res.status(201).json(result)
  } catch (error: any) {
    console.error('Error adding customer to table:', error)

    // Handle serialization failure (retry logic could be added here)
    if (error.code === '40001') {
      return res.status(409).json({
        error: 'Concurrent modification detected. Please try again.'
      })
    }

    res.status(500).json({ error: 'Failed to add customer' })
  }
})

// Get active customers at a table
router.get('/:id/customers', async (req, res) => {
  try {
    const customers = await prisma.tableCustomer.findMany({
      where: {
        tableId: req.params.id,
        isActive: true
      },
      orderBy: { createdAt: 'asc' }
    })
    res.json(customers)
  } catch (error) {
    console.error('Error fetching table customers:', error)
    res.status(500).json({ error: 'Failed to fetch customers' })
  }
})

// Get host customer name at a table (for "Sei al tavolo con X?" screen)
router.get('/:id/host', async (req, res) => {
  try {
    const host = await prisma.tableCustomer.findFirst({
      where: {
        tableId: req.params.id,
        isActive: true,
        isHost: true
      }
    })

    if (!host) {
      return res.status(404).json({ error: 'No host found' })
    }

    res.json(host)
  } catch (error) {
    console.error('Error fetching table host:', error)
    res.status(500).json({ error: 'Failed to fetch host' })
  }
})

// Clear all customers from a table (when table is freed)
router.delete('/:id/customers', async (req, res) => {
  try {
    const now = new Date()

    await prisma.tableCustomer.updateMany({
      where: {
        tableId: req.params.id,
        isActive: true
      },
      data: {
        isActive: false,
        leftAt: now
      }
    })

    // Update table status to AVAILABLE
    await prisma.table.update({
      where: { id: req.params.id },
      data: { status: 'AVAILABLE' }
    })

    res.json({ success: true })
  } catch (error) {
    console.error('Error clearing table customers:', error)
    res.status(500).json({ error: 'Failed to clear customers' })
  }
})

export { router as tableRouter }
