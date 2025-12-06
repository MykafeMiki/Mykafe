'use client'

import { Plus } from 'lucide-react'
import { useLocale } from 'next-intl'
import { formatPrice } from '@/lib/utils'
import { getTranslatedName, getTranslatedDescription } from '@/lib/translations'
import type { MenuItem, UnavailableIngredient } from '@shared/types'

interface MenuItemCardProps {
  item: MenuItem
  onAdd: (item: MenuItem) => void
  priceMultiplier?: number // es: 1.03 per +3%
}

// Arrotonda ai 10 centesimi per eccesso
function roundUpToTenCents(amount: number): number {
  return Math.ceil(amount / 10) * 10
}

// Helper per ottenere il nome tradotto di un ingrediente non disponibile
function getUnavailableIngredientName(ing: UnavailableIngredient, locale: string): string {
  switch (locale) {
    case 'en': return ing.nameEn || ing.name
    case 'fr': return ing.nameFr || ing.name
    case 'es': return ing.nameEs || ing.name
    case 'he': return ing.nameHe || ing.name
    default: return ing.name
  }
}

// Funzione per mostrare la descrizione con ingredienti non disponibili barrati
function renderDescriptionWithStrikethrough(
  description: string,
  unavailableIngredients: UnavailableIngredient[],
  locale: string
): React.ReactNode {
  if (!unavailableIngredients || unavailableIngredients.length === 0) {
    return description
  }

  // Crea una regex per trovare gli ingredienti non disponibili nella descrizione
  const unavailableNames = unavailableIngredients.map(ing =>
    getUnavailableIngredientName(ing, locale).toLowerCase()
  )

  // Splitta la descrizione e cerca match
  let result: React.ReactNode[] = []
  let remaining = description
  let key = 0

  for (const unavailableName of unavailableNames) {
    const lowerRemaining = remaining.toLowerCase()
    const index = lowerRemaining.indexOf(unavailableName.toLowerCase())

    if (index !== -1) {
      // Testo prima del match
      if (index > 0) {
        result.push(<span key={key++}>{remaining.slice(0, index)}</span>)
      }
      // Testo barrato
      result.push(
        <span key={key++} className="line-through text-gray-400">
          {remaining.slice(index, index + unavailableName.length)}
        </span>
      )
      remaining = remaining.slice(index + unavailableName.length)
    }
  }

  // Aggiungi il resto
  if (remaining) {
    result.push(<span key={key++}>{remaining}</span>)
  }

  return result.length > 0 ? result : description
}

export function MenuItemCard({ item, onAdd, priceMultiplier = 1 }: MenuItemCardProps) {
  const locale = useLocale()
  const displayPrice = priceMultiplier > 1
    ? roundUpToTenCents(Math.round(item.price * priceMultiplier))
    : item.price

  const translatedName = getTranslatedName(item, locale)
  const translatedDescription = getTranslatedDescription(item, locale)

  return (
    <div className="flex gap-3 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
      {item.imageUrl && (
        <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
          <img
            src={item.imageUrl}
            alt={translatedName}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 truncate">{translatedName}</h3>
        {translatedDescription && (
          <p className="text-sm text-gray-500 line-clamp-2 mt-0.5">
            {renderDescriptionWithStrikethrough(
              translatedDescription,
              item.unavailableIngredients || [],
              locale
            )}
          </p>
        )}
        <div className="flex items-center justify-between mt-2">
          <span className="font-bold text-primary-600">
            {formatPrice(displayPrice)}
          </span>
          <button
            onClick={() => onAdd(item)}
            className="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center hover:bg-primary-600 transition"
            aria-label={`Aggiungi ${translatedName}`}
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
