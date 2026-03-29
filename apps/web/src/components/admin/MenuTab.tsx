'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, QrCode, Edit, ToggleLeft, ToggleRight, Trash2, X, Upload, Image as ImageIcon, Loader2, Timer, Calendar } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { formatPrice } from '@/lib/utils'
import {
  getAdminCategories, updateCategory, uploadSectionImage, updateItemAvailability
} from '@/lib/api'
import {
  getSushiStatus, isSushiTimeActive, getTimerConfig, saveTimerConfig,
  DAYS_OF_WEEK, isOnlineOrderingOpen, DEFAULT_CLOSURE_CONFIG,
  fetchClosureConfig, saveClosureConfigToServer,
  type TimerConfig, type ClosureConfig
} from '@/lib/menuTimers'
import { menuSections, categoryToSectionMap, type MenuSection } from '@/components/menu/MenuSections'
import { CategoryModal } from './CategoryModal'
import { TimerConfigModal } from './TimerConfigModal'
import { ClosureConfigModal } from './ClosureConfigModal'
import { AdminItemModal } from './AdminItemModal'
import type { Category, MenuItem } from '@shared/types'

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://biefwzrprjqusjynqwus.supabase.co').replace('supabase.con', 'supabase.co')

export interface MenuTabProps {
  categories: Category[]
  onUpdate: () => Promise<void>
  t: ReturnType<typeof useTranslations<'admin'>>
  tc: ReturnType<typeof useTranslations<'common'>>
}

export function MenuTab({ categories, onUpdate, t, tc }: MenuTabProps) {
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

  const handleSectionImageUpload = async (sectionId: string, file: File) => {
    setUploadingSectionId(sectionId)
    try {
      await uploadSectionImage(sectionId, file)
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

  const specialCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes('sushi')
  )

  const sushiStatus = getSushiStatus()
  const isInSushiWindow = isSushiTimeActive()

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
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-500'
                }`}>
                {timerConfig.panini.enabled ? 'VISIBILI' : 'SEMPRE'}
              </span>
            </div>
            <p className="text-xs text-gray-600">
              {timerConfig.panini.enabled
                ? `Visibili dalle ${timerConfig.panini.startHour}:00 (solo menu bar/banco)`
                : 'Timer disabilitato - sempre visibili'
              }
            </p>
          </div>

          {/* Takeaway Service */}
          <div className="bg-white/70 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">🛒</span>
                <span className="font-medium text-gray-800">Takeaway</span>
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
                title={timerConfig.takeaway.enabled ? 'Disabilita Takeaway' : 'Abilita Takeaway'}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${timerConfig.takeaway.enabled ? 'left-7' : 'left-1'
                  }`} />
              </button>
            </div>

            <p className="text-xs text-gray-600">
              {!timerConfig.takeaway.enabled
                ? 'Servizio temporaneamente sospeso'
                : timerConfig.takeaway.closedDays?.length > 0
                  ? `${timerConfig.takeaway.openingHour}:00-${timerConfig.takeaway.closingHour}:00 | Chiuso: ${timerConfig.takeaway.closedDays.map(d => DAYS_OF_WEEK.find(day => day.value === d)?.label?.slice(0, 3)).join(', ')}`
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
                <span className="font-medium text-gray-800">Calendario Ordini Online</span>
                <p className="text-xs text-gray-500">
                  {closureConfig.enabled
                    ? (isOnlineOrderingOpen(closureConfig).isOpen ? 'Aperto ora' : `Chiuso — ${isOnlineOrderingOpen(closureConfig).reason || ''}`)
                    : 'Controllo calendario disabilitato'
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
            {closureConfig.temporaryClosure.active ? '✅ Riapri' : '🔒 Chiudi Ora'}
          </button>
        </div>
      </div>

      {/* Quick Toggle per categorie speciali */}
      {specialCategories.length > 0 && (
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-orange-800">{t('specialMenus')}</h3>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${isInSushiWindow
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600'
              }`}>
              <Timer className="w-3 h-3" />
              <span>{sushiStatus.statusText}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {specialCategories.map((cat) => (
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
            ))}
          </div>
        </div>
      )}

      {/* Section Images Management */}
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
                      const target = e.target as HTMLImageElement
                      if (target.src !== section.image) {
                        target.src = section.image
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

      {/* Menu Management */}
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
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="divide-y">
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
                          <div className="flex-shrink-0">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="w-12 h-12 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                                <ImageIcon className="w-6 h-6 text-gray-300" />
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
        <AdminItemModal
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
