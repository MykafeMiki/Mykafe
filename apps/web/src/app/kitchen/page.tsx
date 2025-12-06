'use client'

import { useState, useEffect, useCallback } from 'react'
import { Volume2, VolumeX, RefreshCw, Lock, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { OrderCard } from '@/components/kitchen/OrderCard'
import { getActiveOrders, updateOrderStatus, verifyToken, adminLogin, setAuthToken, getAuthToken } from '@/lib/api'
import type { Order, OrderStatus } from '@shared/types'

export default function KitchenPage() {
  const t = useTranslations('kitchen')
  const tl = useTranslations('login')
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  // Check auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = getAuthToken()
      if (!token) {
        setIsAuthenticated(false)
        setAuthLoading(false)
        return
      }
      try {
        await verifyToken()
        setIsAuthenticated(true)
      } catch {
        setAuthToken(null)
        setIsAuthenticated(false)
      }
      setAuthLoading(false)
    }
    checkAuth()
  }, [])

  const playNotificationSound = useCallback(() => {
    if (soundEnabled) {
      // Use Web Audio API to generate notification sound
      try {
        const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()

        // Create oscillator for the "ding" sound
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()

        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)

        // Two-tone notification (like a doorbell)
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime) // A5
        oscillator.frequency.setValueAtTime(1174.66, audioContext.currentTime + 0.1) // D6
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime + 0.2) // A5

        // Envelope
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4)

        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.4)

        // Play a second "ding" after a short pause
        setTimeout(() => {
          const osc2 = audioContext.createOscillator()
          const gain2 = audioContext.createGain()
          osc2.connect(gain2)
          gain2.connect(audioContext.destination)

          osc2.frequency.setValueAtTime(1174.66, audioContext.currentTime)
          osc2.frequency.setValueAtTime(1396.91, audioContext.currentTime + 0.1)

          gain2.gain.setValueAtTime(0.3, audioContext.currentTime)
          gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)

          osc2.start(audioContext.currentTime)
          osc2.stop(audioContext.currentTime + 0.3)
        }, 200)
      } catch (e) {
        console.error('Failed to play notification sound:', e)
      }
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

    let cleanup: (() => void) | undefined

    // Dynamically import socket to avoid build-time Supabase client creation
    import('@/lib/socket').then(({ subscribeToOrders, unsubscribeFromOrders }) => {
      // Subscribe to Supabase Realtime for order updates
      subscribeToOrders(
        // On new order
        () => {
          // Fetch fresh data to get complete order with relations
          fetchOrders()
          playNotificationSound()
        },
        // On order update
        () => {
          // Fetch fresh data to get complete order with relations
          fetchOrders()
        }
      )
      cleanup = unsubscribeFromOrders
    }).catch(console.error)

    // Polling fallback
    const interval = setInterval(fetchOrders, 30000)

    return () => {
      if (cleanup) cleanup()
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

  // Auth loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">{tl('verifyingAccess')}</div>
      </div>
    )
  }

  // Not authenticated - show login
  if (!isAuthenticated) {
    return (
      <KitchenLoginScreen onLogin={() => setIsAuthenticated(true)} t={tl} />
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">{t('loadingOrders')}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 text-white p-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-gray-400 text-sm">
            {t('lastUpdate')}:{' '}
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
            title={soundEnabled ? t('soundOff') : t('soundOn')}
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
            title={t('refresh')}
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
              <p className="text-xl">{t('noActiveOrders')}</p>
              <p className="text-sm mt-2">
                {t('ordersAppearHere')}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pending Orders */}
            <div>
              <h2 className="text-lg font-bold text-yellow-400 mb-4 flex items-center gap-2">
                <span className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
                {t('pending')} ({pendingOrders.length})
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
                {t('preparing')} ({preparingOrders.length})
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

// ============ LOGIN SCREEN ============

interface KitchenLoginScreenProps {
  onLogin: () => void
  t: ReturnType<typeof useTranslations<'login'>>
}

function KitchenLoginScreen({ onLogin, t }: KitchenLoginScreenProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) return

    setLoading(true)
    setError('')

    try {
      const { token } = await adminLogin(password)
      setAuthToken(token)
      onLogin()
    } catch (err) {
      setError(t('invalidPassword'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-gray-800 rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">{t('kitchenTitle')}</h1>
            <p className="text-gray-400 mt-1">{t('enterPassword')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('password')}
                className="w-full px-4 py-3 bg-gray-700 text-white border border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
                autoFocus
              />
            </div>

            {error && (
              <div className="text-red-400 text-sm text-center">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              {loading ? t('loggingIn') : t('login')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
