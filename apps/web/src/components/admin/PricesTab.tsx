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

interface PriceEditState {
  [itemId: string]: {
    price: string
    priceTakeaway: string
    priceTakeawayRemote: string
  }
}

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

  const getItemPrices = (item: MenuItem) => {
    if (editedPrices[item.id]) {
      return editedPrices[item.id]
    }
    return {
      price: (item.price / 100).toFixed(2),
      priceTakeaway: item.priceTakeaway ? (item.priceTakeaway / 100).toFixed(2) : '',
      priceTakeawayRemote: item.priceTakeawayRemote ? (item.priceTakeawayRemote / 100).toFixed(2) : '',
    }
  }

  const handlePriceChange = (itemId: string, field: 'price' | 'priceTakeaway' | 'priceTakeawayRemote', value: string) => {
    setEditedPrices(prev => ({
      ...prev,
      [itemId]: {
        ...getItemPrices(categories.flatMap(c => c.items || []).find(i => i.id === itemId)!),
        ...prev[itemId],
        [field]: value,
      },
    }))
    setSavedItems(prev => {
      const next = new Set(prev)
      next.delete(itemId)
      return next
    })
  }

  const handleSaveItem = async (item: MenuItem) => {
    const prices = getItemPrices(item)

    setSavingItems(prev => new Set(prev).add(item.id))

    try {
      const priceValue = parseFloat(prices.price)
      const priceTakeawayValue = prices.priceTakeaway ? parseFloat(prices.priceTakeaway) : null
      const priceTakeawayRemoteValue = prices.priceTakeawayRemote ? parseFloat(prices.priceTakeawayRemote) : null

      await updateMenuItem(item.id, {
        price: priceValue,
        priceTakeaway: priceTakeawayValue,
        priceTakeawayRemote: priceTakeawayRemoteValue,
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
    const currentPrices = getItemPrices(item)
    const originalPrice = (item.price / 100).toFixed(2)
    const originalTakeaway = item.priceTakeaway ? (item.priceTakeaway / 100).toFixed(2) : ''
    const originalRemote = item.priceTakeawayRemote ? (item.priceTakeawayRemote / 100).toFixed(2) : ''

    return currentPrices.price !== originalPrice ||
      currentPrices.priceTakeaway !== originalTakeaway ||
      currentPrices.priceTakeawayRemote !== originalRemote
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-start gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full mt-1 flex-shrink-0" />
            <div>
              <span className="font-medium text-gray-800">{t('priceDineIn')}</span>
              <p className="text-gray-500 text-xs">{t('priceDineInDesc')}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-3 h-3 bg-orange-500 rounded-full mt-1 flex-shrink-0" />
            <div>
              <span className="font-medium text-gray-800">{t('priceTakeaway')}</span>
              <p className="text-gray-500 text-xs">{t('priceTakeawayDesc')}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-3 h-3 bg-purple-500 rounded-full mt-1 flex-shrink-0" />
            <div>
              <span className="font-medium text-gray-800">{t('priceTakeawayRemote')}</span>
              <p className="text-gray-500 text-xs">{t('priceTakeawayRemoteDesc')}</p>
            </div>
          </div>
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
                <div className="col-span-4">{t('itemName')}</div>
                <div className="col-span-2 text-center">
                  <span className="flex items-center justify-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full" />
                    {t('priceDineIn')}
                  </span>
                </div>
                <div className="col-span-2 text-center">
                  <span className="flex items-center justify-center gap-1">
                    <span className="w-2 h-2 bg-orange-500 rounded-full" />
                    {t('priceTakeaway')}
                  </span>
                </div>
                <div className="col-span-2 text-center">
                  <span className="flex items-center justify-center gap-1">
                    <span className="w-2 h-2 bg-purple-500 rounded-full" />
                    {t('priceTakeawayRemote')}
                  </span>
                </div>
                <div className="col-span-2"></div>
              </div>

              {category.items?.map((item) => {
                const prices = getItemPrices(item)
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

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                            <span className="w-2 h-2 bg-green-500 rounded-full" />
                            {t('priceDineIn')}
                          </label>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={prices.price}
                              onChange={(e) => handlePriceChange(item.id, 'price', e.target.value)}
                              className="w-full pl-6 pr-2 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                            <span className="w-2 h-2 bg-orange-500 rounded-full" />
                            {t('priceTakeaway')}
                          </label>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={prices.priceTakeaway}
                              onChange={(e) => handlePriceChange(item.id, 'priceTakeaway', e.target.value)}
                              placeholder="-"
                              className="w-full pl-6 pr-2 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                            <span className="w-2 h-2 bg-purple-500 rounded-full" />
                            {t('priceTakeawayRemote')}
                          </label>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={prices.priceTakeawayRemote}
                              onChange={(e) => handlePriceChange(item.id, 'priceTakeawayRemote', e.target.value)}
                              placeholder="-"
                              className="w-full pl-6 pr-2 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                          </div>
                        </div>
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
                      <div className="col-span-4 flex items-center gap-2">
                        {item.imageUrl && (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        )}
                        <span className="font-medium text-gray-900">{item.name}</span>
                      </div>

                      <div className="col-span-2">
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={prices.price}
                            onChange={(e) => handlePriceChange(item.id, 'price', e.target.value)}
                            className="w-full pl-6 pr-2 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          />
                        </div>
                      </div>

                      <div className="col-span-2">
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={prices.priceTakeaway}
                            onChange={(e) => handlePriceChange(item.id, 'priceTakeaway', e.target.value)}
                            placeholder="-"
                            className="w-full pl-6 pr-2 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          />
                        </div>
                      </div>

                      <div className="col-span-2">
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={prices.priceTakeawayRemote}
                            onChange={(e) => handlePriceChange(item.id, 'priceTakeawayRemote', e.target.value)}
                            placeholder="-"
                            className="w-full pl-6 pr-2 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                        </div>
                      </div>

                      <div className="col-span-2 flex items-center justify-end gap-2">
                        {isSaved && (
                          <span className="text-green-600 text-sm flex items-center gap-1">
                            <Check className="w-4 h-4" />
                          </span>
                        )}
                        {itemHasChanges && (
                          <button
                            onClick={() => handleSaveItem(item)}
                            disabled={isSaving}
                            className="px-3 py-1.5 bg-primary-500 text-white text-sm rounded-lg hover:bg-primary-600 disabled:opacity-50 flex items-center gap-1"
                          >
                            {isSaving ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4" />
                            )}
                            {tc('save')}
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
