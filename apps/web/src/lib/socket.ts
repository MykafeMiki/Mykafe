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

export interface OrderEvent {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: Record<string, unknown>
  old: Record<string, unknown>
}

export function subscribeToOrders(onNewOrder: (order: unknown) => void, onOrderUpdate: (order: unknown) => void) {
  if (ordersChannel) {
    ordersChannel.unsubscribe()
  }

  const client = getSupabaseClient()
  ordersChannel = client
    .channel('orders-channel')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'Order'
      },
      (payload) => {
        console.log('New order:', payload.new)
        onNewOrder(payload.new)
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'Order'
      },
      (payload) => {
        console.log('Order updated:', payload.new)
        onOrderUpdate(payload.new)
      }
    )
    .subscribe()

  return ordersChannel
}

export function unsubscribeFromOrders() {
  if (ordersChannel) {
    ordersChannel.unsubscribe()
    ordersChannel = null
  }
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
