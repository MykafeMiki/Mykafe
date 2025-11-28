import { Router } from 'express'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

// Get full menu with categories and items
router.get('/', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        items: {
          where: { available: true },
          orderBy: { sortOrder: 'asc' },
          include: {
            modifierGroups: {
              include: {
                modifiers: {
                  where: { available: true },
                },
              },
            },
          },
        },
      },
    })
    res.json(categories)
  } catch (error) {
    console.error('Error fetching menu:', error)
    res.status(500).json({ error: 'Failed to fetch menu' })
  }
})

// Get single menu item with modifiers
router.get('/items/:id', async (req, res) => {
  try {
    const item = await prisma.menuItem.findUnique({
      where: { id: req.params.id },
      include: {
        modifierGroups: {
          include: {
            modifiers: {
              where: { available: true },
            },
          },
        },
      },
    })
    if (!item) {
      return res.status(404).json({ error: 'Item not found' })
    }
    res.json(item)
  } catch (error) {
    console.error('Error fetching item:', error)
    res.status(500).json({ error: 'Failed to fetch item' })
  }
})

// Admin: Create category
router.post('/categories', async (req, res) => {
  try {
    const { name, description, sortOrder } = req.body
    const category = await prisma.category.create({
      data: { name, description, sortOrder: sortOrder || 0 },
    })
    res.status(201).json(category)
  } catch (error) {
    console.error('Error creating category:', error)
    res.status(500).json({ error: 'Failed to create category' })
  }
})

// Admin: Create menu item
router.post('/items', async (req, res) => {
  try {
    const { name, description, price, categoryId, imageUrl, sortOrder } = req.body
    const item = await prisma.menuItem.create({
      data: {
        name,
        description,
        price: Math.round(price * 100), // Store in cents
        categoryId,
        imageUrl,
        sortOrder: sortOrder || 0,
      },
    })
    res.status(201).json(item)
  } catch (error) {
    console.error('Error creating item:', error)
    res.status(500).json({ error: 'Failed to create item' })
  }
})

// Admin: Update item availability
router.patch('/items/:id/availability', async (req, res) => {
  try {
    const { available } = req.body
    const item = await prisma.menuItem.update({
      where: { id: req.params.id },
      data: { available },
    })
    res.json(item)
  } catch (error) {
    console.error('Error updating availability:', error)
    res.status(500).json({ error: 'Failed to update availability' })
  }
})

// Admin: Update category
router.patch('/categories/:id', async (req, res) => {
  try {
    const { name, description, imageUrl, sortOrder, active } = req.body
    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(active !== undefined && { active }),
      },
    })
    res.json(category)
  } catch (error) {
    console.error('Error updating category:', error)
    res.status(500).json({ error: 'Failed to update category' })
  }
})

// Admin: Update menu item
router.patch('/items/:id', async (req, res) => {
  try {
    const { name, description, price, imageUrl, sortOrder, available } = req.body
    const item = await prisma.menuItem.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price: Math.round(price * 100) }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(available !== undefined && { available }),
      },
    })
    res.json(item)
  } catch (error) {
    console.error('Error updating item:', error)
    res.status(500).json({ error: 'Failed to update item' })
  }
})

// Admin: Get all categories (including inactive)
router.get('/admin/categories', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    })
    res.json(categories)
  } catch (error) {
    console.error('Error fetching admin categories:', error)
    res.status(500).json({ error: 'Failed to fetch categories' })
  }
})

export { router as menuRouter }
