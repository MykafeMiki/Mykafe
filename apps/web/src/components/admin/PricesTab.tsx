'use client'

import { useState, useEffect } from 'react'
import { DollarSign, Save, Loader2, Check } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { updateMenuItem } from '@/lib/api'
import type { Category, MenuItem } from '@shared/types'

export interface PricesTabProps {
  categories: Category[]
  onUpdate: () => Promise<void>
  t: ReturnType<typeof useTranslations<'admin'>>
  tc: ReturnType<typeof useTranslations<'common'>>
}

type PriceField = 'price' | 'priceTakeaway' | 'priceTakeawayRemote' | 'priceTakeawayCard'

interface PriceEditState {
  [itemId: string]: Record<PriceField, string>
}

// I quattro listini: al tavolo, al banco, takeaway alla consegna, takeaway con carta.
// Solo il prezzo al tavolo e' obbligatorio, gli altri vuoti ricadono sul precedente.
const PRICE_FIELDS: { field: PriceField; labelKey: string; descKey: string; dot: string; ring: string; required?: boolean }[] = [
  { field: 'price', labelKey: 'priceDineIn', descKey: 'priceDineInDesc', dot: 'bg-green-500', ring: 'focus:ring-green-500', required: true },
  { field: 'priceTakeaway', labelKey: 'priceTakeaway', descKey: 'priceTakeawayDesc', dot: 'bg-orange-500', ring: 'focus:ring-orange-500' },
  { field: 'priceTakeawayRemote', labelKey: 'priceTakeawayRemote', descKey: 'priceTakeawayRemoteDesc', dot: 'bg-purple-500', ring: 'focus:ring-purple-500' },
  { field: 'priceTakeawayCard', labelKey: 'priceTakeawayCard', descKey: 'priceTakeawayCardDesc', dot: 'bg-blue-500', ring: 'focus:ring-blue-500' },
]

const toInput = (cents: number | null | undefined) => (cents ? (cents / 100).toFixed(2) : '')
const originalPrices = (item: MenuItem): Record<PriceField, string> => ({
  price: (item.price / 100).toFixed(2),
  priceTakeaway: toInput(item.priceTakeaway),
  priceTakeawayRemote: toInput(item.priceTakeawayRemote),
  priceTakeawayCard: toInput(item.priceTakeawayCard),
})

export function PricesTab({ categories, onUpdate, t, tc }: PricesTabProps) {
  const [editedPrices, setEditedPrices] = useState<PriceEditState>({})
  const [savingItems, setSavingItems] = useState<Set<string>>(new Set())
  const [savedItems, setSavedItems] = useState<Set<string>>(new Set())
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (categories.length > 0) {
      setExpandedCategories(new Set(categories.map(c => c.id)))
    }
  }, [categories])

  const getItemPrices = (item: MenuItem) => editedPrices[item.id] ?? originalPrices(item)

  const handlePriceChange = (item: MenuItem, field: PriceField, value: string) => {
    setEditedPrices(prev => ({
      ...prev,
      [item.id]: { ...getItemPrices(item), ...prev[item.id], [field]: value },
    }))
    setSavedItems(prev => {
      const next = new Set(prev)
      next.delete(item.id)
      return next
    })
  }

  const handleSaveItem = async (item: MenuItem) => {
    const prices = getItemPrices(item)

    setSavingItems(prev => new Set(prev).add(item.id))

    try {
      const optional = (v: string) => (v ? parseFloat(v) : null)

      await updateMenuItem(item.id, {
        price: parseFloat(prices.price),
        priceTakeaway: optional(prices.priceTakeaway),
        priceTakeawayRemote: optional(prices.priceTakeawayRemote),
        priceTakeawayCard: optional(prices.priceTakeawayCard),
      })

      setSavedItems(prev => new Set(prev).add(item.id))

      setEditedPrices(prev => {
        const next = { ...prev }
        delete next[item.id]
        return next
      })

      await onUpdate()

      setTimeout(() => {
        setSavedItems(prev => {
          const next = new Set(prev)
          next.delete(item.id)
          return next
        })
      }, 2000)
    } catch (err) {
      console.error('Failed to save prices:', err)
      alert(t('saveError'))
    } finally {
      setSavingItems(prev => {
        const next = new Set(prev)
        next.delete(item.id)
        return next
      })
    }
  }

  const hasChanges = (item: MenuItem) => {
    const current = getItemPrices(item)
    const original = originalPrices(item)
    return PRICE_FIELDS.some(({ field }) => current[field] !== original[field])
  }

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(categoryId)) {
        next.delete(categoryId)
      } else {
        next.add(categoryId)
      }
      return next
    })
  }

  const priceInput = (item: MenuItem, { field, ring, required }: (typeof PRICE_FIELDS)[number]) => (
    <div className="relative">
      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">€</span>
      <input
        type="number"
        step="0.01"
        min="0"
        value={getItemPrices(item)[field]}
        onChange={(e) => handlePriceChange(item, field, e.target.value)}
        placeholder={required ? undefined : '-'}
        className={`w-full pl-6 pr-2 py-2 text-sm border rounded-lg focus:ring-2 ${ring} focus:border-transparent`}
      />
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="w-6 h-6" />
            {t('pricesTitle')}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('pricesDescription')}
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="font-semibold text-blue-800 mb-3">{t('priceTypes')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          {PRICE_FIELDS.map(({ field, labelKey, descKey, dot }) => (
            <div key={field} className="flex items-start gap-2">
              <div className={`w-3 h-3 ${dot} rounded-full mt-1 flex-shrink-0`} />
              <div>
                <span className="font-medium text-gray-800">{t(labelKey)}</span>
                <p className="text-gray-500 text-xs">{t(descKey)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Categories and Items */}
      {categories.map((category) => (
        <div key={category.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
          <button
            onClick={() => toggleCategory(category.id)}
            className="w-full bg-gray-50 px-4 py-3 border-b flex items-center justify-between hover:bg-gray-100 transition"
          >
            <div className="flex items-center gap-3">
              {category.imageUrl && (
                <img
                  src={category.imageUrl}
                  alt={category.name}
                  className="w-8 h-8 rounded-lg object-cover"
                />
              )}
              <h3 className="font-semibold text-gray-900">{category.name}</h3>
              <span className="text-sm text-gray-500">
                ({category.items?.length || 0} {t('items')})
              </span>
            </div>
            <span className={`transition-transform ${expandedCategories.has(category.id) ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>

          {expandedCategories.has(category.id) && (
            <div className="divide-y">
              {/* Header Row */}
              <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2 bg-gray-100 text-xs font-medium text-gray-600">
                <div className="col-span-3">{t('itemName')}</div>
                {PRICE_FIELDS.map(({ field, labelKey, dot }) => (
                  <div key={field} className="col-span-2 text-center">
                    <span className="flex items-center justify-center gap-1">
                      <span className={`w-2 h-2 ${dot} rounded-full flex-shrink-0`} />
                      {t(labelKey)}
                    </span>
                  </div>
                ))}
                <div className="col-span-1"></div>
              </div>

              {category.items?.map((item) => {
                const isSaving = savingItems.has(item.id)
                const isSaved = savedItems.has(item.id)
                const itemHasChanges = hasChanges(item)

                return (
                  <div
                    key={item.id}
                    className="p-4 hover:bg-gray-50 transition"
                  >
                    {/* Mobile Layout */}
                    <div className="md:hidden space-y-3">
                      <div className="flex items-center gap-2">
                        {item.imageUrl && (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        )}
                        <span className="font-medium text-gray-900">{item.name}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {PRICE_FIELDS.map((cfg) => (
                          <div key={cfg.field}>
                            <label className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                              <span className={`w-2 h-2 ${cfg.dot} rounded-full flex-shrink-0`} />
                              {t(cfg.labelKey)}
                            </label>
                            {priceInput(item, cfg)}
                          </div>
                        ))}
                      </div>

                      {itemHasChanges && (
                        <button
                          onClick={() => handleSaveItem(item)}
                          disabled={isSaving}
                          className="w-full py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {isSaving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                          {tc('save')}
                        </button>
                      )}

                      {isSaved && (
                        <div className="flex items-center justify-center gap-2 text-green-600 text-sm">
                          <Check className="w-4 h-4" />
                          {t('saved')}
                        </div>
                      )}
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden md:grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-3 flex items-center gap-2">
                        {item.imageUrl && (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        )}
                        <span className="font-medium text-gray-900">{item.name}</span>
                      </div>

                      {PRICE_FIELDS.map((cfg) => (
                        <div key={cfg.field} className="col-span-2">
                          {priceInput(item, cfg)}
                        </div>
                      ))}

                      <div className="col-span-1 flex items-center justify-end gap-1">
                        {isSaved && <Check className="w-4 h-4 text-green-600" />}
                        {itemHasChanges && (
                          <button
                            onClick={() => handleSaveItem(item)}
                            disabled={isSaving}
                            title={tc('save')}
                            aria-label={tc('save')}
                            className="p-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
                          >
                            {isSaving ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

              {(!category.items || category.items.length === 0) && (
                <div className="p-8 text-center text-gray-500">
                  {t('noItems')}
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Info Box */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
        <p className="text-sm">
          {t('pricesInfo')}
        </p>
      </div>
    </div>
  )
}
