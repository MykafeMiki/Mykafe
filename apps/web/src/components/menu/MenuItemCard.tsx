'use client'

import { Plus } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import type { MenuItem } from '@shared/types'

interface MenuItemCardProps {
  item: MenuItem
  onAdd: (item: MenuItem) => void
  priceMultiplier?: number // es: 1.03 per +3%
}

// Arrotonda ai 10 centesimi per eccesso
function roundUpToTenCents(amount: number): number {
  return Math.ceil(amount / 10) * 10
}

export function MenuItemCard({ item, onAdd, priceMultiplier = 1 }: MenuItemCardProps) {
  const displayPrice = priceMultiplier > 1
    ? roundUpToTenCents(Math.round(item.price * priceMultiplier))
    : item.price

  return (
    <div className="flex gap-3 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
      {item.imageUrl && (
        <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 truncate">{item.name}</h3>
        {item.description && (
          <p className="text-sm text-gray-500 line-clamp-2 mt-0.5">
            {item.description}
          </p>
        )}
        <div className="flex items-center justify-between mt-2">
          <span className="font-bold text-primary-600">
            {formatPrice(displayPrice)}
          </span>
          <button
            onClick={() => onAdd(item)}
            className="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center hover:bg-primary-600 transition"
            aria-label={`Aggiungi ${item.name}`}
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
