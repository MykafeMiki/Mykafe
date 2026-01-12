'use client'

import { createClient, RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://biefwzrprjqusjynqwus.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpZWZ3enJwcmpxdXNqeW5xd3VzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxMDgzMTgsImV4cCI6MjA3OTY4NDMxOH0.CfLbUJa3znC9zNYXdYa0zrFzZM4ASvgw9Ousq27ZqCw'

// Lazy initialization to avoid build-time errors
let supabase: SupabaseClient | null = null

function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    if (!SUPABASE_ANON_KEY) {
      throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured')
    }
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  }
  return supabase
}

let ordersChannel: RealtimeChannel | null = null
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 5
const RECONNECT_DELAY = 2000

export interface OrderEvent {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: Record<string, unknown>
  old: Record<string, unknown>
}

// Store callbacks for reconnection
let storedOnNewOrder: ((order: unknown) => void) | null = null
let storedOnOrderUpdate: ((order: unknown) => void) | null = null
let storedOnConnectionChange: ((connected: boolean) => void) | null = null

export function subscribeToOrders(
  onNewOrder: (order: unknown) => void,
  onOrderUpdate: (order: unknown) => void,
  onConnectionChange?: (connected: boolean) => void
) {
  // Store callbacks for reconnection
  storedOnNewOrder = onNewOrder
  storedOnOrderUpdate = onOrderUpdate
  storedOnConnectionChange = onConnectionChange || null

  if (ordersChannel) {
    ordersChannel.unsubscribe()
  }

  const subscribe = () => {
    const client = getSupabaseClient()

    ordersChannel = client
      .channel('orders-channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'Order' },
        (payload) => {
          console.log('New order:', payload.new)
          onNewOrder(payload.new)
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'Order' },
        (payload) => {
          console.log('Order updated:', payload.new)
          onOrderUpdate(payload.new)
        }
      )
      .subscribe((status) => {
        console.log('Realtime status:', status)

        switch (status) {
          case 'SUBSCRIBED':
            console.log('✅ Connected to realtime orders')
            reconnectAttempts = 0
            onConnectionChange?.(true)
            break

          case 'CHANNEL_ERROR':
            console.error('❌ Realtime channel error')
            onConnectionChange?.(false)
            attemptReconnect()
            break

          case 'TIMED_OUT':
            console.warn('⚠️ Realtime connection timed out')
            onConnectionChange?.(false)
            attemptReconnect()
            break

          case 'CLOSED':
            console.warn('⚠️ Realtime channel closed')
            onConnectionChange?.(false)
            break
        }
      })
  }

  const attemptReconnect = () => {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error('Max reconnect attempts reached. Please refresh the page.')
      return
    }

    reconnectAttempts++
    const delay = RECONNECT_DELAY * Math.pow(2, reconnectAttempts - 1) // Exponential backoff

    console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`)

    setTimeout(() => {
      if (ordersChannel) {
        ordersChannel.unsubscribe()
      }
      subscribe()
    }, delay)
  }

  subscribe()
  return ordersChannel
}

export function unsubscribeFromOrders() {
  if (ordersChannel) {
    ordersChannel.unsubscribe()
    ordersChannel = null
  }
  storedOnNewOrder = null
  storedOnOrderUpdate = null
  storedOnConnectionChange = null
  reconnectAttempts = 0
}

// Legacy compatibility functions (no-op for now)
export function getSocket() {
  return null
}

export function connectSocket() {
  return null
}

export function disconnectSocket() {
  unsubscribeFromOrders()
}
