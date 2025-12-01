import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import dotenv from 'dotenv'

import { menuRouter } from './routes/menu.js'
import { orderRouter } from './routes/orders.js'
import { tableRouter } from './routes/tables.js'
import { uploadRouter } from './routes/upload.js'
import { authRouter } from './routes/auth.js'
import { setupSocketHandlers } from './services/socket.js'
import { verifyAdmin } from './middleware/auth.js'

dotenv.config()

const app = express()
const httpServer = createServer(app)

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
})

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
}))
app.use(express.json())

// Make io available to routes
app.set('io', io)

// Public Routes
app.use('/api/menu', menuRouter)
app.use('/api/orders', orderRouter)
app.use('/api/tables', tableRouter)
app.use('/api/auth', authRouter)

// Protected Admin Routes
app.use('/api/upload', verifyAdmin, uploadRouter)

// Root route (per Vercel)
app.get('/', (req, res) => {
  res.json({
    name: 'MyKafe API',
    status: 'ok',
    message: 'API migrata a Supabase Edge Functions',
    supabase: 'https://biefwzrprjqusjynqwus.supabase.co/functions/v1'
  })
})

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Socket.io handlers
setupSocketHandlers(io)

const PORT = process.env.PORT || 3001

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
  console.log(`📡 WebSocket ready for connections`)
})
