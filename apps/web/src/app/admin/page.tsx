'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, QrCode, Edit, ToggleLeft, ToggleRight, Trash2, X, Upload, Image as ImageIcon, Loader2, Lock, LogOut, Download, Printer, Clock, Timer } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useTranslations } from 'next-intl'
import { formatPrice } from '@/lib/utils'
import {
  getSushiStatus,
  getPaniniStatus,
  isSushiTimeActive,
  getTimerConfig,
  saveTimerConfig,
  DAYS_OF_WEEK,
  type TimerConfig
} from '@/lib/menuTimers'
import {
  getAdminCategories,
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
  getIngredients,
  createIngredient,
  setMenuItemIngredients,
  getMenuItemIngredients,
  setIngredientStock,
} from '@/lib/api'
import type { Category, MenuItem, Table, Ingredient } from '@shared/types'

type Tab = 'menu' | 'ingredients' | 'tables' | 'qr'

export default function AdminPage() {
  const t = useTranslations('admin')
  const tc = useTranslations('common')
  const tl = useTranslations('login')
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('menu')
  const [categories, setCategories] = useState<Category[]>([])
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)

  // Check auth on mount - TEMPORARILY BYPASSED
  useEffect(() => {
    // TODO: Re-enable auth once Supabase Edge Functions password is configured
    setIsAuthenticated(true)
    setLoading(false)
  }, [])

  const loadData = async () => {
    try {
      const [menuData, tablesData] = await Promise.all([
        getAdminCategories(),
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
        <div className="text-gray-500">{tc('loading')}</div>
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
        t={tl}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-gray-800 text-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t('title')}</h1>
            <p className="text-gray-400">{t('subtitle')}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition"
          >
            <LogOut className="w-4 h-4" />
            {t('logout')}
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
            {t('menuTab')}
          </button>
          <button
            onClick={() => setActiveTab('ingredients')}
            className={`flex-1 py-4 px-6 font-medium transition ${
              activeTab === 'ingredients'
                ? 'text-primary-600 border-b-2 border-primary-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('ingredientsTab')}
          </button>
          <button
            onClick={() => setActiveTab('tables')}
            className={`flex-1 py-4 px-6 font-medium transition ${
              activeTab === 'tables'
                ? 'text-primary-600 border-b-2 border-primary-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('tablesTab')}
          </button>
          <button
            onClick={() => setActiveTab('qr')}
            className={`flex-1 py-4 px-6 font-medium transition ${
              activeTab === 'qr'
                ? 'text-primary-600 border-b-2 border-primary-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('qrTab')}
          </button>
        </div>
      </nav>

      {/* Content */}
      <main className="p-4 max-w-4xl mx-auto">
        {activeTab === 'menu' && (
          <MenuTab categories={categories} onUpdate={loadData} t={t} tc={tc} />
        )}
        {activeTab === 'ingredients' && (
          <IngredientsTab t={t} tc={tc} />
        )}
        {activeTab === 'tables' && (
          <TablesTab tables={tables} t={t} />
        )}
        {activeTab === 'qr' && (
          <QRTab tables={tables} t={t} tc={tc} />
        )}
      </main>
    </div>
  )
}

// ============ MENU TAB ============

interface MenuTabProps {
  categories: Category[]
  onUpdate: () => Promise<void>
  t: ReturnType<typeof useTranslations<'admin'>>
  tc: ReturnType<typeof useTranslations<'common'>>
}

function MenuTab({ categories, onUpdate, t, tc }: MenuTabProps) {
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showItemModal, setShowItemModal] = useState(false)
  const [showTimerModal, setShowTimerModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [togglingCategory, setTogglingCategory] = useState<string | null>(null)
  const [timerConfig, setTimerConfig] = useState<TimerConfig>(getTimerConfig())

  const handleToggleAvailability = async (item: MenuItem) => {
    try {
      await updateItemAvailability(item.id, !item.available)
      await onUpdate()
    } catch (err) {
      console.error('Failed to update availability:', err)
    }
  }

  const handleToggleCategory = async (category: Category) => {
    setTogglingCategory(category.id)
    try {
      await updateCategory(category.id, { active: !category.active })
      await onUpdate()
    } catch (err) {
      console.error('Failed to toggle category:', err)
    } finally {
      setTogglingCategory(null)
    }
  }

  // Trova categorie speciali (es. Sushi) per lo switch rapido
  const specialCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes('sushi')
  )

  // Get timer status
  const sushiStatus = getSushiStatus()
  const paniniStatus = getPaniniStatus()
  const isInSushiWindow = isSushiTimeActive()

  // Get day names for display
  const getStartDayName = () => DAYS_OF_WEEK.find(d => d.value === timerConfig.sushi.startDay)?.label || ''
  const getEndDayName = () => DAYS_OF_WEEK.find(d => d.value === timerConfig.sushi.endDay)?.label || ''

  return (
    <div className="space-y-6">
      {/* Timer Configuration Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Timer className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-blue-800">Configurazione Timer Menu</h3>
          </div>
          <button
            onClick={() => setShowTimerModal(true)}
            className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition flex items-center gap-1"
          >
            <Edit className="w-4 h-4" />
            Modifica Orari
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Sushi Timer */}
          <div className="bg-white/70 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">🍣</span>
              <span className="font-medium text-gray-800">Sushi</span>
              <span className={`ml-auto px-2 py-0.5 rounded-full text-xs ${
                timerConfig.sushi.enabled
                  ? (isInSushiWindow ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700')
                  : 'bg-gray-100 text-gray-500'
              }`}>
                {timerConfig.sushi.enabled ? (isInSushiWindow ? 'ATTIVO' : 'IN ATTESA') : 'SEMPRE'}
              </span>
            </div>
            <p className="text-xs text-gray-600">
              {timerConfig.sushi.enabled
                ? `${getStartDayName()} ${timerConfig.sushi.startHour}:00 → ${getEndDayName()} ${timerConfig.sushi.endHour}:00`
                : 'Timer disabilitato - controllato solo dal toggle categoria'
              }
            </p>
          </div>

          {/* Panini Timer */}
          <div className="bg-white/70 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">🥪</span>
              <span className="font-medium text-gray-800">Panini (Bar)</span>
              <span className={`ml-auto px-2 py-0.5 rounded-full text-xs ${
                timerConfig.panini.enabled
                  ? (paniniStatus.isAvailable ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700')
                  : 'bg-gray-100 text-gray-500'
              }`}>
                {timerConfig.panini.enabled ? (paniniStatus.isAvailable ? 'VISIBILI' : 'NASCOSTI') : 'SEMPRE'}
              </span>
            </div>
            <p className="text-xs text-gray-600">
              {timerConfig.panini.enabled
                ? `Visibili dalle ${timerConfig.panini.startHour}:00 (solo menu bar/banco)`
                : 'Timer disabilitato - sempre visibili'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Quick Toggle per categorie speciali (es. Sushi) */}
      {specialCategories.length > 0 && (
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-orange-800">{t('specialMenus')}</h3>
            {/* Timer Status Badge */}
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
              isInSushiWindow
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600'
            }`}>
              <Timer className="w-3 h-3" />
              <span>{sushiStatus.statusText}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {specialCategories.map((cat) => {
              return (
                <button
                  key={cat.id}
                  onClick={() => handleToggleCategory(cat)}
                  disabled={togglingCategory === cat.id}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    cat.active
                      ? 'bg-orange-500 text-white shadow-lg shadow-orange-200'
                      : 'bg-white text-gray-600 border border-gray-200 hover:border-orange-300'
                  } ${togglingCategory === cat.id ? 'opacity-50' : ''}`}
                >
                  <span className="text-2xl">🍣</span>
                  <div className="text-left">
                    <div className="font-semibold">{cat.name}</div>
                    <div className={`text-xs ${cat.active ? 'text-orange-100' : 'text-gray-400'}`}>
                      {cat.active
                        ? (isInSushiWindow ? 'Visibile ai clienti' : 'Timer non attivo')
                        : 'Disabilitato manualmente'
                      }
                    </div>
                  </div>
                  {cat.active ? (
                    <ToggleRight className="w-6 h-6 ml-2" />
                  ) : (
                    <ToggleLeft className="w-6 h-6 ml-2" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">{t('menuManagement')}</h2>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setEditingCategory(null)
              setShowCategoryModal(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
          >
            <Plus className="w-5 h-5" />
            {t('addCategory')}
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
            {t('addDish')}
          </button>
        </div>
      </div>

      {categories.map((category) => (
        <div key={category.id} className={`bg-white rounded-xl shadow-sm overflow-hidden ${!category.active ? 'opacity-60' : ''}`}>
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
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">{category.name}</h3>
                  {!category.active && (
                    <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                      {tc('hidden')}
                    </span>
                  )}
                </div>
                {category.description && (
                  <p className="text-sm text-gray-500">{category.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleToggleCategory(category)}
                disabled={togglingCategory === category.id}
                className={`p-1 rounded transition ${
                  category.active
                    ? 'text-green-500 hover:bg-green-50'
                    : 'text-gray-400 hover:bg-gray-100'
                }`}
                title={category.active ? 'Categoria visibile' : 'Categoria nascosta'}
              >
                {category.active ? (
                  <ToggleRight className="w-6 h-6" />
                ) : (
                  <ToggleLeft className="w-6 h-6" />
                )}
              </button>
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
                          {tc('unavailable')}
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
                    title={item.available ? tc('available') : tc('unavailable')}
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
              <span className="text-sm">{t('addItem')}</span>
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
          t={t}
          tc={tc}
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
          t={t}
          tc={tc}
        />
      )}

      {/* Timer Configuration Modal */}
      {showTimerModal && (
        <TimerConfigModal
          config={timerConfig}
          onClose={() => setShowTimerModal(false)}
          onSave={(newConfig) => {
            saveTimerConfig(newConfig)
            setTimerConfig(newConfig)
            setShowTimerModal(false)
          }}
        />
      )}
    </div>
  )
}

// ============ TIMER CONFIG MODAL ============

interface TimerConfigModalProps {
  config: TimerConfig
  onClose: () => void
  onSave: (config: TimerConfig) => void
}

function TimerConfigModal({ config, onClose, onSave }: TimerConfigModalProps) {
  const [localConfig, setLocalConfig] = useState<TimerConfig>(config)

  const handleSave = () => {
    onSave(localConfig)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-bold">Configurazione Timer Menu</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Sushi Timer Configuration */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🍣</span>
                <h3 className="font-semibold text-gray-900">Timer Sushi</h3>
              </div>
              <button
                onClick={() => setLocalConfig({
                  ...localConfig,
                  sushi: { ...localConfig.sushi, enabled: !localConfig.sushi.enabled }
                })}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition ${
                  localConfig.sushi.enabled
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {localConfig.sushi.enabled ? (
                  <>
                    <ToggleRight className="w-5 h-5" />
                    <span className="text-sm">Attivo</span>
                  </>
                ) : (
                  <>
                    <ToggleLeft className="w-5 h-5" />
                    <span className="text-sm">Disattivo</span>
                  </>
                )}
              </button>
            </div>

            {localConfig.sushi.enabled && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <p className="text-sm text-gray-600">
                  Il sushi sara visibile solo durante la finestra oraria configurata.
                </p>

                {/* Start Day/Hour */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Giorno Inizio
                    </label>
                    <select
                      value={localConfig.sushi.startDay}
                      onChange={(e) => setLocalConfig({
                        ...localConfig,
                        sushi: { ...localConfig.sushi, startDay: parseInt(e.target.value) }
                      })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {DAYS_OF_WEEK.map(day => (
                        <option key={day.value} value={day.value}>{day.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ora Inizio
                    </label>
                    <select
                      value={localConfig.sushi.startHour}
                      onChange={(e) => setLocalConfig({
                        ...localConfig,
                        sushi: { ...localConfig.sushi, startHour: parseInt(e.target.value) }
                      })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* End Day/Hour */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Giorno Fine
                    </label>
                    <select
                      value={localConfig.sushi.endDay}
                      onChange={(e) => setLocalConfig({
                        ...localConfig,
                        sushi: { ...localConfig.sushi, endDay: parseInt(e.target.value) }
                      })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {DAYS_OF_WEEK.map(day => (
                        <option key={day.value} value={day.value}>{day.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ora Fine
                    </label>
                    <select
                      value={localConfig.sushi.endHour}
                      onChange={(e) => setLocalConfig({
                        ...localConfig,
                        sushi: { ...localConfig.sushi, endHour: parseInt(e.target.value) }
                      })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {!localConfig.sushi.enabled && (
              <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
                Timer disabilitato: il sushi sara visibile in base al toggle della categoria nell'elenco menu.
              </p>
            )}
          </div>

          {/* Panini Timer Configuration */}
          <div className="space-y-4 border-t pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🥪</span>
                <h3 className="font-semibold text-gray-900">Timer Panini (Bar/Banco)</h3>
              </div>
              <button
                onClick={() => setLocalConfig({
                  ...localConfig,
                  panini: { ...localConfig.panini, enabled: !localConfig.panini.enabled }
                })}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition ${
                  localConfig.panini.enabled
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {localConfig.panini.enabled ? (
                  <>
                    <ToggleRight className="w-5 h-5" />
                    <span className="text-sm">Attivo</span>
                  </>
                ) : (
                  <>
                    <ToggleLeft className="w-5 h-5" />
                    <span className="text-sm">Disattivo</span>
                  </>
                )}
              </button>
            </div>

            {localConfig.panini.enabled && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <p className="text-sm text-gray-600">
                  I panini saranno nascosti sul menu bar/banco prima dell'orario configurato.
                  Sul menu takeaway (/ordina) sono sempre visibili.
                </p>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Visibili dalle ore
                  </label>
                  <select
                    value={localConfig.panini.startHour}
                    onChange={(e) => setLocalConfig({
                      ...localConfig,
                      panini: { ...localConfig.panini, startHour: parseInt(e.target.value) }
                    })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {!localConfig.panini.enabled && (
              <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
                Timer disabilitato: i panini saranno sempre visibili su tutti i menu.
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="flex-1 py-2 border rounded-lg hover:bg-gray-100"
          >
            Annulla
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Salva Configurazione
          </button>
        </div>
      </div>
    </div>
  )
}

// ============ CATEGORY MODAL ============

interface CategoryModalProps {
  category: Category | null
  onClose: () => void
  onSave: () => Promise<void>
  t: ReturnType<typeof useTranslations<'admin'>>
  tc: ReturnType<typeof useTranslations<'common'>>
}

function CategoryModal({ category, onClose, onSave, t, tc }: CategoryModalProps) {
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
      alert(t('saveError'))
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
      alert(t('saveError'))
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
            {category ? t('editCategory') : t('newCategory')}
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
              disabled={saving || !name.trim()}
              className="flex-1 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {category ? tc('save') : tc('create')}
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
  t: ReturnType<typeof useTranslations<'admin'>>
  tc: ReturnType<typeof useTranslations<'common'>>
}

function ItemModal({ item, categoryId, categories, onClose, onSave, t, tc }: ItemModalProps) {
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
  const [selectedIngredientIds, setSelectedIngredientIds] = useState<string[]>([])
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
            setSelectedIngredientIds(itemIngredients.map(i => i.ingredientId))
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
    setSelectedIngredientIds(prev =>
      prev.includes(ingredientId)
        ? prev.filter(id => id !== ingredientId)
        : [...prev, ingredientId]
    )
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
      setSelectedIngredientIds(prev => [...prev, newIng.id])
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
      if (savedItemId && selectedIngredientIds.length > 0) {
        try {
          await setMenuItemIngredients(savedItemId, selectedIngredientIds)
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
                  <div className="max-h-40 overflow-y-auto border rounded-lg p-2 mb-2 space-y-1">
                    {allIngredients.map((ing) => (
                      <label
                        key={ing.id}
                        className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedIngredientIds.includes(ing.id)}
                          onChange={() => handleIngredientToggle(ing.id)}
                          className="w-4 h-4 text-primary-500 rounded focus:ring-primary-500"
                        />
                        <span className="text-sm">{ing.name}</span>
                        {!ing.inStock && (
                          <span className="text-xs text-red-500 ml-auto">({tc('unavailable')})</span>
                        )}
                      </label>
                    ))}
                  </div>
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

// ============ TABLES TAB ============

interface TablesTabProps {
  tables: Table[]
  t: ReturnType<typeof useTranslations<'admin'>>
}

function TablesTab({ tables, t }: TablesTabProps) {
  const statusColors: Record<string, string> = {
    AVAILABLE: 'bg-green-100 text-green-700',
    OCCUPIED: 'bg-red-100 text-red-700',
    RESERVED: 'bg-yellow-100 text-yellow-700',
  }

  const statusLabels: Record<string, string> = {
    AVAILABLE: t('free'),
    OCCUPIED: t('occupied'),
    RESERVED: t('reserved'),
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">{t('tablesManagement')}</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition">
          <Plus className="w-5 h-5" />
          {t('addTable')}
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
              {table.seats} {t('seats')}
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

// ============ INGREDIENTS TAB ============

interface IngredientsTabProps {
  t: ReturnType<typeof useTranslations<'admin'>>
  tc: ReturnType<typeof useTranslations<'common'>>
}

function IngredientsTab({ t, tc }: IngredientsTabProps) {
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Load ingredients on mount
  useEffect(() => {
    loadIngredients()
  }, [])

  const loadIngredients = async () => {
    try {
      const data = await getIngredients()
      setIngredients(data)
    } catch (err) {
      console.error('Failed to load ingredients:', err)
    } finally {
      setLoading(false)
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
    } catch (err) {
      console.error('Failed to toggle ingredient stock:', err)
      alert(t('saveError'))
    } finally {
      setToggling(null)
    }
  }

  // Filter ingredients
  const filteredIngredients = ingredients.filter(ing =>
    ing.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Separate in stock and out of stock
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
      </div>

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

      {/* Out of Stock Section - Highlighted */}
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
                <div>
                  <span className="font-medium text-gray-900">{ingredient.name}</span>
                </div>
                <button
                  onClick={() => handleToggleStock(ingredient)}
                  disabled={toggling === ingredient.id}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition ${
                    toggling === ingredient.id
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
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition ${
                  toggling === ingredient.id
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
    </div>
  )
}

// ============ LOGIN SCREEN ============

interface LoginScreenProps {
  onLogin: () => void
  t: ReturnType<typeof useTranslations<'login'>>
}

function LoginScreen({ onLogin, t }: LoginScreenProps) {
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
      setError(t('invalidPassword'))
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
            <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
            <p className="text-gray-500 mt-1">{t('enterPassword')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('password')}
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
              {loading ? t('loggingIn') : t('login')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

// ============ QR TAB ============

interface QRTabProps {
  tables: Table[]
  t: ReturnType<typeof useTranslations<'admin'>>
  tc: ReturnType<typeof useTranslations<'common'>>
}

function QRTab({ tables, t, tc }: QRTabProps) {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  // Filter out takeaway "table" from the list
  const realTables = tables.filter(tbl => tbl.qrCode !== 'takeaway')

  const downloadQR = useCallback((elementId: string, filename: string) => {
    const svg = document.getElementById(elementId)
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      canvas.width = img.width * 2
      canvas.height = img.height * 2
      ctx?.scale(2, 2)
      ctx?.drawImage(img, 0, 0)
      const pngFile = canvas.toDataURL('image/png')
      const downloadLink = document.createElement('a')
      downloadLink.download = `${filename}.png`
      downloadLink.href = pngFile
      downloadLink.click()
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }, [])

  const printAllQR = useCallback(() => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const qrCodes: { label: string; url: string }[] = [
      { label: 'Banco / Take Away', url: `${baseUrl}/banco` },
      { label: 'Ordini Online', url: `${baseUrl}/ordina` },
      ...realTables.map(table => ({
        label: `Tavolo ${table.number}`,
        url: `${baseUrl}/menu/${table.qrCode}`
      }))
    ]

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR Codes - MyKafe</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
          .qr-card { text-align: center; padding: 20px; border: 2px solid #e5e7eb; border-radius: 12px; page-break-inside: avoid; }
          .qr-card h3 { margin: 12px 0 4px 0; font-size: 18px; }
          .qr-card p { margin: 0; font-size: 10px; color: #6b7280; word-break: break-all; }
          @media print {
            .grid { grid-template-columns: repeat(3, 1fr); }
            .qr-card { border: 1px solid #000; }
          }
        </style>
      </head>
      <body>
        <h1 style="text-align: center; margin-bottom: 30px;">MyKafe - QR Codes</h1>
        <div class="grid">
          ${qrCodes.map(qr => `
            <div class="qr-card">
              <svg id="qr-print" width="150" height="150"></svg>
              <h3>${qr.label}</h3>
              <p>${qr.url}</p>
            </div>
          `).join('')}
        </div>
        <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
        <script>
          const qrCodes = ${JSON.stringify(qrCodes)};
          const cards = document.querySelectorAll('.qr-card');
          cards.forEach((card, i) => {
            const svg = card.querySelector('svg');
            QRCode.toString(qrCodes[i].url, { type: 'svg', width: 150 }, (err, str) => {
              if (!err) {
                const parser = new DOMParser();
                const doc = parser.parseFromString(str, 'image/svg+xml');
                svg.replaceWith(doc.documentElement);
              }
            });
          });
          setTimeout(() => window.print(), 500);
        </script>
      </body>
      </html>
    `)
    printWindow.document.close()
  }, [baseUrl, realTables])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">{t('qrCodes')}</h2>
        <button
          onClick={printAllQR}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition"
        >
          <Printer className="w-4 h-4" />
          {t('printAll')}
        </button>
      </div>

      {/* Special QR Codes */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-700">{t('specialQr')}</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Counter/Banco QR */}
          <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl p-6 border-2 border-primary-200">
            <div className="flex items-start gap-4">
              <div className="w-28 h-28 bg-white rounded-lg flex items-center justify-center shadow-sm p-2">
                <QRCodeSVG
                  id="qr-banco"
                  value={`${baseUrl}/banco`}
                  size={96}
                  level="H"
                  includeMargin={false}
                />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-lg text-primary-800">{t('counterTakeaway')}</h4>
                <p className="text-sm text-primary-600 mt-1">
                  {t('counterDescription')}
                </p>
                <p className="text-xs text-primary-500 mt-2 break-all">
                  {baseUrl}/banco
                </p>
                <button
                  onClick={() => downloadQR('qr-banco', 'qr-banco-takeaway')}
                  className="mt-3 text-sm bg-primary-500 text-white px-4 py-1.5 rounded-lg hover:bg-primary-600 transition flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  {t('downloadQr')}
                </button>
              </div>
            </div>
          </div>

          {/* Online Ordering Link */}
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border-2 border-orange-200">
            <div className="flex items-start gap-4">
              <div className="w-28 h-28 bg-white rounded-lg flex items-center justify-center shadow-sm p-2">
                <QRCodeSVG
                  id="qr-ordina"
                  value={`${baseUrl}/ordina`}
                  size={96}
                  level="H"
                  includeMargin={false}
                />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-lg text-orange-800">{t('onlineOrders')}</h4>
                <p className="text-sm text-orange-600 mt-1">
                  {t('onlineDescription')}
                </p>
                <p className="text-xs text-orange-500 mt-2 break-all">
                  {baseUrl}/ordina
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => downloadQR('qr-ordina', 'qr-ordini-online')}
                    className="text-sm bg-orange-500 text-white px-4 py-1.5 rounded-lg hover:bg-orange-600 transition flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    {t('downloadQr')}
                  </button>
                  <button
                    onClick={() => navigator.clipboard.writeText(`${baseUrl}/ordina`)}
                    className="text-sm bg-orange-200 text-orange-700 px-4 py-1.5 rounded-lg hover:bg-orange-300 transition"
                  >
                    {t('copyLink')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Table QR Codes */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-700">{t('tableQrCodes')}</h3>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
          <p className="text-sm">
            {t('tableQrNote')}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {realTables.map((table) => (
            <div
              key={table.id}
              className="bg-white rounded-xl p-6 shadow-sm border text-center"
            >
              <div className="w-36 h-36 mx-auto mb-4 bg-gray-50 rounded-lg flex items-center justify-center p-2">
                <QRCodeSVG
                  id={`qr-table-${table.id}`}
                  value={`${baseUrl}/menu/${table.qrCode}`}
                  size={128}
                  level="H"
                  includeMargin={false}
                />
              </div>
              <h3 className="font-bold text-lg">{tc('table')} {table.number}</h3>
              <p className="text-xs text-gray-400 mt-1 break-all">
                {baseUrl}/menu/{table.qrCode}
              </p>
              <button
                onClick={() => downloadQR(`qr-table-${table.id}`, `qr-tavolo-${table.number}`)}
                className="mt-3 text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 mx-auto"
              >
                <Download className="w-4 h-4" />
                {t('downloadQr')}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
