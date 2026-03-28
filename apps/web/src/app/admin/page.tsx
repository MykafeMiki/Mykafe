'use client'

import { useState, useEffect } from 'react'
import { LogOut } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { getAdminCategories, getTables, setAuthToken, getAuthToken, verifyToken } from '@/lib/api'
import { fetchClosureConfig, saveClosureConfigToServer, DEFAULT_CLOSURE_CONFIG, type ClosureConfig } from '@/lib/menuTimers'
import { LoginScreen } from '@/components/admin/LoginScreen'
import { MenuTab } from '@/components/admin/MenuTab'
import { IngredientsTab } from '@/components/admin/IngredientsTab'
import { TablesTab } from '@/components/admin/TablesTab'
import { QRTab } from '@/components/admin/QRTab'
import { ReportsTab } from '@/components/admin/ReportsTab'
import { PricesTab } from '@/components/admin/PricesTab'
import { ClosureConfigModal } from '@/components/admin/ClosureConfigModal'
import type { Category, Table } from '@shared/types'

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
  const [closureBannerConfig, setClosureBannerConfig] = useState<ClosureConfig>(DEFAULT_CLOSURE_CONFIG)
  const [showClosureBannerModal, setShowClosureBannerModal] = useState(false)

  // Check auth on mount
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

      {/* Barra Chiusura Locale */}
      <div className={`flex items-center justify-between px-4 py-3 ${isClosed ? 'bg-red-600' : 'bg-green-600'} text-white`}>
        <div className="flex items-center gap-3">
          <span className="text-xl">{isClosed ? '🔒' : '✅'}</span>
          <div>
            <p className="font-bold text-sm leading-tight">
              {isClosed ? 'LOCALE CHIUSO' : 'Locale Aperto'}
            </p>
            <p className="text-xs opacity-80">
              {isClosed
                ? (closureBannerConfig.temporaryClosure.message || 'Chiusura in corso')
                : 'I clienti possono ordinare'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowClosureBannerModal(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/20 hover:bg-white/30 transition"
          >
            Programma
          </button>
          <button
            onClick={handleBannerToggle}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition shadow ${isClosed ? 'bg-white text-green-700 hover:bg-green-50' : 'bg-white text-red-700 hover:bg-red-50'}`}
          >
            {isClosed ? '✅ Riapri' : '🔒 Chiudi Ora'}
          </button>
        </div>
      </div>

      {/* Modale chiusure programmate */}
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
