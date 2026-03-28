'use client'

import { useState, useEffect } from 'react'
import { Plus, Loader2, ToggleLeft, ToggleRight, Check } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { getIngredients, createIngredient, setIngredientStock } from '@/lib/api'
import { getIngredientSubstitutes } from '@/lib/ingredientSubstitutes'
import type { Ingredient } from '@shared/types'

export interface IngredientsTabProps {
  t: ReturnType<typeof useTranslations<'admin'>>
  tc: ReturnType<typeof useTranslations<'common'>>
}

export function IngredientsTab({ t, tc }: IngredientsTabProps) {
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [substitutes, setSubstitutes] = useState<Record<string, { id: string; name: string; nameEn?: string; nameFr?: string; nameEs?: string; nameHe?: string }>>({})
  const [substitutePickerFor, setSubstitutePickerFor] = useState<Ingredient | null>(null)
  const [selectedSubstituteId, setSelectedSubstituteId] = useState<string>('')
  const [savingSubstitute, setSavingSubstitute] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newIngredientName, setNewIngredientName] = useState('')
  const [newIngredientNameEn, setNewIngredientNameEn] = useState('')
  const [newIngredientNameFr, setNewIngredientNameFr] = useState('')
  const [newIngredientNameEs, setNewIngredientNameEs] = useState('')
  const [newIngredientNameHe, setNewIngredientNameHe] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    loadIngredients()
  }, [])

  const loadIngredients = async () => {
    try {
      const [data, subsRes] = await Promise.all([
        getIngredients(),
        fetch('/api/settings/substitutes').then(r => r.json()).catch(() => ({}))
      ])
      setIngredients(data)
      setSubstitutes(subsRes || {})
    } catch (err) {
      console.error('Failed to load ingredients:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateIngredient = async () => {
    if (!newIngredientName.trim()) return
    setCreating(true)
    try {
      const newIng = await createIngredient({
        name: newIngredientName.trim(),
        nameEn: newIngredientNameEn.trim() || newIngredientName.trim(),
        nameFr: newIngredientNameFr.trim() || newIngredientName.trim(),
        nameEs: newIngredientNameEs.trim() || newIngredientName.trim(),
        nameHe: newIngredientNameHe.trim() || newIngredientName.trim(),
      })
      setIngredients(prev => [...prev, newIng])
      setNewIngredientName('')
      setNewIngredientNameEn('')
      setNewIngredientNameFr('')
      setNewIngredientNameEs('')
      setNewIngredientNameHe('')
      setShowAddForm(false)
    } catch (err) {
      console.error('Failed to create ingredient:', err)
      alert('Errore nella creazione dell\'ingrediente')
    } finally {
      setCreating(false)
    }
  }

  const handleToggleStock = async (ingredient: Ingredient) => {
    setToggling(ingredient.id)
    try {
      await setIngredientStock(ingredient.id, !ingredient.inStock)
      setIngredients(prev =>
        prev.map(ing =>
          ing.id === ingredient.id
            ? { ...ing, inStock: !ing.inStock }
            : ing
        )
      )
      if (ingredient.inStock) {
        setSelectedSubstituteId(substitutes[ingredient.id]?.id || '')
        setSubstitutePickerFor(ingredient)
      }
    } catch (err) {
      console.error('Failed to toggle ingredient stock:', err)
      alert(t('saveError'))
    } finally {
      setToggling(null)
    }
  }

  const handleSaveSubstitute = async () => {
    if (!substitutePickerFor) return
    setSavingSubstitute(true)
    try {
      const updated = { ...substitutes }
      if (selectedSubstituteId) {
        const subIng = ingredients.find(i => i.id === selectedSubstituteId)
        if (subIng) {
          updated[substitutePickerFor.id] = {
            id: subIng.id,
            name: subIng.name,
            nameEn: subIng.nameEn,
            nameFr: subIng.nameFr,
            nameEs: subIng.nameEs,
            nameHe: subIng.nameHe
          }
        }
      } else {
        delete updated[substitutePickerFor.id]
      }
      await fetch('/api/settings/substitutes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      })
      setSubstitutes(updated)
      setSubstitutePickerFor(null)
    } catch (err) {
      console.error('Failed to save substitute:', err)
      alert('Errore nel salvataggio del sostituto')
    } finally {
      setSavingSubstitute(false)
    }
  }

  const filteredIngredients = ingredients.filter(ing =>
    ing.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const outOfStock = filteredIngredients.filter(ing => !ing.inStock)
  const inStock = filteredIngredients.filter(ing => ing.inStock)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">{t('ingredientsManagement')}</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
        >
          <Plus className="w-4 h-4" />
          Aggiungi Ingrediente
        </button>
      </div>

      {/* Add Ingredient Form */}
      {showAddForm && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <h3 className="font-semibold text-green-800 mb-3">Nuovo Ingrediente</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome (IT) *
              </label>
              <input
                type="text"
                value={newIngredientName}
                onChange={(e) => setNewIngredientName(e.target.value)}
                placeholder="es. Pomodoro"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome (EN)
              </label>
              <input
                type="text"
                value={newIngredientNameEn}
                onChange={(e) => setNewIngredientNameEn(e.target.value)}
                placeholder="es. Tomato"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome (FR)
              </label>
              <input
                type="text"
                value={newIngredientNameFr}
                onChange={(e) => setNewIngredientNameFr(e.target.value)}
                placeholder="es. Tomate"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome (ES)
              </label>
              <input
                type="text"
                value={newIngredientNameEs}
                onChange={(e) => setNewIngredientNameEs(e.target.value)}
                placeholder="es. Tomate"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome (HE)
              </label>
              <input
                type="text"
                value={newIngredientNameHe}
                onChange={(e) => setNewIngredientNameHe(e.target.value)}
                placeholder="es. עגבניה"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreateIngredient}
              disabled={!newIngredientName.trim() || creating}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Crea Ingrediente
            </button>
            <button
              onClick={() => {
                setShowAddForm(false)
                setNewIngredientName('')
                setNewIngredientNameEn('')
                setNewIngredientNameFr('')
                setNewIngredientNameEs('')
                setNewIngredientNameHe('')
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder={t('searchIngredients')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      {/* Out of Stock Section */}
      {outOfStock.length > 0 && (
        <div className="bg-red-50 rounded-xl p-4 border-2 border-red-200">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <h3 className="font-semibold text-red-800">
              {t('outOfStock')} ({outOfStock.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {outOfStock.map((ingredient) => (
              <div
                key={ingredient.id}
                className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-200"
              >
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-gray-900">{ingredient.name}</span>
                  {substitutes[ingredient.id] && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      → {substitutes[ingredient.id].name}
                      <button
                        onClick={() => {
                          setSelectedSubstituteId(substitutes[ingredient.id]?.id || '')
                          setSubstitutePickerFor(ingredient)
                        }}
                        className="ml-1 text-primary-500 hover:underline"
                      >
                        modifica
                      </button>
                    </p>
                  )}
                  {!substitutes[ingredient.id] && (
                    <button
                      onClick={() => {
                        setSelectedSubstituteId('')
                        setSubstitutePickerFor(ingredient)
                      }}
                      className="text-xs text-primary-500 hover:underline mt-0.5 block"
                    >
                      + aggiungi sostituto
                    </button>
                  )}
                </div>
                <button
                  onClick={() => handleToggleStock(ingredient)}
                  disabled={toggling === ingredient.id}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition flex-shrink-0 ${toggling === ingredient.id
                      ? 'opacity-50'
                      : 'bg-green-500 text-white hover:bg-green-600'
                    }`}
                >
                  {toggling === ingredient.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ToggleLeft className="w-4 h-4" />
                  )}
                  <span className="text-sm">{t('markAvailable')}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* In Stock Section */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b">
          <h3 className="font-semibold text-gray-900">
            {t('availableIngredients')} ({inStock.length})
          </h3>
        </div>
        <div className="divide-y max-h-96 overflow-y-auto">
          {inStock.map((ingredient) => (
            <div
              key={ingredient.id}
              className="flex items-center justify-between p-4 hover:bg-gray-50 transition"
            >
              <div>
                <span className="font-medium text-gray-900">{ingredient.name}</span>
              </div>
              <button
                onClick={() => handleToggleStock(ingredient)}
                disabled={toggling === ingredient.id}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition ${toggling === ingredient.id
                    ? 'opacity-50'
                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                  }`}
              >
                {toggling === ingredient.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ToggleRight className="w-4 h-4" />
                )}
                <span className="text-sm">{t('markUnavailable')}</span>
              </button>
            </div>
          ))}

          {inStock.length === 0 && outOfStock.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              {t('noIngredients')}
            </div>
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-800">
        <p className="text-sm">
          {t('ingredientsInfo')}
        </p>
      </div>

      {/* Substitute Picker Modal */}
      {substitutePickerFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Ingrediente esaurito</h3>
            <p className="text-gray-600 text-sm mb-4">
              <strong>{substitutePickerFor.name}</strong> è stato segnato come esaurito.
              Vuoi mostrare un ingrediente sostituto nella descrizione dei piatti?
            </p>
            <select
              value={selectedSubstituteId}
              onChange={(e) => setSelectedSubstituteId(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm mb-4 focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Nessun sostituto</option>
              {ingredients
                .filter(i => i.id !== substitutePickerFor.id)
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(i => (
                  <option key={i.id} value={i.id}>
                    {i.name}{!i.inStock ? ' (esaurito)' : ''}
                  </option>
                ))}
            </select>
            <div className="flex gap-3">
              <button
                onClick={() => setSubstitutePickerFor(null)}
                className="flex-1 px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
              >
                Salta
              </button>
              <button
                onClick={handleSaveSubstitute}
                disabled={savingSubstitute}
                className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg text-sm hover:bg-primary-600 disabled:opacity-50 transition"
              >
                {savingSubstitute ? 'Salvataggio...' : 'Salva sostituto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
