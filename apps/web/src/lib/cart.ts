'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MenuItem, Modifier, CartItem } from '@shared/types'
import { ConsumeMode } from '@shared/types'

interface CartStore {
  items: CartItem[]
  tableId: string | null
  pickupTime: string | null
  customerName: string | null
  setTableId: (tableId: string) => void
  setPickupTime: (time: string | null) => void
  setCustomerName: (name: string | null) => void
  addItem: (item: MenuItem, quantity: number, modifiers: Modifier[], notes?: string, consumeMode?: ConsumeMode) => void
  removeItem: (index: number) => void
  updateQuantity: (index: number, quantity: number) => void
  updateConsumeMode: (index: number, consumeMode: ConsumeMode) => void
  clearCart: () => void
  getTotal: () => number
  getItemCount: () => number
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      tableId: null,
      pickupTime: null,
      customerName: null,

      setTableId: (tableId) => set({ tableId }),
      setPickupTime: (pickupTime) => set({ pickupTime }),
      setCustomerName: (customerName) => set({ customerName }),

      addItem: (menuItem, quantity, selectedModifiers, notes, consumeMode = ConsumeMode.DINE_IN) => {
        set((state) => ({
          items: [
            ...state.items,
            { menuItem, quantity, selectedModifiers, notes, consumeMode },
          ],
        }))
      },

      removeItem: (index) => {
        set((state) => ({
          items: state.items.filter((_, i) => i !== index),
        }))
      },

      updateQuantity: (index, quantity) => {
        if (quantity <= 0) {
          get().removeItem(index)
          return
        }
        set((state) => ({
          items: state.items.map((item, i) =>
            i === index ? { ...item, quantity } : item
          ),
        }))
      },

      updateConsumeMode: (index, consumeMode) => {
        set((state) => ({
          items: state.items.map((item, i) =>
            i === index ? { ...item, consumeMode } : item
          ),
        }))
      },

      clearCart: () => set({ items: [] }),

      getTotal: () => {
        return get().items.reduce((total, item) => {
          const itemPrice = item.menuItem.price
          const modifiersPrice = item.selectedModifiers.reduce(
            (sum, mod) => sum + mod.price,
            0
          )
          return total + (itemPrice + modifiersPrice) * item.quantity
        }, 0)
      },

      getItemCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0)
      },
    }),
    {
      name: 'mykafe-cart',
    }
  )
)
