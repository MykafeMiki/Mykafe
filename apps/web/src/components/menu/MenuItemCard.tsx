'use client'

import { Plus } from 'lucide-react'
import { useLocale } from 'next-intl'
import { formatPrice, getItemPrice, type PriceContext } from '@/lib/utils'
import { getTranslatedName, getTranslatedDescription } from '@/lib/translations'
import type { MenuItem, UnavailableIngredient } from '@shared/types'

interface MenuItemCardProps {
  item: MenuItem
  onAdd: (item: MenuItem) => void
  priceMultiplier?: number // es: 1.03 per +3%
  priceContext?: PriceContext // contesto prezzo: dine-in, takeaway-counter, takeaway-remote
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

// Funzione per rimuovere gli ingredienti non disponibili dalla descrizione
function removeUnavailableIngredients(
  description: string,
  unavailableIngredients: UnavailableIngredient[],
  locale: string
): string {
  if (!unavailableIngredients || unavailableIngredients.length === 0) {
    return description
  }

  // Splitta la descrizione per virgole
  const parts = description.split(',').map(p => p.trim())

  // Ottieni i nomi degli ingredienti non disponibili (in minuscolo per confronto)
  const unavailableNames = unavailableIngredients.map(ing =>
    getUnavailableIngredientName(ing, locale).toLowerCase()
  )

  // Filtra le parti che non contengono ingredienti non disponibili
  const filteredParts = parts.filter(part => {
    const partLower = part.toLowerCase()
    return !unavailableNames.some(name => partLower.includes(name))
  })

  return filteredParts.join(', ')
}

export function MenuItemCard({ item, onAdd, priceMultiplier = 1, priceContext = 'dine-in' }: MenuItemCardProps) {
  const locale = useLocale()
  const basePrice = getItemPrice(item, priceContext)
  const displayPrice = priceMultiplier > 1
    ? roundUpToTenCents(Math.round(basePrice * priceMultiplier))
    : basePrice


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
            {removeUnavailableIngredients(
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
