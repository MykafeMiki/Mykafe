import { Router } from 'express'
import multer from 'multer'
import { uploadImage, deleteImage, extractPathFromUrl } from '../services/storage.js'

const router = Router()

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF and WebP are allowed.'))
    }
  },
})

// Upload image for menu items
router.post('/items', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' })
    }

    const result = await uploadImage(
      req.file.buffer,
      req.file.originalname,
      'items'
    )

    res.json(result)
  } catch (error) {
    console.error('Error uploading item image:', error)
    res.status(500).json({ error: 'Failed to upload image' })
  }
})

// Upload image for categories
router.post('/categories', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' })
    }

    const result = await uploadImage(
      req.file.buffer,
      req.file.originalname,
      'categories'
    )

    res.json(result)
  } catch (error) {
    console.error('Error uploading category image:', error)
    res.status(500).json({ error: 'Failed to upload image' })
  }
})

// Delete image
router.delete('/', async (req, res) => {
  try {
    const { url } = req.body

    if (!url) {
      return res.status(400).json({ error: 'No URL provided' })
    }

    const path = extractPathFromUrl(url)
    if (!path) {
      return res.status(400).json({ error: 'Invalid image URL' })
    }

    await deleteImage(path)
    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting image:', error)
    res.status(500).json({ error: 'Failed to delete image' })
  }
})

export { router as uploadRouter }
