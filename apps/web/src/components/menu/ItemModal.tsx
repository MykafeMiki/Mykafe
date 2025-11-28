'use client'

import { useState } from 'react'
import { X, Minus, Plus, UtensilsCrossed, ShoppingBag } from 'lucide-react'
import { formatPrice, cn } from '@/lib/utils'
import type { MenuItem, Modifier } from '@shared/types'
import { ConsumeMode } from '@shared/types'

interface ItemModalProps {
  item: MenuItem
  onClose: () => void
  onAdd: (quantity: number, modifiers: Modifier[], notes?: string, consumeMode?: ConsumeMode) => void
  defaultConsumeMode?: ConsumeMode
  priceMultiplier?: number
  hideConsumeModeSelector?: boolean
}

// Arrotonda ai 10 centesimi per eccesso
function roundUpToTenCents(amount: number): number {
  return Math.ceil(amount / 10) * 10
}

export function ItemModal({ item, onClose, onAdd, defaultConsumeMode = ConsumeMode.DINE_IN, priceMultiplier = 1, hideConsumeModeSelector = false }: ItemModalProps) {
  const [quantity, setQuantity] = useState(1)
  const [selectedModifiers, setSelectedModifiers] = useState<Record<string, Modifier[]>>({})
  const [notes, setNotes] = useState('')
  const [consumeMode, setConsumeMode] = useState<ConsumeMode>(defaultConsumeMode)

  const toggleModifier = (groupId: string, modifier: Modifier, multiSelect: boolean) => {
    setSelectedModifiers((prev) => {
      const current = prev[groupId] || []

      if (multiSelect) {
        const exists = current.some((m) => m.id === modifier.id)
        return {
          ...prev,
          [groupId]: exists
            ? current.filter((m) => m.id !== modifier.id)
            : [...current, modifier],
        }
      } else {
        return {
          ...prev,
          [groupId]: current.some((m) => m.id === modifier.id) ? [] : [modifier],
        }
      }
    })
  }

  const isModifierSelected = (groupId: string, modifierId: string) => {
    return (selectedModifiers[groupId] || []).some((m) => m.id === modifierId)
  }

  const getAllSelectedModifiers = () => {
    return Object.values(selectedModifiers).flat()
  }

  const calculateTotal = () => {
    const modifiersTotal = getAllSelectedModifiers().reduce(
      (sum, mod) => sum + mod.price,
      0
    )
    const baseTotal = (item.price + modifiersTotal) * quantity
    return priceMultiplier > 1
      ? roundUpToTenCents(Math.round(baseTotal * priceMultiplier))
      : baseTotal
  }

  const handleAdd = () => {
    onAdd(quantity, getAllSelectedModifiers(), notes || undefined, consumeMode)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative w-full max-w-lg max-h-[90vh] bg-white rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold text-gray-900">{item.name}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {item.description && (
            <p className="text-gray-600">{item.description}</p>
          )}

          {/* Modifier Groups */}
          {item.modifierGroups?.map((group) => (
            <div key={group.id}>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="font-semibold text-gray-900">{group.name}</h3>
                {group.required && (
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">
                    Obbligatorio
                  </span>
                )}
                {group.multiSelect && (
                  <span className="text-xs text-gray-500">
                    (max {group.maxSelect})
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {group.modifiers.map((modifier) => (
                  <button
                    key={modifier.id}
                    onClick={() =>
                      toggleModifier(group.id, modifier, group.multiSelect)
                    }
                    className={cn(
                      'w-full flex items-center justify-between p-3 rounded-lg border transition',
                      isModifierSelected(group.id, modifier.id)
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <span className="font-medium">{modifier.name}</span>
                    {modifier.price > 0 && (
                      <span className="text-gray-500">
                        +{formatPrice(priceMultiplier > 1 ? roundUpToTenCents(Math.round(modifier.price * priceMultiplier)) : modifier.price)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Consume Mode */}
          {!hideConsumeModeSelector && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Consumazione</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setConsumeMode(ConsumeMode.DINE_IN)}
                  className={cn(
                    'flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition',
                    consumeMode === ConsumeMode.DINE_IN
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <UtensilsCrossed className="w-5 h-5" />
                  <span className="font-medium">Al tavolo</span>
                </button>
                <button
                  onClick={() => setConsumeMode(ConsumeMode.TAKEAWAY)}
                  className={cn(
                    'flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition',
                    consumeMode === ConsumeMode.TAKEAWAY
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <ShoppingBag className="w-5 h-5" />
                  <span className="font-medium">Da asporto</span>
                </button>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Note (opzionale)</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Es: senza cipolla, poco sale..."
              className="w-full p-3 border border-gray-200 rounded-lg resize-none h-20 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-3 bg-white border rounded-lg">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="p-3 hover:bg-gray-100 rounded-l-lg transition"
              >
                <Minus className="w-5 h-5" />
              </button>
              <span className="w-8 text-center font-semibold">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="p-3 hover:bg-gray-100 rounded-r-lg transition"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={handleAdd}
              className="flex-1 py-3 px-6 bg-primary-500 text-white rounded-lg font-semibold hover:bg-primary-600 transition"
            >
              Aggiungi {formatPrice(calculateTotal())}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
