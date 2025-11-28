'use client'

import { useState, useEffect, useCallback } from 'react'
import { Volume2, VolumeX, RefreshCw } from 'lucide-react'
import { OrderCard } from '@/components/kitchen/OrderCard'
import { getActiveOrders, updateOrderStatus } from '@/lib/api'
import { connectSocket, disconnectSocket } from '@/lib/socket'
import type { Order, OrderStatus } from '@shared/types'

export default function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const playNotificationSound = useCallback(() => {
    if (soundEnabled) {
      const audio = new Audio('/notification.mp3')
      audio.play().catch(() => {})
    }
  }, [soundEnabled])

  const fetchOrders = useCallback(async () => {
    try {
      const data = await getActiveOrders()
      setOrders(data)
      setLastUpdate(new Date())
    } catch (err) {
      console.error('Failed to fetch orders:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrders()

    const socket = connectSocket()
    socket.emit('join:kitchen')

    socket.on('order:new', (order: Order) => {
      setOrders((prev) => [order, ...prev])
      playNotificationSound()
      setLastUpdate(new Date())
    })

    socket.on('order:updated', (updatedOrder: Order) => {
      setOrders((prev) =>
        prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
          .filter((o) => ['PENDING', 'PREPARING'].includes(o.status))
      )
      setLastUpdate(new Date())
    })

    // Polling fallback
    const interval = setInterval(fetchOrders, 30000)

    return () => {
      disconnectSocket()
      clearInterval(interval)
    }
  }, [fetchOrders, playNotificationSound])

  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    try {
      await updateOrderStatus(orderId, status)

      // Optimistic update
      if (['SERVED', 'CANCELLED'].includes(status)) {
        setOrders((prev) => prev.filter((o) => o.id !== orderId))
      } else {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status } : o))
        )
      }
    } catch (err) {
      console.error('Failed to update status:', err)
      fetchOrders()
    }
  }

  const pendingOrders = orders.filter((o) => o.status === 'PENDING')
  const preparingOrders = orders.filter((o) => o.status === 'PREPARING')

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Caricamento ordini...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 text-white p-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kitchen Display</h1>
          <p className="text-gray-400 text-sm">
            Ultimo aggiornamento:{' '}
            {lastUpdate.toLocaleTimeString('it-IT', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition"
            title={soundEnabled ? 'Disattiva suono' : 'Attiva suono'}
          >
            {soundEnabled ? (
              <Volume2 className="w-6 h-6" />
            ) : (
              <VolumeX className="w-6 h-6" />
            )}
          </button>

          <button
            onClick={fetchOrders}
            className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition"
            title="Aggiorna"
          >
            <RefreshCw className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4">
        {orders.length === 0 ? (
          <div className="flex items-center justify-center h-[calc(100vh-120px)]">
            <div className="text-center text-gray-500">
              <ChefHatIcon className="w-24 h-24 mx-auto mb-4 opacity-30" />
              <p className="text-xl">Nessun ordine attivo</p>
              <p className="text-sm mt-2">
                I nuovi ordini appariranno qui automaticamente
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pending Orders */}
            <div>
              <h2 className="text-lg font-bold text-yellow-400 mb-4 flex items-center gap-2">
                <span className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
                In attesa ({pendingOrders.length})
              </h2>
              <div className="space-y-4">
                {pendingOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            </div>

            {/* Preparing Orders */}
            <div>
              <h2 className="text-lg font-bold text-blue-400 mb-4 flex items-center gap-2">
                <span className="w-3 h-3 bg-blue-400 rounded-full" />
                In preparazione ({preparingOrders.length})
              </h2>
              <div className="space-y-4">
                {preparingOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function ChefHatIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M6 13.87A4 4 0 0 1 7.41 6.6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6.6 4 4 0 0 1 18 13.87V21H6V13.87z" />
      <path d="M6 17h12" />
    </svg>
  )
}
