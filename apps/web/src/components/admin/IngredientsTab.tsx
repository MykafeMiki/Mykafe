'use client'

import { useState, useEffect } from 'react'
import { Plus, Loader2, ToggleLeft, ToggleRight, Check, Trash2, Pencil, X, Languages } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { getIngredients, createIngredient, setIngredientStock, deleteIngredient, updateIngredient } from '@/lib/api'
import { isBrokenTranslation } from '@/lib/menuDescription'
import { fetchIngredientSubstitutes, saveIngredientSubstitutes } from '@/lib/ingredientSubstitutes'
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
  const [deleting, setDeleting] = useState<string | null>(null)
  const [editing, setEditing] = useState<Ingredient | null>(null)
  const [editForm, setEditForm] = useState({ name: '', nameEn: '', nameFr: '', nameEs: '', nameHe: '' })
  const [savingEdit, setSavingEdit] = useState(false)
  const [onlyToTranslate, setOnlyToTranslate] = useState(false)

  useEffect(() => {
    loadIngredients()
  }, [])

  const loadIngredients = async () => {
    try {
      const [data, subsRes] = await Promise.all([
        getIngredients(),
        fetchIngredientSubstitutes()
      ])
      setIngredients(data)
      setSubstitutes(subsRes)
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
        nameEn: newIngredientNameEn.trim() || undefined,
        nameFr: newIngredientNameFr.trim() || undefined,
        nameEs: newIngredientNameEs.trim() || undefined,
        nameHe: newIngredientNameHe.trim() || undefined,
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

  const handleDeleteIngredient = async (ingredient: Ingredient) => {
    if (!confirm(`Eliminare definitivamente l'ingrediente "${ingredient.name}"? Verrà rimosso anche dai piatti a cui è collegato.`)) return
    setDeleting(ingredient.id)
    try {
      await deleteIngredient(ingredient.id)
      setIngredients(prev => prev.filter(ing => ing.id !== ingredient.id))
      // Toglie l'ingrediente dai sostituti, sia come esaurito sia come sostituto di altri
      const updated = Object.fromEntries(
        Object.entries(substitutes).filter(([key, sub]) => key !== ingredient.id && sub.id !== ingredient.id)
      )
      if (Object.keys(updated).length !== Object.keys(substitutes).length) {
        try {
          await saveIngredientSubstitutes(updated)
          setSubstitutes(updated)
        } catch (err) {
          console.error('Failed to clean up substitutes:', err)
        }
      }
    } catch (err) {
      console.error('Failed to delete ingredient:', err)
      alert('Errore nell\'eliminazione dell\'ingrediente')
    } finally {
      setDeleting(null)
    }
  }

  const deleteButton = (ingredient: Ingredient) => (
    <button
      onClick={() => handleDeleteIngredient(ingredient)}
      disabled={deleting === ingredient.id}
      title="Elimina ingrediente"
      className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 transition flex-shrink-0"
    >
      {deleting === ingredient.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
    </button>
  )

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
      // Solo se il server conferma: prima un 401 passava inosservato e il
      // modale si chiudeva come se il sostituto fosse stato salvato.
      await saveIngredientSubstitutes(updated)
      setSubstitutes(updated)
      setSubstitutePickerFor(null)
    } catch (err) {
      console.error('Failed to save substitute:', err)
      alert('Errore nel salvataggio del sostituto')
    } finally {
      setSavingSubstitute(false)
    }
  }

  const needsTranslation = (ing: Ingredient) =>
    [ing.nameEn, ing.nameFr, ing.nameEs, ing.nameHe].some(isBrokenTranslation)
  const toTranslateCount = ingredients.filter(needsTranslation).length

  const openEdit = (ing: Ingredient) => {
    setEditing(ing)
    // I valori rovinati ("????") partono vuoti, cosi' si vede cosa va riscritto
    const clean = (v?: string | null) => (isBrokenTranslation(v) ? '' : v || '')
    setEditForm({ name: ing.name, nameEn: clean(ing.nameEn), nameFr: clean(ing.nameFr), nameEs: clean(ing.nameEs), nameHe: clean(ing.nameHe) })
  }

  const handleSaveEdit = async () => {
    if (!editing || !editForm.name.trim()) return
    setSavingEdit(true)
    try {
      const data = {
        name: editForm.name.trim(),
        nameEn: editForm.nameEn.trim(),
        nameFr: editForm.nameFr.trim(),
        nameEs: editForm.nameEs.trim(),
        nameHe: editForm.nameHe.trim(),
      }
      await updateIngredient(editing.id, data)
      setIngredients(prev => prev.map(ing => (ing.id === editing.id ? { ...ing, ...data } : ing)))
      setEditing(null)
    } catch (err) {
      console.error('Failed to update ingredient:', err)
      alert(t('saveError'))
    } finally {
      setSavingEdit(false)
    }
  }

  const editButton = (ingredient: Ingredient) => (
    <button
      onClick={() => openEdit(ingredient)}
      title="Modifica nome e traduzioni"
      className="p-2 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition flex-shrink-0"
    >
      <Pencil className="w-4 h-4" />
    </button>
  )

  const translationBadge = (ingredient: Ingredient) =>
    needsTranslation(ingredient) ? (
      <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 align-middle">da tradurre</span>
    ) : null

  const filteredIngredients = ingredients.filter(ing =>
    ing.name.toLowerCase().includes(searchTerm.toLowerCase()) && (!onlyToTranslate || needsTranslation(ing))
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

      {(toTranslateCount > 0 || onlyToTranslate) && (
        <button
          onClick={() => setOnlyToTranslate(v => !v)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition ${onlyToTranslate
              ? 'bg-amber-500 text-white border-amber-500'
              : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
            }`}
        >
          <Languages className="w-4 h-4" />
          {onlyToTranslate ? 'Mostra tutti gli ingredienti' : `Traduzioni mancanti o da correggere (${toTranslateCount})`}
        </button>
      )}

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
                className="flex items-center justify-between gap-1 p-3 bg-white rounded-lg border border-red-200"
              >
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-gray-900">{ingredient.name}</span>
                  {translationBadge(ingredient)}
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
                {editButton(ingredient)}
                {deleteButton(ingredient)}
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
                {translationBadge(ingredient)}
              </div>
              <div className="flex items-center gap-1">
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
                {editButton(ingredient)}
                {deleteButton(ingredient)}
              </div>
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

      {/* Edit Ingredient Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-bold text-gray-900">Modifica ingrediente</h3>
              <button onClick={() => setEditing(null)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Le traduzioni servono anche per tradurre le descrizioni dei piatti che contengono questo ingrediente.
            </p>
            <div className="space-y-3">
              {([
                ['name', 'Nome (IT) *', 'ltr'],
                ['nameEn', 'Nome (EN)', 'ltr'],
                ['nameFr', 'Nome (FR)', 'ltr'],
                ['nameEs', 'Nome (ES)', 'ltr'],
                ['nameHe', 'Nome (HE)', 'rtl'],
              ] as const).map(([key, label, dir]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input
                    type="text"
                    dir={dir}
                    value={editForm[key]}
                    onChange={(e) => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${key !== 'name' && !editForm[key].trim() ? 'border-amber-400 bg-amber-50' : ''}`}
                    placeholder={key !== 'name' ? 'Da tradurre' : undefined}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setEditing(null)}
                className="flex-1 px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
              >
                Annulla
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={savingEdit || !editForm.name.trim()}
                className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg text-sm hover:bg-primary-600 disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {savingEdit && <Loader2 className="w-4 h-4 animate-spin" />}
                Salva
              </button>
            </div>
          </div>
        </div>
      )}

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
