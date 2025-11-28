import { Router } from 'express'
import { generateToken, verifyAdmin } from '../middleware/auth.js'

const router = Router()

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'

// Login admin
router.post('/login', (req, res) => {
  const { password } = req.body

  if (!password) {
    return res.status(400).json({ error: 'Password richiesta' })
  }

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Password non valida' })
  }

  const token = generateToken()
  res.json({ token })
})

// Verify token
router.get('/verify', verifyAdmin, (req, res) => {
  res.json({ valid: true })
})

export { router as authRouter }
