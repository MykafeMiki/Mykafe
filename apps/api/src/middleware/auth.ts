import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production'

export interface AuthRequest extends Request {
  admin?: boolean
}

export function verifyAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token mancante' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { admin: boolean }
    if (!decoded.admin) {
      return res.status(403).json({ error: 'Accesso negato' })
    }
    req.admin = true
    next()
  } catch (error) {
    return res.status(401).json({ error: 'Token non valido' })
  }
}

export function generateToken(): string {
  return jwt.sign({ admin: true }, JWT_SECRET, { expiresIn: '24h' })
}
