'use client'

import { useState } from 'react'
import { X, Minus, Plus, Trash2, Loader2, UtensilsCrossed, ShoppingBag } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useCart } from '@/lib/cart'
import { formatPrice, cn } from '@/lib/utils'
import { createOrder } from '@/lib/api'
import { ConsumeMode } from '@shared/types'

interface CartDrawerProps {
  isOpen: boolean
  onClose: () => void
  onOrderSuccess: () => void
}

export function CartDrawer({ isOpen, onClose, onOrderSuccess }: CartDrawerProps) {
  const t = useTranslations('cart')
  const tm = useTranslations('menuItem')
  const { items, tableId, tableSessionId, updateQuantity, updateConsumeMode, removeItem, clearCart, getTotal } = useCart()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmitOrder = async () => {
    if (!tableId || items.length === 0) return

    setIsSubmitting(true)
    setError(null)

    try {
      await createOrder({
        tableId,
        tableSessionId: tableSessionId || undefined,
        items: items.map((item) => ({
          menuItemId: item.menuItem.id,
          quantity: item.quantity,
          notes: item.notes,
          modifierIds: item.selectedModifiers.map((m) => m.id),
          consumeMode: item.consumeMode,
        })),
      })

      clearCart()
      onOrderSuccess()
      onClose()
    } catch (err) {
      setError(t('orderError'))
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative w-full max-w-lg max-h-[90vh] bg-white rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold text-gray-900">{t('title')}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              {t('empty')}
            </p>
          ) : (
            <div className="space-y-4">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900">
                        {item.menuItem.name}
                      </h3>
                      {item.selectedModifiers.length > 0 && (
                        <p className="text-sm text-gray-500">
                          {item.selectedModifiers.map((m) => m.name).join(', ')}
                        </p>
                      )}
                      {item.notes && (
                        <p className="text-sm text-gray-400 italic">
                          "{item.notes}"
                        </p>
                      )}
                      <p className="font-semibold text-primary-600 mt-1">
                        {formatPrice(
                          (item.menuItem.price +
                            item.selectedModifiers.reduce((s, m) => s + m.price, 0)) *
                            item.quantity
                        )}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <button
                        onClick={() => removeItem(index)}
                        className="p-1 text-gray-400 hover:text-red-500 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="flex items-center gap-2 bg-white border rounded">
                        <button
                          onClick={() => updateQuantity(index, item.quantity - 1)}
                          className="p-2 hover:bg-gray-100 transition"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-6 text-center font-semibold">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(index, item.quantity + 1)}
                          className="p-2 hover:bg-gray-100 transition"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Consume Mode Toggle */}
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
                    <button
                      onClick={() => updateConsumeMode(index, ConsumeMode.DINE_IN)}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded text-xs font-medium transition',
                        item.consumeMode === ConsumeMode.DINE_IN
                          ? 'bg-primary-100 text-primary-700 border border-primary-300'
                          : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <UtensilsCrossed className="w-3.5 h-3.5" />
                      {tm('eatHere')}
                    </button>
                    <button
                      onClick={() => updateConsumeMode(index, ConsumeMode.TAKEAWAY)}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded text-xs font-medium transition',
                        item.consumeMode === ConsumeMode.TAKEAWAY
                          ? 'bg-orange-100 text-orange-700 border border-orange-300'
                          : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      {tm('takeaway')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-4 border-t bg-gray-50">
            {error && (
              <p className="text-red-500 text-sm mb-3 text-center">{error}</p>
            )}

            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-600">{t('total')}</span>
              <span className="text-xl font-bold">{formatPrice(getTotal())}</span>
            </div>

            <button
              onClick={handleSubmitOrder}
              disabled={isSubmitting}
              className="w-full py-4 bg-accent-500 text-white rounded-xl font-semibold hover:bg-accent-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t('sending')}
                </>
              ) : (
                t('confirmOrder')
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
