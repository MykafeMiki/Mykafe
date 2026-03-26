'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Upload, Loader2, Image as ImageIcon, Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { uploadItemImage, updateMenuItem, createMenuItem, getIngredients, createIngredient, setMenuItemIngredients, getMenuItemIngredients } from '@/lib/api'
import { getIngredientSubstitutes, setIngredientSubstitute } from '@/lib/ingredientSubstitutes'
import type { Category, MenuItem, Ingredient } from '@shared/types'

export interface AdminItemModalProps {
  item: MenuItem | null
  categoryId: string
  categories: Category[]
  onClose: () => void
  onSave: () => Promise<void>
  t: ReturnType<typeof useTranslations<'admin'>>
  tc: ReturnType<typeof useTranslations<'common'>>
}

export function AdminItemModal({ item, categoryId, categories, onClose, onSave, t, tc }: AdminItemModalProps) {
  const [name, setName] = useState(item?.name || '')
  const [description, setDescription] = useState(item?.description || '')
  const [price, setPrice] = useState(item ? (item.price / 100).toFixed(2) : '')
  const [imageUrl, setImageUrl] = useState(item?.imageUrl || '')
  const [selectedCategory, setSelectedCategory] = useState(categoryId)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Ingredients state
  const [allIngredients, setAllIngredients] = useState<Ingredient[]>([])
  const [selectedIngredients, setSelectedIngredients] = useState<{ id: string; substituteId?: string }[]>([])
  const [loadingIngredients, setLoadingIngredients] = useState(false)
  const [showNewIngredient, setShowNewIngredient] = useState(false)
  const [newIngName, setNewIngName] = useState('')
  const [newIngNameEn, setNewIngNameEn] = useState('')
  const [newIngNameFr, setNewIngNameFr] = useState('')
  const [newIngNameEs, setNewIngNameEs] = useState('')
  const [newIngNameHe, setNewIngNameHe] = useState('')
  const [creatingIngredient, setCreatingIngredient] = useState(false)

  // Load ingredients on mount
  useEffect(() => {
    async function loadIngredients() {
      setLoadingIngredients(true)
      try {
        const data = await getIngredients()
        setAllIngredients(data)

        // If editing, load current item's ingredients
        if (item) {
          try {
            const itemIngredients = await getMenuItemIngredients(item.id)
            const subsMap = getIngredientSubstitutes()
            setSelectedIngredients(itemIngredients.map(i => ({
              id: i.ingredientId,
              substituteId: subsMap[i.ingredientId]?.id
            })))
          } catch (err) {
            console.error('Failed to load item ingredients:', err)
          }
        }
      } catch (err) {
        console.error('Failed to load ingredients:', err)
      } finally {
        setLoadingIngredients(false)
      }
    }
    loadIngredients()
  }, [item])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const result = await uploadItemImage(file)
      setImageUrl(result.url)
    } catch (err) {
      console.error('Failed to upload image:', err)
      alert(t('saveError'))
    } finally {
      setUploading(false)
    }
  }

  const handleIngredientToggle = (ingredientId: string) => {
    setSelectedIngredients(prev => {
      const existing = prev.find(i => i.id === ingredientId)
      if (existing) {
        return prev.filter(i => i.id !== ingredientId)
      }
      return [...prev, { id: ingredientId }]
    })
  }

  const handleCreateIngredient = async () => {
    if (!newIngName.trim()) return
    setCreatingIngredient(true)
    try {
      const newIng = await createIngredient({
        name: newIngName.trim(),
        nameEn: newIngNameEn.trim() || undefined,
        nameFr: newIngNameFr.trim() || undefined,
        nameEs: newIngNameEs.trim() || undefined,
        nameHe: newIngNameHe.trim() || undefined,
      })
      setAllIngredients(prev => [...prev, newIng])
      setSelectedIngredients(prev => [...prev, { id: newIng.id }])
      setNewIngName('')
      setNewIngNameEn('')
      setNewIngNameFr('')
      setNewIngNameEs('')
      setNewIngNameHe('')
      setShowNewIngredient(false)
    } catch (err) {
      console.error('Failed to create ingredient:', err)
      alert(t('saveError'))
    } finally {
      setCreatingIngredient(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !price) return

    setSaving(true)
    try {
      const priceInCents = Math.round(parseFloat(price) * 100)
      let savedItemId = item?.id

      if (item) {
        await updateMenuItem(item.id, { name, description, price: priceInCents / 100, imageUrl })
      } else {
        const newItem = await createMenuItem({
          name,
          description,
          price: priceInCents / 100,
          categoryId: selectedCategory,
          imageUrl
        })
        savedItemId = newItem.id
      }

      // Save ingredients if we have a valid item ID
      if (savedItemId) {
        try {
          await setMenuItemIngredients(savedItemId, selectedIngredients.map(i => ({ id: i.id })))
        } catch (err) {
          console.error('Failed to save ingredients:', err)
        }
      }

      await onSave()
    } catch (err) {
      console.error('Failed to save item:', err)
      alert(t('saveError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold">
            {item ? t('editDish') : t('newDish')}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('image')}
            </label>
            <div className="flex items-center gap-4">
              {imageUrl ? (
                <img src={imageUrl} alt="Preview" className="w-20 h-20 rounded-lg object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-gray-300" />
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {uploading ? t('uploading') : t('upload')}
              </button>
            </div>
          </div>

          {/* Category (only for new items) */}
          {!item && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('category')} *
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {tc('name')} *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('description')}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {tc('price')} (€) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          {/* Ingredients */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('ingredients')}
            </label>

            {loadingIngredients ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{tc('loading')}</span>
              </div>
            ) : (
              <>
                {allIngredients.length === 0 ? (
                  <p className="text-sm text-gray-500 mb-2">{t('noIngredients')}</p>
                ) : (
                  <>
                    <div className="max-h-48 overflow-y-auto border rounded-lg p-2 mb-2 space-y-1">
                      {allIngredients.map((ing) => {
                        const selected = selectedIngredients.find(i => i.id === ing.id)
                        return (
                          <div
                            key={ing.id}
                            className={`flex items-center gap-2 p-2 rounded transition ${selected ? 'bg-primary-50 border border-primary-200' : 'hover:bg-gray-50'
                              }`}
                          >
                            <input
                              type="checkbox"
                              checked={!!selected}
                              onChange={() => handleIngredientToggle(ing.id)}
                              className="w-4 h-4 text-primary-500 rounded focus:ring-primary-500"
                            />
                            <span className="text-sm flex-1">{ing.name}</span>
                            {selected && (
                              <select
                                value={selected.substituteId || ''}
                                onChange={(e) => {
                                  const subId = e.target.value
                                  const subIng = allIngredients.find(i => i.id === subId)
                                  setSelectedIngredients(prev => prev.map(i =>
                                    i.id === ing.id ? { ...i, substituteId: subId || undefined } : i
                                  ))
                                  if (subIng) {
                                    setIngredientSubstitute(ing.id, { id: subIng.id, name: subIng.name, nameEn: subIng.nameEn, nameFr: subIng.nameFr, nameEs: subIng.nameEs, nameHe: subIng.nameHe })
                                  } else {
                                    setIngredientSubstitute(ing.id, null)
                                  }
                                }}
                                className="text-xs border rounded px-1 py-0.5 bg-white text-gray-600 max-w-[110px]"
                              >
                                <option value="">Nessun sub.</option>
                                {allIngredients.filter(i => i.id !== ing.id).map(i => (
                                  <option key={i.id} value={i.id}>{i.name}</option>
                                ))}
                              </select>
                            )}

                            {!ing.inStock && (
                              <span className="text-xs text-red-500">({tc('unavailable')})</span>
                            )}
                          </div>
                        )
                      })}
                    </div>

                  </>
                )}

                {/* Add new ingredient button/form */}
                {!showNewIngredient ? (
                  <button
                    type="button"
                    onClick={() => setShowNewIngredient(true)}
                    className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
                  >
                    <Plus className="w-4 h-4" />
                    {t('addNewIngredient')}
                  </button>
                ) : (
                  <div className="border rounded-lg p-3 space-y-3 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{t('addNewIngredient')}</span>
                      <button
                        type="button"
                        onClick={() => setShowNewIngredient(false)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        {t('ingredientName')} (IT) *
                      </label>
                      <input
                        type="text"
                        value={newIngName}
                        onChange={(e) => setNewIngName(e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border rounded focus:ring-1 focus:ring-primary-500"
                        placeholder="es: Mozzarella"
                      />
                    </div>

                    <div className="text-xs font-medium text-gray-500 pt-1">
                      {t('translations')}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          {t('translationEn')}
                        </label>
                        <input
                          type="text"
                          value={newIngNameEn}
                          onChange={(e) => setNewIngNameEn(e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border rounded focus:ring-1 focus:ring-primary-500"
                          placeholder="Mozzarella"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          {t('translationFr')}
                        </label>
                        <input
                          type="text"
                          value={newIngNameFr}
                          onChange={(e) => setNewIngNameFr(e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border rounded focus:ring-1 focus:ring-primary-500"
                          placeholder="Mozzarella"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          {t('translationEs')}
                        </label>
                        <input
                          type="text"
                          value={newIngNameEs}
                          onChange={(e) => setNewIngNameEs(e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border rounded focus:ring-1 focus:ring-primary-500"
                          placeholder="Mozzarella"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          {t('translationHe')}
                        </label>
                        <input
                          type="text"
                          value={newIngNameHe}
                          onChange={(e) => setNewIngNameHe(e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border rounded focus:ring-1 focus:ring-primary-500"
                          placeholder="מוצרלה"
                          dir="rtl"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleCreateIngredient}
                      disabled={creatingIngredient || !newIngName.trim()}
                      className="w-full py-1.5 text-sm bg-primary-500 text-white rounded hover:bg-primary-600 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {creatingIngredient && <Loader2 className="w-3 h-3 animate-spin" />}
                      {t('createIngredient')}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border rounded-lg hover:bg-gray-50"
            >
              {tc('cancel')}
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim() || !price}
              className="flex-1 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {item ? tc('save') : tc('create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
