'use client'

import { useState } from 'react'
import { Search, Check, Plus, Loader2 } from 'lucide-react'
import type { Ingredient } from '@shared/types'

interface ImprovedIngredientsSelectorProps {
  allIngredients: Ingredient[]
  selectedIngredients: { id: string; isPrimary: boolean }[]
  onSelectionChange: (ingredients: { id: string; isPrimary: boolean }[]) => void
  onCreateIngredient: (name: string) => Promise<Ingredient>
  loading: boolean
}

export function ImprovedIngredientsSelector({
  allIngredients,
  selectedIngredients,
  onSelectionChange,
  onCreateIngredient,
  loading
}: ImprovedIngredientsSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [newIngredientName, setNewIngredientName] = useState('')
  const [creating, setCreating] = useState(false)

  // Filtra ingredienti per ricerca
  const filteredIngredients = allIngredients.filter(ing =>
    ing.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Separa ingredienti selezionati e non selezionati
  const selected = filteredIngredients.filter(ing =>
    selectedIngredients.some(s => s.id === ing.id)
  )
  const notSelected = filteredIngredients.filter(ing =>
    !selectedIngredients.some(s => s.id === ing.id)
  )

  const handleToggle = (ingredientId: string) => {
    const existing = selectedIngredients.find(i => i.id === ingredientId)
    if (existing) {
      onSelectionChange(selectedIngredients.filter(i => i.id !== ingredientId))
    } else {
      onSelectionChange([...selectedIngredients, { id: ingredientId, isPrimary: false }])
    }
  }

  const handleTogglePrimary = (ingredientId: string) => {
    onSelectionChange(
      selectedIngredients.map(i =>
        i.id === ingredientId ? { ...i, isPrimary: !i.isPrimary } : i
      )
    )
  }

  const handleQuickAdd = async () => {
    if (!newIngredientName.trim()) return

    setCreating(true)
    try {
      const newIng = await onCreateIngredient(newIngredientName.trim())
      // Aggiungi automaticamente come secondario
      onSelectionChange([...selectedIngredients, { id: newIng.id, isPrimary: false }])
      setNewIngredientName('')
      setShowQuickAdd(false)
    } catch (err) {
      console.error('Failed to create ingredient:', err)
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header con spiegazione */}
      <div className="bg-blue-50 rounded-lg p-3 text-sm">
        <p className="font-medium text-blue-800 mb-1">Come funzionano gli ingredienti:</p>
        <ul className="text-blue-700 space-y-1">
          <li>
            <span className="inline-flex items-center gap-1">
              <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">Primario</span>
              - Se esaurito, il piatto viene <strong>nascosto</strong> dal menu
            </span>
          </li>
          <li>
            <span className="inline-flex items-center gap-1">
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium">Secondario</span>
              - Se esaurito, viene mostrato <strong>barrato</strong> nella descrizione
            </span>
          </li>
        </ul>
      </div>

      {/* Ricerca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Cerca ingrediente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
        />
      </div>

      {/* Ingredienti selezionati */}
      {selected.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase">Selezionati ({selected.length})</p>
          <div className="space-y-1.5">
            {selected.map(ing => {
              const config = selectedIngredients.find(s => s.id === ing.id)
              const isPrimary = config?.isPrimary || false

              return (
                <div
                  key={ing.id}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border-2 transition ${
                    isPrimary
                      ? 'border-red-200 bg-red-50'
                      : 'border-primary-200 bg-primary-50'
                  }`}
                >
                  {/* Checkbox per rimuovere */}
                  <button
                    type="button"
                    onClick={() => handleToggle(ing.id)}
                    className="w-5 h-5 bg-primary-500 rounded flex items-center justify-center flex-shrink-0"
                  >
                    <Check className="w-3 h-3 text-white" />
                  </button>

                  {/* Nome ingrediente */}
                  <span className="text-sm font-medium flex-1">{ing.name}</span>

                  {/* Indicatore stock */}
                  {!ing.inStock && (
                    <span className="text-xs px-2 py-0.5 bg-red-500 text-white rounded-full">
                      Esaurito
                    </span>
                  )}

                  {/* Toggle Primario/Secondario */}
                  <button
                    type="button"
                    onClick={() => handleTogglePrimary(ing.id)}
                    className={`text-xs px-3 py-1 rounded-full font-medium transition ${
                      isPrimary
                        ? 'bg-red-500 text-white hover:bg-red-600'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                  >
                    {isPrimary ? 'Primario' : 'Secondario'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Ingredienti disponibili */}
      {notSelected.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase">
            Disponibili ({notSelected.length})
          </p>
          <div className="max-h-40 overflow-y-auto space-y-1 border rounded-lg p-2 bg-gray-50">
            {notSelected.map(ing => (
              <button
                key={ing.id}
                type="button"
                onClick={() => handleToggle(ing.id)}
                className="w-full flex items-center gap-2 p-2 rounded hover:bg-white transition text-left"
              >
                <div className="w-5 h-5 border-2 border-gray-300 rounded flex-shrink-0" />
                <span className="text-sm flex-1">{ing.name}</span>
                {!ing.inStock && (
                  <span className="text-xs text-red-500">(esaurito)</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Nessun risultato */}
      {filteredIngredients.length === 0 && searchTerm && (
        <div className="text-center py-4">
          <p className="text-sm text-gray-500 mb-2">
            Nessun ingrediente trovato per "{searchTerm}"
          </p>
          <button
            type="button"
            onClick={() => {
              setNewIngredientName(searchTerm)
              setShowQuickAdd(true)
            }}
            className="text-sm text-primary-500 hover:underline"
          >
            + Crea "{searchTerm}" come nuovo ingrediente
          </button>
        </div>
      )}

      {/* Quick Add */}
      {!showQuickAdd ? (
        <button
          type="button"
          onClick={() => setShowQuickAdd(true)}
          className="flex items-center gap-2 text-sm text-primary-500 hover:text-primary-600"
        >
          <Plus className="w-4 h-4" />
          Aggiungi nuovo ingrediente
        </button>
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Nome ingrediente..."
            value={newIngredientName}
            onChange={(e) => setNewIngredientName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
            className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
            autoFocus
          />
          <button
            type="button"
            onClick={handleQuickAdd}
            disabled={creating || !newIngredientName.trim()}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm hover:bg-primary-600 disabled:opacity-50 flex items-center gap-2"
          >
            {creating && <Loader2 className="w-4 h-4 animate-spin" />}
            Crea
          </button>
          <button
            type="button"
            onClick={() => {
              setShowQuickAdd(false)
              setNewIngredientName('')
            }}
            className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50"
          >
            X
          </button>
        </div>
      )}
    </div>
  )
}
