'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, QrCode, Edit, ToggleLeft, ToggleRight, Trash2, X, Upload, Image as ImageIcon, Loader2, Lock, LogOut, Download, Printer, Clock, Timer, BarChart3, DollarSign, Save, Check, Users, RefreshCw, Calendar } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useTranslations } from 'next-intl'
import { formatPrice } from '@/lib/utils'
import { getIngredientSubstitutes, setIngredientSubstitute } from '@/lib/ingredientSubstitutes'
import {
  getSushiStatus,
  getPaniniStatus,
  getTakeawayStatus,
  isSushiTimeActive,
  getTimerConfig,
  saveTimerConfig,
  fetchClosureConfig,
  saveClosureConfigToServer,
  isOnlineOrderingOpen,
  DEFAULT_CLOSURE_CONFIG,
  DAYS_OF_WEEK,
  type TimerConfig,
  type ClosureConfig,
  type DaySchedule
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
  uploadSectionImage,
  adminLogin,
  verifyToken,
  setAuthToken,
  getAuthToken,
  getIngredients,
  createIngredient,
  setMenuItemIngredients,
  getMenuItemIngredients,
  setIngredientStock,
  getTopProducts,
  getPeakHours,
  getSummaryReport,
  getTableCustomers,
  resetTable,
  type TopProductsReport,
  type PeakHoursReport,
  type SummaryReport,
  type TableCustomer,
} from '@/lib/api'
import type { Category, MenuItem, Table, Ingredient } from '@shared/types'
import { menuSections, categoryToSectionMap, type MenuSection } from '@/components/menu/MenuSections'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://biefwzrprjqusjynqwus.supabase.co'

type Tab = 'menu' | 'ingredients' | 'tables' | 'qr' | 'reports' | 'prices'

export default function AdminPage() {
  const t = useTranslations('admin')
  const tc = useTranslations('common')
  const tl = useTranslations('login')
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('menu')
  const [categories, setCategories] = useState<Category[]>([])
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)
  // Chiusura locale - stato globale (sempre visibile in header)
  const [closureBannerConfig, setClosureBannerConfig] = useState<ClosureConfig>(DEFAULT_CLOSURE_CONFIG)
  const [showClosureBannerModal, setShowClosureBannerModal] = useState(false)

  // Check auth on mount - TEMPORARILY BYPASSED
  useEffect(() => {
    // TODO: Re-enable auth once Supabase Edge Functions password is configured
    setIsAuthenticated(true)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchClosureConfig().then(setClosureBannerConfig)
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

  const handleBannerToggle = () => {
    const newConfig: ClosureConfig = {
      ...closureBannerConfig,
      temporaryClosure: {
        active: !closureBannerConfig.temporaryClosure.active,
        message: closureBannerConfig.temporaryClosure.active ? undefined : 'Locale temporaneamente chiuso',
        until: undefined,
      }
    }
    setClosureBannerConfig(newConfig)
    saveClosureConfigToServer(newConfig).catch(e => console.error('Failed to save closure config:', e))
  }

  const isClosed = closureBannerConfig.temporaryClosure.active

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

      {/* Barra Chiusura Locale — sempre visibile */}
      <div className={`flex items-center justify-between px-4 py-3 ${isClosed ? 'bg-red-600' : 'bg-green-600'} text-white`}>
        <div className="flex items-center gap-3">
          <span className="text-xl">{isClosed ? '🔒' : '✅'}</span>
          <div>
            <p className="font-bold text-sm leading-tight">
              {isClosed ? t('restaurantClosed') : t('restaurantOpen')}
            </p>
            <p className="text-xs opacity-80">
              {isClosed
                ? (closureBannerConfig.temporaryClosure.message || t('closureInProgress'))
                : t('customersCanOrder')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowClosureBannerModal(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/20 hover:bg-white/30 transition"
          >
            {t('schedule')}
          </button>
          <button
            onClick={handleBannerToggle}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition shadow ${isClosed ? 'bg-white text-green-700 hover:bg-green-50' : 'bg-white text-red-700 hover:bg-red-50'}`}
          >
            {isClosed ? t('reopenNow') : t('closeNow')}
          </button>
        </div>
      </div>

      {/* Modale chiusure programmate (globale) */}
      {showClosureBannerModal && (
        <ClosureConfigModal
          config={closureBannerConfig}
          onClose={() => setShowClosureBannerModal(false)}
          onSave={(newConfig) => {
            setClosureBannerConfig(newConfig)
            saveClosureConfigToServer(newConfig).catch(e => console.error('Failed to save closure config:', e))
            setShowClosureBannerModal(false)
          }}
        />
      )}

      {/* Tabs */}
      <nav className="bg-white border-b">
        <div className="flex">
          <button
            onClick={() => setActiveTab('menu')}
            className={`flex-1 py-4 px-6 font-medium transition ${activeTab === 'menu'
                ? 'text-primary-600 border-b-2 border-primary-500'
                : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            {t('menuTab')}
          </button>
          <button
            onClick={() => setActiveTab('ingredients')}
            className={`flex-1 py-4 px-6 font-medium transition ${activeTab === 'ingredients'
                ? 'text-primary-600 border-b-2 border-primary-500'
                : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            {t('ingredientsTab')}
          </button>
          <button
            onClick={() => setActiveTab('tables')}
            className={`flex-1 py-4 px-6 font-medium transition ${activeTab === 'tables'
                ? 'text-primary-600 border-b-2 border-primary-500'
                : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            {t('tablesTab')}
          </button>
          <button
            onClick={() => setActiveTab('qr')}
            className={`flex-1 py-4 px-6 font-medium transition ${activeTab === 'qr'
                ? 'text-primary-600 border-b-2 border-primary-500'
                : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            {t('qrTab')}
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex-1 py-4 px-6 font-medium transition ${activeTab === 'reports'
                ? 'text-primary-600 border-b-2 border-primary-500'
                : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            {t('reportsTab')}
          </button>
          <button
            onClick={() => setActiveTab('prices')}
            className={`flex-1 py-4 px-6 font-medium transition ${activeTab === 'prices'
                ? 'text-primary-600 border-b-2 border-primary-500'
                : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            {t('pricesTab')}
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
          <TablesTab tables={tables} t={t} onUpdate={loadData} />
        )}
        {activeTab === 'qr' && (
          <QRTab tables={tables} t={t} tc={tc} />
        )}
        {activeTab === 'reports' && (
          <ReportsTab t={t} tc={tc} />
        )}
        {activeTab === 'prices' && (
          <PricesTab categories={categories} onUpdate={loadData} t={t} tc={tc} />
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
  const [showClosureModal, setShowClosureModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [togglingCategory, setTogglingCategory] = useState<string | null>(null)
  const [timerConfig, setTimerConfig] = useState<TimerConfig>(getTimerConfig())
  const [closureConfig, setClosureConfig] = useState<ClosureConfig>(DEFAULT_CLOSURE_CONFIG)
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null)
  const [uploadingSectionId, setUploadingSectionId] = useState<string | null>(null)
  const [sectionImageVersions, setSectionImageVersions] = useState<Record<string, number>>({})
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const sectionFileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => {
    fetchClosureConfig().then(setClosureConfig)
  }, [])

  const handleInlineImageUpload = async (itemId: string, file: File) => {
    setUploadingItemId(itemId)
    try {
      const result = await uploadItemImage(file)
      await updateMenuItem(itemId, { imageUrl: result.url })
      await onUpdate()
    } catch (err) {
      console.error('Failed to upload image:', err)
    } finally {
      setUploadingItemId(null)
    }
  }

  const handleSectionImageUpload = async (sectionId: string, file: File) => {
    setUploadingSectionId(sectionId)
    try {
      await uploadSectionImage(sectionId, file)
      // Update version to force image refresh (cache busting)
      setSectionImageVersions(prev => ({
        ...prev,
        [sectionId]: Date.now()
      }))
    } catch (err) {
      console.error('Failed to upload section image:', err)
    } finally {
      setUploadingSectionId(null)
    }
  }

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
  const takeawayStatus = getTakeawayStatus()
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Sushi Timer */}
          <div className="bg-white/70 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">🍣</span>
              <span className="font-medium text-gray-800">Sushi</span>
              <span className={`ml-auto px-2 py-0.5 rounded-full text-xs ${timerConfig.sushi.enabled
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
              <span className={`ml-auto px-2 py-0.5 rounded-full text-xs ${timerConfig.panini.enabled
                  ? (paniniStatus.isAvailable ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700')
                  : 'bg-gray-100 text-gray-500'
                }`}>
                {timerConfig.panini.enabled ? (paniniStatus.isAvailable ? 'VISIBILI' : 'NASCOSTI') : 'SEMPRE'}
              </span>
            </div>
            <p className="text-xs text-gray-600">
              {timerConfig.panini.enabled
                ? `${t('visibleFromHour')} ${timerConfig.panini.startHour}:00 (${t('onlyBarMenu')})`
                : t('paniniTimerDisabledDesc')
              }
            </p>
          </div>

          {/* Takeaway Service */}
          <div className="bg-white/70 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">🛒</span>
                <span className="font-medium text-gray-800">{t('takeaway')}</span>
              </div>
              <button
                onClick={() => {
                  const newConfig = {
                    ...timerConfig,
                    takeaway: { ...timerConfig.takeaway, enabled: !timerConfig.takeaway.enabled }
                  }
                  saveTimerConfig(newConfig)
                  setTimerConfig(newConfig)
                }}
                className={`relative w-12 h-6 rounded-full transition-colors ${timerConfig.takeaway.enabled ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                title={timerConfig.takeaway.enabled ? t('disableTakeaway') : t('enableTakeaway')}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${timerConfig.takeaway.enabled ? 'left-7' : 'left-1'
                  }`} />
              </button>
            </div>

            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${!timerConfig.takeaway.enabled
                  ? 'bg-red-100 text-red-700'
                  : takeawayStatus.isAvailable
                    ? 'bg-green-100 text-green-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                {!timerConfig.takeaway.enabled ? t('inactiveBadge') : (takeawayStatus.isAvailable ? t('openBadge') : t('closedBadge'))}
              </span>
            </div>

            <p className="text-xs text-gray-600">
              {!timerConfig.takeaway.enabled
                ? t('serviceTemporarilySuspended')
                : timerConfig.takeaway.closedDays?.length > 0
                  ? `${timerConfig.takeaway.openingHour}:00-${timerConfig.takeaway.closingHour}:00 | ${t('closedLabel')} ${timerConfig.takeaway.closedDays.map(d => DAYS_OF_WEEK.find(day => day.value === d)?.label?.slice(0, 3)).join(', ')}`
                  : `${timerConfig.takeaway.openingHour}:00-${timerConfig.takeaway.closingHour}:00`
              }
            </p>
          </div>
        </div>

        {/* Calendario Ordini Online Button */}
        <div className="mt-4 pt-4 border-t border-blue-200">
          <button
            onClick={() => setShowClosureModal(true)}
            className="w-full flex items-center justify-between px-4 py-3 bg-white/70 rounded-lg hover:bg-white/90 transition"
          >
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-blue-600" />
              <div className="text-left">
                <span className="font-medium text-gray-800">{t('onlineOrdersCalendar')}</span>
                <p className="text-xs text-gray-500">
                  {closureConfig.enabled
                    ? (isOnlineOrderingOpen(closureConfig).isOpen
                      ? t('openNow')
                      : `${t('closedBadge')} - ${isOnlineOrderingOpen(closureConfig).reason || ''}`)
                    : t('calendarControlDisabled')
                  }
                </p>
              </div>
            </div>
            <Edit className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Emergency Quick Close */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-xl">🔒</span>
            </div>
            <div>
              <h3 className="font-semibold text-red-800">Chiusura Locale</h3>
              <p className="text-xs text-red-600">
                {closureConfig.temporaryClosure.active
                  ? `⚠️ CHIUSO — ${closureConfig.temporaryClosure.message || 'Chiusura in corso'}`
                  : 'Locale aperto — premi per chiudere immediatamente'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              const newConfig: ClosureConfig = {
                ...closureConfig,
                temporaryClosure: {
                  active: !closureConfig.temporaryClosure.active,
                  message: closureConfig.temporaryClosure.active ? undefined : 'Locale temporaneamente chiuso',
                  until: undefined,
                }
              }
              setClosureConfig(newConfig)
              saveClosureConfigToServer(newConfig).catch(e => console.error('Failed to save closure config:', e))
            }}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              closureConfig.temporaryClosure.active
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-red-500 text-white hover:bg-red-600'
            }`}
          >
            {closureConfig.temporaryClosure.active ? t('reopenNow') : t('closeNow')}
          </button>
        </div>
        <div className="mt-2 text-right">
          <button
            onClick={() => setShowClosureModal(true)}
            className="text-xs text-red-500 underline hover:text-red-700"
          >
            Configura orari e chiusure programmate →
          </button>
        </div>
      </div>

      {/* Quick Toggle per categorie speciali (es. Sushi) */}
      {specialCategories.length > 0 && (
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-orange-800">{t('specialMenus')}</h3>
            {/* Timer Status Badge */}
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${isInSushiWindow
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
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${cat.active
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

      {/* Section Images Management for Grid Menu (/banco) */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
        <div className="flex items-center gap-2 mb-4">
          <ImageIcon className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold text-purple-800">Immagini Sezioni Menu (Griglia)</h3>
        </div>
        <p className="text-xs text-purple-600 mb-4">
          Gestisci le immagini delle sezioni mostrate nella pagina /banco e /takeaway
        </p>

        <div className="grid grid-cols-3 gap-3">
          {menuSections.map((section) => {
            const version = sectionImageVersions[section.id]
            const imageUrl = version
              ? `${SUPABASE_URL}/storage/v1/object/public/menu-images/sections/${section.id}.jpg?v=${version}`
              : section.image

            return (
              <div key={section.id} className="relative group">
                <input
                  type="file"
                  accept="image/*"
                  ref={(el) => { sectionFileInputRefs.current[section.id] = el }}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      handleSectionImageUpload(section.id, file)
                      e.target.value = ''
                    }
                  }}
                />

                <button
                  onClick={() => sectionFileInputRefs.current[section.id]?.click()}
                  disabled={uploadingSectionId === section.id}
                  className="w-full aspect-square rounded-xl overflow-hidden relative border-2 border-transparent hover:border-purple-400 transition"
                >
                  <img
                    src={imageUrl}
                    alt={section.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback to default section image if Supabase image fails
                      const target = e.target as HTMLImageElement
                      if (target.src !== section.image) {
                        target.src = section.image
                        // Clear the invalid version from state
                        setSectionImageVersions(prev => {
                          const newVersions = { ...prev }
                          delete newVersions[section.id]
                          return newVersions
                        })
                      }
                    }}
                  />

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    {uploadingSectionId === section.id ? (
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    ) : (
                      <Upload className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>

                  {/* Section name */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                    <span className="text-white text-sm font-medium">{section.name}</span>
                  </div>
                </button>
              </div>
            )
          })}
        </div>
      </div>

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

      {(() => {
        // Raggruppa le categorie per sezione del menu
        type SectionGroup = { section: MenuSection | null; sectionLabel: string; cats: typeof categories }
        const sectionOrder = menuSections.map(s => s.id)
        const grouped: Record<string, SectionGroup> = {}

        categories.forEach(cat => {
          const sectionId = categoryToSectionMap[cat.name] ?? '__other__'
          if (!grouped[sectionId]) {
            const section = menuSections.find(s => s.id === sectionId) ?? null
            grouped[sectionId] = {
              section,
              sectionLabel: section ? section.name : 'Altro',
              cats: []
            }
          }
          grouped[sectionId].cats.push(cat)
        })

        const orderedKeys = [
          ...sectionOrder.filter(id => grouped[id]),
          ...(grouped['__other__'] ? ['__other__'] : [])
        ]

        return orderedKeys.map(sectionId => {
          const group = grouped[sectionId]
          return (
            <div key={sectionId} className="space-y-3">
              {/* Section header */}
              <div className="flex items-center gap-2 pt-2">
                <span className="text-xs font-bold uppercase tracking-widest text-primary-600 bg-primary-50 px-3 py-1 rounded-full border border-primary-100">
                  {group.sectionLabel}
                </span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {group.cats.map((category) => (
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
                className={`p-1 rounded transition ${category.active
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
            {/* Sort items by number in name (e.g., "Toast 02" → 2, "Panino 05" → 5) */}
            {[...(category.items || [])].sort((a, b) => {
              const numA = parseInt(a.name.match(/\d+/)?.[0] ?? '')
              const numB = parseInt(b.name.match(/\d+/)?.[0] ?? '')
              if (!isNaN(numA) && !isNaN(numB)) return numA - numB
              if (!isNaN(numA)) return -1
              if (!isNaN(numB)) return 1
              return a.name.localeCompare(b.name)
            }).map((item) => (
              <div
                key={item.id}
                className="p-4 flex items-center justify-between hover:bg-gray-50 transition"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Image with upload overlay */}
                  <div className="relative flex-shrink-0 group">
                    <input
                      type="file"
                      accept="image/*"
                      ref={(el) => { fileInputRefs.current[item.id] = el }}
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          handleInlineImageUpload(item.id, file)
                          e.target.value = '' // Reset input
                        }
                      }}
                    />
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-12 h-12 rounded-lg object-cover cursor-pointer"
                        onClick={() => fileInputRefs.current[item.id]?.click()}
                      />
                    ) : (
                      <div
                        className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center cursor-pointer hover:bg-gray-200 transition"
                        onClick={() => fileInputRefs.current[item.id]?.click()}
                      >
                        <ImageIcon className="w-6 h-6 text-gray-300" />
                      </div>
                    )}
                    {/* Upload overlay */}
                    {uploadingItemId === item.id ? (
                      <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                      </div>
                    ) : (
                      <div
                        className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer"
                        onClick={() => fileInputRefs.current[item.id]?.click()}
                      >
                        <Upload className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>
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
                    className={`p-1 rounded transition ${item.available
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
            </div>
          )
        })
      })()}

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

      {/* Closure Config Modal */}
      {showClosureModal && (
        <ClosureConfigModal
          config={closureConfig}
          onClose={() => setShowClosureModal(false)}
          onSave={(newConfig) => {
            setClosureConfig(newConfig)
            saveClosureConfigToServer(newConfig).catch(e => console.error('Failed to save closure config:', e))
            setShowClosureModal(false)
          }}
        />
      )}
    </div>
  )
}

// ============ CLOSURE CONFIG MODAL ============

interface ClosureConfigModalProps {
  config: ClosureConfig
  onClose: () => void
  onSave: (config: ClosureConfig) => void
}

function ClosureConfigModal({ config, onClose, onSave }: ClosureConfigModalProps) {
  const t = useTranslations('admin')
  const [localConfig, setLocalConfig] = useState<ClosureConfig>(config)

  const handleSave = () => {
    onSave(localConfig)
  }

  const updateDaySchedule = (day: number, updates: Partial<DaySchedule>) => {
    setLocalConfig({
      ...localConfig,
      schedule: {
        ...localConfig.schedule,
        [day]: { ...localConfig.schedule[day], ...updates }
      }
    })
  }

  const orderingStatus = isOnlineOrderingOpen(localConfig)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold">{t('onlineOrdersCalendar')}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Live Status Preview */}
          <div className={`p-3 rounded-lg text-center text-sm font-medium ${orderingStatus.isOpen ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {orderingStatus.isOpen
              ? t('currentStatusOpen')
              : `${t('currentStatusClosed')} - ${orderingStatus.reason || ''}${orderingStatus.nextOpenTime ? ` (${t('nextOpeningLabel')} ${orderingStatus.nextOpenTime})` : ''}`
            }
          </div>

          {/* Master Switch */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">{t('calendarControl')}</h3>
              <p className="text-xs text-gray-500">{t('calendarControlDescription')}</p>
            </div>
            <button
              onClick={() => setLocalConfig({ ...localConfig, enabled: !localConfig.enabled })}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition ${localConfig.enabled
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-500'
              }`}
            >
              {localConfig.enabled ? (
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

          {localConfig.enabled && (
            <>
              {/* Weekly Schedule */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">Orari Settimanali</h3>
                {DAYS_OF_WEEK.map(day => {
                  const daySchedule = localConfig.schedule[day.value]
                  return (
                    <div key={day.value} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                      <button
                        onClick={() => updateDaySchedule(day.value, { enabled: !daySchedule.enabled })}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition flex-shrink-0 ${daySchedule.enabled
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-300 text-white'
                        }`}
                      >
                        {daySchedule.enabled ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                      </button>
                      <span className="font-medium text-gray-800 w-20 text-sm">{day.label}</span>
                      {daySchedule.enabled ? (
                        <div className="flex items-center gap-2 flex-1">
                          <select
                            value={`${daySchedule.openHour.toString().padStart(2, '0')}:${daySchedule.openMinute.toString().padStart(2, '0')}`}
                            onChange={(e) => {
                              const [h, m] = e.target.value.split(':').map(Number)
                              updateDaySchedule(day.value, { openHour: h, openMinute: m })
                            }}
                            className="px-2 py-1 border rounded text-sm"
                          >
                            {Array.from({ length: 24 * 4 }, (_, i) => {
                              const h = Math.floor(i / 4)
                              const m = (i % 4) * 15
                              const val = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
                              return <option key={val} value={val}>{val}</option>
                            })}
                          </select>
                          <span className="text-gray-400">—</span>
                          <select
                            value={`${daySchedule.closeHour.toString().padStart(2, '0')}:${daySchedule.closeMinute.toString().padStart(2, '0')}`}
                            onChange={(e) => {
                              const [h, m] = e.target.value.split(':').map(Number)
                              updateDaySchedule(day.value, { closeHour: h, closeMinute: m })
                            }}
                            className="px-2 py-1 border rounded text-sm"
                          >
                            {Array.from({ length: 24 * 4 }, (_, i) => {
                              const h = Math.floor(i / 4)
                              const m = (i % 4) * 15
                              const val = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
                              return <option key={val} value={val}>{val}</option>
                            })}
                          </select>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 italic">Chiuso</span>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Temporary Closure */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Chiusura Temporanea</h3>
                  <button
                    onClick={() => setLocalConfig({
                      ...localConfig,
                      temporaryClosure: {
                        ...localConfig.temporaryClosure,
                        active: !localConfig.temporaryClosure.active
                      }
                    })}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition ${localConfig.temporaryClosure.active
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {localConfig.temporaryClosure.active ? (
                      <>
                        <ToggleRight className="w-5 h-5" />
                        <span className="text-sm">Attiva</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-5 h-5" />
                        <span className="text-sm">Disattiva</span>
                      </>
                    )}
                  </button>
                </div>

                {localConfig.temporaryClosure.active && (
                  <div className="bg-red-50 rounded-lg p-4 space-y-3 border border-red-200">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Messaggio (opzionale)
                      </label>
                      <input
                        type="text"
                        value={localConfig.temporaryClosure.message || ''}
                        onChange={(e) => setLocalConfig({
                          ...localConfig,
                          temporaryClosure: {
                            ...localConfig.temporaryClosure,
                            message: e.target.value || undefined
                          }
                        })}
                        placeholder="Es: Chiusi per ferie"
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Riapertura (opzionale)
                      </label>
                      <input
                        type="datetime-local"
                        value={localConfig.temporaryClosure.until ? new Date(localConfig.temporaryClosure.until).toISOString().slice(0, 16) : ''}
                        onChange={(e) => setLocalConfig({
                          ...localConfig,
                          temporaryClosure: {
                            ...localConfig.temporaryClosure,
                            until: e.target.value ? new Date(e.target.value).toISOString() : undefined
                          }
                        })}
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Save Button */}
        <div className="p-4 border-t sticky bottom-0 bg-white">
          <button
            onClick={handleSave}
            className="w-full py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            Salva Configurazione
          </button>
        </div>
      </div>
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
  const t = useTranslations('admin')
  const tc = useTranslations('common')
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
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition ${localConfig.sushi.enabled
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
                    <span className="text-sm">{t('timerInactive')}</span>
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
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition ${localConfig.panini.enabled
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
                <p className="text-sm text-gray-600">{t('paniniTimerDesc')}</p>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('visibleFromHour')}
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
                {t('paniniTimerDisabledDesc')}
              </p>
            )}
          </div>

          {/* Takeaway Service Configuration */}
          <div className="space-y-4 border-t pt-6">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🛒</span>
              <h3 className="font-semibold text-gray-900">{t('takeawayService')}</h3>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              {/* Master Toggle */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-medium text-gray-900">{t('onlineTakeawayLabel')}</p>
                  <p className="text-sm text-gray-500">
                    {localConfig.takeaway.enabled
                      ? t('customersCanOrderOnline')
                      : t('serviceTemporarilySuspended')}
                  </p>
                </div>
                <button
                  onClick={() => setLocalConfig({
                    ...localConfig,
                    takeaway: { ...localConfig.takeaway, enabled: !localConfig.takeaway.enabled }
                  })}
                  className={`relative w-14 h-8 rounded-full transition-colors ${localConfig.takeaway.enabled ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                >
                  <span className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${localConfig.takeaway.enabled ? 'left-7' : 'left-1'
                    }`} />
                </button>
              </div>

              {localConfig.takeaway.enabled && (
                <>
                  {/* Closed Days Selection */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('closedDays')}
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      {t('closedDaysDescription')}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {DAYS_OF_WEEK.map((day) => {
                        const isSelected = localConfig.takeaway.closedDays?.includes(day.value)
                        return (
                          <button
                            key={day.value}
                            type="button"
                            onClick={() => {
                              const currentDays = localConfig.takeaway.closedDays || []
                              const newDays = isSelected
                                ? currentDays.filter(d => d !== day.value)
                                : [...currentDays, day.value]
                              setLocalConfig({
                                ...localConfig,
                                takeaway: { ...localConfig.takeaway, closedDays: newDays }
                              })
                            }}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${isSelected
                                ? 'bg-red-100 text-red-700 border-2 border-red-300'
                                : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                              }`}
                          >
                            {isSelected ? '✕ ' : ''}{day.label}
                          </button>
                        )
                      })}
                    </div>
                    {localConfig.takeaway.closedDays && localConfig.takeaway.closedDays.length > 0 && (
                      <p className="text-sm text-amber-600 mt-2">
                        {t('closedLabel')} {localConfig.takeaway.closedDays
                          .sort((a, b) => a - b)
                          .map(d => DAYS_OF_WEEK.find(day => day.value === d)?.label)
                          .join(', ')}
                      </p>
                    )}
                  </div>

                  {/* Operating Hours */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('openingHour')}
                      </label>
                      <select
                        value={localConfig.takeaway.openingHour}
                        onChange={(e) => setLocalConfig({
                          ...localConfig,
                          takeaway: { ...localConfig.takeaway, openingHour: parseInt(e.target.value) }
                        })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        {Array.from({ length: 24 }, (_, i) => (
                          <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('closingHour')}
                      </label>
                      <select
                        value={localConfig.takeaway.closingHour}
                        onChange={(e) => setLocalConfig({
                          ...localConfig,
                          takeaway: { ...localConfig.takeaway, closingHour: parseInt(e.target.value) }
                        })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        {Array.from({ length: 24 }, (_, i) => (
                          <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500">
                    {t('pickupHoursNotice', {
                      opening: localConfig.takeaway.openingHour.toString().padStart(2, '0'),
                      closing: localConfig.takeaway.closingHour.toString().padStart(2, '0')
                    })}
                  </p>
                </>
              )}

              {!localConfig.takeaway.enabled && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm text-amber-800">
                    <strong>{t('takeawayDisabledLabel')}</strong> {t('takeawayDisabledNotice')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="flex-1 py-2 border rounded-lg hover:bg-gray-100"
          >
            {tc('cancel')}
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            {t('saveConfig')}
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
  const [selectedIngredients, setSelectedIngredients] = useState<{ id: string; isPrimary: boolean; substituteId?: string }[]>([])
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
              isPrimary: false,
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
      return [...prev, { id: ingredientId, isPrimary: false }]
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
      setSelectedIngredients(prev => [...prev, { id: newIng.id, isPrimary: false }])
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
          await setMenuItemIngredients(savedItemId, selectedIngredients.map(i => ({ id: i.id, isPrimary: false })))
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

// ============ TABLES TAB ============

interface TablesTabProps {
  tables: Table[]
  t: ReturnType<typeof useTranslations<'admin'>>
}

function TablesTab({ tables, t, onUpdate }: TablesTabProps & { onUpdate: () => void }) {
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [customers, setCustomers] = useState<TableCustomer[]>([])
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [resetting, setResetting] = useState<string | null>(null)

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

  const handleViewCustomers = async (table: Table) => {
    setSelectedTable(table)
    setLoadingCustomers(true)
    try {
      const data = await getTableCustomers(table.id)
      setCustomers(data || [])
    } catch (err) {
      console.error('Failed to load customers:', err)
      setCustomers([])
    } finally {
      setLoadingCustomers(false)
    }
  }

  const handleResetTable = async (tableId: string) => {
    if (!confirm(t('confirmResetTable'))) return

    setResetting(tableId)
    try {
      await resetTable(tableId)
      onUpdate()
      if (selectedTable?.id === tableId) {
        setSelectedTable(null)
        setCustomers([])
      }
    } catch (err) {
      console.error('Failed to reset table:', err)
      alert(t('resetTableError'))
    } finally {
      setResetting(null)
    }
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
            className="bg-white rounded-xl p-4 shadow-sm border text-center relative"
          >
            <div className="text-3xl font-bold text-gray-900 mb-2">
              {table.number}
            </div>
            <div className="text-sm text-gray-500 mb-3">
              {table.seats} {t('seats')}
            </div>
            <span
              className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusColors[table.status]
                }`}
            >
              {statusLabels[table.status]}
            </span>

            {/* Action buttons */}
            <div className="mt-3 flex gap-2 justify-center">
              <button
                onClick={() => handleViewCustomers(table)}
                className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition"
                title={t('viewCustomers')}
              >
                <Users className="w-4 h-4" />
              </button>
              {table.status === 'OCCUPIED' && (
                <button
                  onClick={() => handleResetTable(table.id)}
                  disabled={resetting === table.id}
                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                  title={t('resetTable')}
                >
                  {resetting === table.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Customers Modal */}
      {selectedTable && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-bold text-lg">
                {t('table')} {selectedTable.number} - {t('customers')}
              </h3>
              <button
                onClick={() => setSelectedTable(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {loadingCustomers ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : customers.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  {t('noCustomers')}
                </p>
              ) : (
                <div className="space-y-2">
                  {customers.map((customer) => (
                    <div
                      key={customer.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                        <Users className="w-4 h-4 text-primary-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{customer.name}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(customer.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {customer.isHost && (
                        <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-full">
                          Host
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {customers.length > 0 && (
              <div className="p-4 border-t">
                <button
                  onClick={() => handleResetTable(selectedTable.id)}
                  disabled={resetting === selectedTable.id}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50"
                >
                  {resetting === selectedTable.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  {t('resetTable')} ({customers.length} {t('customers')})
                </button>
              </div>
            )}
          </div>
        </div>
      )}
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
  // Sostituti
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

  // Load ingredients on mount
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
      alert(t('createIngredientError'))
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
      // Se appena segnato come esaurito → apri selettore sostituto
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
      alert(t('saveSubstituteError'))
    } finally {
      setSavingSubstitute(false)
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
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
        >
          <Plus className="w-4 h-4" />
          {t('addIngredient')}
        </button>
      </div>

      {/* Add Ingredient Form */}
      {showAddForm && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <h3 className="font-semibold text-green-800 mb-3">{t('newIngredientTitle')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('ingredientNameIt')}
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
              {t('createIngredient')}
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
              {tc('cancel')}
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
                        {tc('edit')}
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
                      {t('addSubstitute')}
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

      {/* Modal selettore sostituto */}
      {substitutePickerFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-1">{t('outOfStockIngredientTitle')}</h3>
            <p className="text-gray-600 text-sm mb-4">
              {t('outOfStockIngredientPrompt', { name: substitutePickerFor.name })}

            </p>
            <select
              value={selectedSubstituteId}
              onChange={(e) => setSelectedSubstituteId(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm mb-4 focus:ring-2 focus:ring-primary-500"
            >
              <option value="">{t('noSubstitute')}</option>
              {ingredients
                .filter(i => i.id !== substitutePickerFor.id)
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(i => (
                  <option key={i.id} value={i.id}>
                    {i.name}{!i.inStock ? ` (${t('outOfStock').toLowerCase()})` : ''}
                  </option>
                ))}
            </select>
            <div className="flex gap-3">
              <button
                onClick={() => setSubstitutePickerFor(null)}
                className="flex-1 px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
              >
                {t('skip')}
              </button>
              <button
                onClick={handleSaveSubstitute}
                disabled={savingSubstitute}
                className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg text-sm hover:bg-primary-600 disabled:opacity-50 transition"
              >
                {savingSubstitute ? t('saving') : t('saveSubstitute')}
              </button>
            </div>
          </div>
        </div>
      )}
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

// ============ REPORTS TAB ============

interface ReportsTabProps {
  t: ReturnType<typeof useTranslations<'admin'>>
  tc: ReturnType<typeof useTranslations<'common'>>
}

function ReportsTab({ t, tc }: ReportsTabProps) {
  const [period, setPeriod] = useState<'week' | 'month'>('week')
  const [topProducts, setTopProducts] = useState<TopProductsReport | null>(null)
  const [peakHours, setPeakHours] = useState<PeakHoursReport | null>(null)
  const [summary, setSummary] = useState<SummaryReport | null>(null)
  const [loading, setLoading] = useState(true)

  const loadReports = useCallback(async () => {
    setLoading(true)
    try {
      const [productsData, hoursData, summaryData] = await Promise.all([
        getTopProducts(period),
        getPeakHours(period),
        getSummaryReport(period)
      ])
      setTopProducts(productsData)
      setPeakHours(hoursData)
      setSummary(summaryData)
    } catch (err) {
      console.error('Failed to load reports:', err)
    }
    setLoading(false)
  }, [period])

  useEffect(() => {
    loadReports()
  }, [loadReports])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount / 100) // Convert cents to euros
  }

  const maxQuantity = topProducts?.products?.[0]?.totalQuantity || 1
  const maxOrders = Math.max(...(peakHours?.hourlyData?.map(h => h.orderCount) || [1]))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <BarChart3 className="w-6 h-6" />
          {t('reportsTitle')}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setPeriod('week')}
            className={`px-4 py-2 rounded-lg font-medium transition ${period === 'week'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
          >
            {t('periodWeek')}
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-4 py-2 rounded-lg font-medium transition ${period === 'month'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
          >
            {t('periodMonth')}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-4 shadow">
                <div className="text-2xl font-bold text-primary-600">{summary.totalOrders}</div>
                <div className="text-sm text-gray-500">{t('totalOrders')}</div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow">
                <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalRevenue)}</div>
                <div className="text-sm text-gray-500">{t('totalRevenue')}</div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow">
                <div className="text-2xl font-bold text-blue-600">{formatCurrency(summary.averageOrderValue)}</div>
                <div className="text-sm text-gray-500">{t('averageOrder')}</div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow">
                <div className="text-2xl font-bold text-purple-600">{summary.totalItems}</div>
                <div className="text-sm text-gray-500">{t('totalItems')}</div>
              </div>
            </div>
          )}

          {/* Order Types */}
          {summary && (
            <div className="bg-white rounded-lg p-4 shadow">
              <h3 className="font-bold mb-4">{t('orders')}</h3>
              <div className="flex gap-4">
                <div className="flex-1 text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-xl font-bold text-blue-600">{summary.ordersByType.DINE_IN}</div>
                  <div className="text-sm text-gray-500">{t('dineIn')}</div>
                </div>
                <div className="flex-1 text-center p-3 bg-orange-50 rounded-lg">
                  <div className="text-xl font-bold text-orange-600">{summary.ordersByType.TAKEAWAY}</div>
                  <div className="text-sm text-gray-500">{t('takeaway')}</div>
                </div>
                <div className="flex-1 text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-xl font-bold text-green-600">{summary.ordersByType.COUNTER}</div>
                  <div className="text-sm text-gray-500">{t('counter')}</div>
                </div>
              </div>
            </div>
          )}

          {/* Top Products Chart */}
          <div className="bg-white rounded-lg p-4 shadow">
            <h3 className="font-bold mb-4">{t('topProducts')}</h3>
            {topProducts?.products && topProducts.products.length > 0 ? (
              <div className="space-y-3">
                {topProducts.products.map((product, index) => (
                  <div key={product.menuItemId} className="flex items-center gap-3">
                    <div className="w-6 text-center font-bold text-gray-400">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="font-medium truncate">{product.name}</span>
                        <span className="text-sm text-gray-500">{product.totalQuantity} {t('quantity').toLowerCase()}</span>
                      </div>
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-500 rounded-full transition-all duration-500"
                          style={{ width: `${(product.totalQuantity / maxQuantity) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">{t('noData')}</p>
            )}
          </div>

          {/* Peak Hours Chart */}
          <div className="bg-white rounded-lg p-4 shadow">
            <h3 className="font-bold mb-4">{t('peakHours')}</h3>
            {peakHours?.hourlyData && (
              <div className="overflow-x-auto">
                <div className="flex items-end gap-1 min-w-[600px] h-40">
                  {peakHours.hourlyData
                    .filter(h => h.hour >= 8 && h.hour <= 23) // Show only business hours
                    .map((hourData) => {
                      const isPeak = peakHours.peakHours.includes(hourData.hour)
                      const height = maxOrders > 0 ? (hourData.orderCount / maxOrders) * 100 : 0
                      return (
                        <div key={hourData.hour} className="flex-1 flex flex-col items-center">
                          <div
                            className={`w-full rounded-t transition-all duration-500 ${isPeak ? 'bg-primary-500' : 'bg-gray-300'
                              }`}
                            style={{ height: `${Math.max(height, 4)}%` }}
                            title={`${hourData.orderCount} ${t('orders').toLowerCase()}`}
                          />
                          <div className="text-xs text-gray-500 mt-1">{hourData.hour}</div>
                        </div>
                      )
                    })}
                </div>
                <div className="flex justify-center gap-4 mt-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-primary-500 rounded" />
                    <span>{t('peakHours')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-300 rounded" />
                    <span>{t('orders')}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ============ PRICES TAB ============

interface PricesTabProps {
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

function PricesTab({ categories, onUpdate, t, tc }: PricesTabProps) {
  const [editedPrices, setEditedPrices] = useState<PriceEditState>({})
  const [savingItems, setSavingItems] = useState<Set<string>>(new Set())
  const [savedItems, setSavedItems] = useState<Set<string>>(new Set())
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  // Initialize all categories as expanded
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
    // Remove from saved items if edited again
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

      // Mark as saved
      setSavedItems(prev => new Set(prev).add(item.id))

      // Clear from edited prices
      setEditedPrices(prev => {
        const next = { ...prev }
        delete next[item.id]
        return next
      })

      await onUpdate()

      // Remove saved indicator after 2 seconds
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



