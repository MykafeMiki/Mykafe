import { Server, Socket } from 'socket.io'

export function setupSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log(`📱 Client connected: ${socket.id}`)

    // Join kitchen room for receiving orders
    socket.on('join:kitchen', () => {
      socket.join('kitchen')
      console.log(`👨‍🍳 Kitchen display connected: ${socket.id}`)
    })

    // Join specific table room
    socket.on('join:table', (tableId: string) => {
      socket.join(`table:${tableId}`)
      console.log(`🪑 Client joined table ${tableId}: ${socket.id}`)
    })

    socket.on('disconnect', () => {
      console.log(`👋 Client disconnected: ${socket.id}`)
    })
  })
}

// Helper to emit new order to kitchen
export function emitNewOrder(io: Server, order: unknown) {
  io.to('kitchen').emit('order:new', order)
}

// Helper to emit order status update
export function emitOrderUpdate(io: Server, order: unknown) {
  io.to('kitchen').emit('order:updated', order)
}
