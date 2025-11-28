'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, QrCode, Edit, ToggleLeft, ToggleRight, Trash2, X, Upload, Image as ImageIcon, Loader2, Lock, LogOut } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import {
  getMenu,
  getTables,
  createCategory,
  updateCategory,
  createMenuItem,
  updateMenuItem,
  updateItemAvailability,
  uploadCategoryImage,
  uploadItemImage,
  adminLogin,
  verifyToken,
  setAuthToken,
  getAuthToken,
} from '@/lib/api'
import type { Category, MenuItem, Table } from '@shared/types'

type Tab = 'menu' | 'tables' | 'qr'

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('menu')
  const [categories, setCategories] = useState<Category[]>([])
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)

  // Check auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = getAuthToken()
      if (!token) {
        setIsAuthenticated(false)
        setLoading(false)
        return
      }
      try {
        await verifyToken()
        setIsAuthenticated(true)
      } catch {
        setAuthToken(null)
        setIsAuthenticated(false)
      }
      setLoading(false)
    }
    checkAuth()
  }, [])

  const loadData = async () => {
    try {
      const [menuData, tablesData] = await Promise.all([
        getMenu(),
        getTables(),
      ])
      setCategories(menuData)
      setTables(tablesData)
    } catch (err) {
      console.error('Failed to load data:', err)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      loadData()
    }
  }, [isAuthenticated])

  const handleLogout = () => {
    setAuthToken(null)
    setIsAuthenticated(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Caricamento...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <LoginScreen
        onLogin={() => {
          setIsAuthenticated(true)
          loadData()
        }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-gray-800 text-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Pannello Admin</h1>
            <p className="text-gray-400">Gestisci menu, tavoli e QR code</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition"
          >
            <LogOut className="w-4 h-4" />
            Esci
          </button>
        </div>
      </header>

      {/* Tabs */}
      <nav className="bg-white border-b">
        <div className="flex">
          <button
            onClick={() => setActiveTab('menu')}
            className={`flex-1 py-4 px-6 font-medium transition ${
              activeTab === 'menu'
                ? 'text-primary-600 border-b-2 border-primary-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Menu
          </button>
          <button
            onClick={() => setActiveTab('tables')}
            className={`flex-1 py-4 px-6 font-medium transition ${
              activeTab === 'tables'
                ? 'text-primary-600 border-b-2 border-primary-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Tavoli
          </button>
          <button
            onClick={() => setActiveTab('qr')}
            className={`flex-1 py-4 px-6 font-medium transition ${
              activeTab === 'qr'
                ? 'text-primary-600 border-b-2 border-primary-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            QR Code
          </button>
        </div>
      </nav>

      {/* Content */}
      <main className="p-4 max-w-4xl mx-auto">
        {activeTab === 'menu' && (
          <MenuTab categories={categories} onUpdate={loadData} />
        )}
        {activeTab === 'tables' && (
          <TablesTab tables={tables} />
        )}
        {activeTab === 'qr' && (
          <QRTab tables={tables} />
        )}
      </main>
    </div>
  )
}

// ============ MENU TAB ============

interface MenuTabProps {
  categories: Category[]
  onUpdate: () => Promise<void>
}

function MenuTab({ categories, onUpdate }: MenuTabProps) {
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showItemModal, setShowItemModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)

  const handleToggleAvailability = async (item: MenuItem) => {
    try {
      await updateItemAvailability(item.id, !item.available)
      await onUpdate()
    } catch (err) {
      console.error('Failed to update availability:', err)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Gestione Menu</h2>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setEditingCategory(null)
              setShowCategoryModal(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
          >
            <Plus className="w-5 h-5" />
            Categoria
          </button>
          <button
            onClick={() => {
              setEditingItem(null)
              setSelectedCategoryId(categories[0]?.id || null)
              setShowItemModal(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition"
          >
            <Plus className="w-5 h-5" />
            Piatto
          </button>
        </div>
      </div>

      {categories.map((category) => (
        <div key={category.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b flex items-center justify-between">
            <div className="flex items-center gap-3">
              {category.imageUrl && (
                <img
                  src={category.imageUrl}
                  alt={category.name}
                  className="w-10 h-10 rounded-lg object-cover"
                />
              )}
              <div>
                <h3 className="font-semibold text-gray-900">{category.name}</h3>
                {category.description && (
                  <p className="text-sm text-gray-500">{category.description}</p>
                )}
              </div>
            </div>
            <button
              onClick={() => {
                setEditingCategory(category)
                setShowCategoryModal(true)
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <Edit className="w-4 h-4" />
            </button>
          </div>

          <div className="divide-y">
            {category.items?.map((item) => (
              <div
                key={item.id}
                className="p-4 flex items-center justify-between hover:bg-gray-50 transition"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <ImageIcon className="w-6 h-6 text-gray-300" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900">{item.name}</h4>
                      {!item.available && (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">
                          Non disponibile
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="font-semibold text-gray-900">
                    {formatPrice(item.price)}
                  </span>
                  <button
                    onClick={() => {
                      setEditingItem(item)
                      setSelectedCategoryId(category.id)
                      setShowItemModal(true)
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleToggleAvailability(item)}
                    className={`p-1 rounded transition ${
                      item.available
                        ? 'text-green-500 hover:bg-green-50'
                        : 'text-gray-400 hover:bg-gray-100'
                    }`}
                    title={item.available ? 'Disponibile' : 'Non disponibile'}
                  >
                    {item.available ? (
                      <ToggleRight className="w-6 h-6" />
                    ) : (
                      <ToggleLeft className="w-6 h-6" />
                    )}
                  </button>
                </div>
              </div>
            ))}

            {/* Add item to this category */}
            <button
              onClick={() => {
                setEditingItem(null)
                setSelectedCategoryId(category.id)
                setShowItemModal(true)
              }}
              className="w-full p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-2 transition"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm">Aggiungi piatto</span>
            </button>
          </div>
        </div>
      ))}

      {/* Category Modal */}
      {showCategoryModal && (
        <CategoryModal
          category={editingCategory}
          onClose={() => setShowCategoryModal(false)}
          onSave={async () => {
            await onUpdate()
            setShowCategoryModal(false)
          }}
        />
      )}

      {/* Item Modal */}
      {showItemModal && selectedCategoryId && (
        <ItemModal
          item={editingItem}
          categoryId={selectedCategoryId}
          categories={categories}
          onClose={() => setShowItemModal(false)}
          onSave={async () => {
            await onUpdate()
            setShowItemModal(false)
          }}
        />
      )}
    </div>
  )
}

// ============ CATEGORY MODAL ============

interface CategoryModalProps {
  category: Category | null
  onClose: () => void
  onSave: () => Promise<void>
}

function CategoryModal({ category, onClose, onSave }: CategoryModalProps) {
  const [name, setName] = useState(category?.name || '')
  const [description, setDescription] = useState(category?.description || '')
  const [imageUrl, setImageUrl] = useState(category?.imageUrl || '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const result = await uploadCategoryImage(file)
      setImageUrl(result.url)
    } catch (err) {
      console.error('Failed to upload image:', err)
      alert('Errore nel caricamento dell\'immagine')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setSaving(true)
    try {
      if (category) {
        await updateCategory(category.id, { name, description, imageUrl })
      } else {
        await createCategory({ name, description, imageUrl })
      }
      await onSave()
    } catch (err) {
      console.error('Failed to save category:', err)
      alert('Errore nel salvataggio')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold">
            {category ? 'Modifica Categoria' : 'Nuova Categoria'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Immagine
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
                {uploading ? 'Caricamento...' : 'Carica'}
              </button>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome *
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
              Descrizione
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border rounded-lg hover:bg-gray-50"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="flex-1 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {category ? 'Salva' : 'Crea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ============ ITEM MODAL ============

interface ItemModalProps {
  item: MenuItem | null
  categoryId: string
  categories: Category[]
  onClose: () => void
  onSave: () => Promise<void>
}

function ItemModal({ item, categoryId, categories, onClose, onSave }: ItemModalProps) {
  const [name, setName] = useState(item?.name || '')
  const [description, setDescription] = useState(item?.description || '')
  const [price, setPrice] = useState(item ? (item.price / 100).toFixed(2) : '')
  const [imageUrl, setImageUrl] = useState(item?.imageUrl || '')
  const [selectedCategory, setSelectedCategory] = useState(categoryId)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const result = await uploadItemImage(file)
      setImageUrl(result.url)
    } catch (err) {
      console.error('Failed to upload image:', err)
      alert('Errore nel caricamento dell\'immagine')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !price) return

    setSaving(true)
    try {
      const priceInCents = Math.round(parseFloat(price) * 100)
      if (item) {
        await updateMenuItem(item.id, { name, description, price: priceInCents / 100, imageUrl })
      } else {
        await createMenuItem({
          name,
          description,
          price: priceInCents / 100,
          categoryId: selectedCategory,
          imageUrl
        })
      }
      await onSave()
    } catch (err) {
      console.error('Failed to save item:', err)
      alert('Errore nel salvataggio')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-bold">
            {item ? 'Modifica Piatto' : 'Nuovo Piatto'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Immagine
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
                {uploading ? 'Caricamento...' : 'Carica'}
              </button>
            </div>
          </div>

          {/* Category (only for new items) */}
          {!item && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoria *
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
              Nome *
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
              Descrizione
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
              Prezzo (€) *
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

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border rounded-lg hover:bg-gray-50"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim() || !price}
              className="flex-1 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {item ? 'Salva' : 'Crea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ============ TABLES TAB ============

function TablesTab({ tables }: { tables: Table[] }) {
  const statusColors: Record<string, string> = {
    AVAILABLE: 'bg-green-100 text-green-700',
    OCCUPIED: 'bg-red-100 text-red-700',
    RESERVED: 'bg-yellow-100 text-yellow-700',
  }

  const statusLabels: Record<string, string> = {
    AVAILABLE: 'Libero',
    OCCUPIED: 'Occupato',
    RESERVED: 'Riservato',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Gestione Tavoli</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition">
          <Plus className="w-5 h-5" />
          Aggiungi tavolo
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {tables.map((table) => (
          <div
            key={table.id}
            className="bg-white rounded-xl p-4 shadow-sm border text-center"
          >
            <div className="text-3xl font-bold text-gray-900 mb-2">
              {table.number}
            </div>
            <div className="text-sm text-gray-500 mb-3">
              {table.seats} posti
            </div>
            <span
              className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                statusColors[table.status]
              }`}
            >
              {statusLabels[table.status]}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============ LOGIN SCREEN ============

interface LoginScreenProps {
  onLogin: () => void
}

function LoginScreen({ onLogin }: LoginScreenProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) return

    setLoading(true)
    setError('')

    try {
      const { token } = await adminLogin(password)
      setAuthToken(token)
      onLogin()
    } catch (err) {
      setError('Password non valida')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Admin MyKafe</h1>
            <p className="text-gray-500 mt-1">Inserisci la password per accedere</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                autoFocus
              />
            </div>

            {error && (
              <div className="text-red-500 text-sm text-center">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="w-full py-3 bg-gray-800 text-white rounded-xl font-medium hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              {loading ? 'Accesso...' : 'Accedi'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

// ============ QR TAB ============

function QRTab({ tables }: { tables: Table[] }) {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">QR Code Tavoli</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition">
          Stampa tutti
        </button>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
        <p className="text-sm">
          Ogni QR code porta i clienti direttamente al menu del loro tavolo.
          Stampa e posiziona i QR sui tavoli.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {tables.map((table) => (
          <div
            key={table.id}
            className="bg-white rounded-xl p-6 shadow-sm border text-center"
          >
            <div className="w-32 h-32 mx-auto mb-4 bg-gray-100 rounded-lg flex items-center justify-center">
              <QrCode className="w-20 h-20 text-gray-400" />
            </div>
            <h3 className="font-bold text-lg">Tavolo {table.number}</h3>
            <p className="text-xs text-gray-400 mt-1 break-all">
              {baseUrl}/menu/{table.qrCode}
            </p>
            <button className="mt-3 text-sm text-primary-600 hover:text-primary-700 font-medium">
              Scarica QR
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
