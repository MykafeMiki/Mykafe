'use client'

import { useState } from 'react'
import { X, Minus, Plus, Trash2, Loader2 } from 'lucide-react'
import { useCart } from '@/lib/cart'
import { formatPrice } from '@/lib/utils'
import { createOrder } from '@/lib/api'
import { PaymentMethod, OrderType, ConsumeMode } from '@shared/types'

interface BancoCartDrawerProps {
  isOpen: boolean
  onClose: () => void
  onOrderSuccess: () => void
  customerName: string
}

export function BancoCartDrawer({ isOpen, onClose, onOrderSuccess, customerName }: BancoCartDrawerProps) {
  const { items, tableId, updateQuantity, removeItem, clearCart } = useCart()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const total = items.reduce((sum, item) => {
    const modifiersPrice = item.selectedModifiers.reduce((s, m) => s + m.price, 0)
    return sum + (item.menuItem.price + modifiersPrice) * item.quantity
  }, 0)

  const handleSubmitOrder = async () => {
    if (!tableId || items.length === 0) return

    setIsSubmitting(true)
    setError(null)

    try {
      await createOrder({
        tableId,
        items: items.map((item) => ({
          menuItemId: item.menuItem.id,
          quantity: item.quantity,
          notes: item.notes,
          modifierIds: item.selectedModifiers.map((m) => m.id),
          consumeMode: ConsumeMode.TAKEAWAY,
        })),
        orderType: OrderType.COUNTER,
        paymentMethod: PaymentMethod.CASH, // Always cash at counter
        customerName: customerName,
      })

      clearCart()
      onOrderSuccess()
      onClose()
    } catch (err) {
      setError('Errore nell\'invio dell\'ordine. Riprova.')
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
        <div className="flex items-center justify-between p-4 border-b bg-primary-50">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Il tuo ordine</h2>
            <p className="text-sm text-gray-500">Ordine per: {customerName}</p>
          </div>
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
              Il carrello è vuoto
            </p>
          ) : (
            <div className="space-y-3">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="flex gap-3 p-3 bg-gray-50 rounded-lg"
                >
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

            <div className="flex items-center justify-between text-lg font-bold mb-4">
              <span>Totale</span>
              <span>{formatPrice(total)}</span>
            </div>

            <button
              onClick={handleSubmitOrder}
              disabled={isSubmitting}
              className="w-full py-4 bg-primary-500 text-white rounded-xl font-semibold hover:bg-primary-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Invio in corso...
                </>
              ) : (
                `Ordina - ${formatPrice(total)}`
              )}
            </button>

            <p className="text-center text-gray-500 text-sm mt-3">
              Pagamento in cassa al ritiro
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
