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

// Get table by QR code
router.get('/qr/:qrCode', async (req, res) => {
  try {
    const table = await prisma.table.findUnique({
      where: { qrCode: req.params.qrCode },
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

export { router as tableRouter }
