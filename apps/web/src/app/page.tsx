'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  UtensilsCrossed,
  ShoppingBag,
  Truck,
  ChefHat,
  CreditCard,
  Settings,
  QrCode,
  Lock,
  Loader2,
  LogOut
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { LanguageSelectorCompact } from '@/components/LanguageSelector'
import { adminLogin, verifyToken, setAuthToken, getAuthToken } from '@/lib/api'

export default function HomePage() {
  const t = useTranslations('home')
  const tl = useTranslations('login')
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const token = getAuthToken()
      if (!token) {
        setIsAuthenticated(false)
        setAuthLoading(false)
        return
      }
      try {
        await verifyToken()
        setIsAuthenticated(true)
      } catch {
        setAuthToken(null)
        setIsAuthenticated(false)
      }
      setAuthLoading(false)
    }
    checkAuth()
  }, [])

  const handleLogout = () => {
    setAuthToken(null)
    setIsAuthenticated(false)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">{tl('verifyingAccess')}</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <HomeLoginScreen onLogin={() => setIsAuthenticated(true)} t={tl} />
  }

  const menuItems = [
    {
      href: '/menu/tavolo1',
      icon: UtensilsCrossed,
      label: t('table'),
      description: t('tableDesc'),
      color: 'bg-blue-500 hover:bg-blue-600',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600'
    },
    {
      href: '/banco',
      icon: ShoppingBag,
      label: t('takeawayCounter'),
      description: t('takeawayCounterDesc'),
      color: 'bg-emerald-500 hover:bg-emerald-600',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600'
    },
    {
      href: '/ordina',
      icon: Truck,
      label: t('takeawayHome'),
      description: t('takeawayHomeDesc'),
      color: 'bg-orange-500 hover:bg-orange-600',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600'
    },
    {
      href: '/kitchen',
      icon: ChefHat,
      label: t('kitchen'),
      description: t('kitchenDesc'),
      color: 'bg-red-500 hover:bg-red-600',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600'
    },
    {
      href: '/cassa',
      icon: CreditCard,
      label: t('cashier'),
      description: t('cashierDesc'),
      color: 'bg-purple-500 hover:bg-purple-600',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600'
    },
    {
      href: '/admin',
      icon: Settings,
      label: t('admin'),
      description: t('adminDesc'),
      color: 'bg-gray-700 hover:bg-gray-800',
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-600'
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">MyKafe</h1>
            <p className="text-gray-500 mt-1">{t('subtitle')}</p>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSelectorCompact />
            <button
              onClick={handleLogout}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
              title={tl('logout') || 'Logout'}
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Menu Grid */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden border border-gray-100"
            >
              <div className="p-6">
                <div className={`w-14 h-14 ${item.iconBg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <item.icon className={`w-7 h-7 ${item.iconColor}`} />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">
                  {item.label}
                </h2>
                <p className="text-gray-500 text-sm">
                  {item.description}
                </p>
              </div>
              <div className={`h-1.5 ${item.color} opacity-80`} />
            </Link>
          ))}
        </div>

        {/* QR Code Info */}
        <div className="mt-8 bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <QrCode className="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">{t('qrTitle')}</h3>
              <p className="text-gray-500 text-sm mt-1">
                {t('qrDescription')}
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto px-4 py-6 text-center text-gray-400 text-sm">
        MyKafe &copy; {new Date().getFullYear()}
      </footer>
    </div>
  )
}

// ============ LOGIN SCREEN ============

interface HomeLoginScreenProps {
  onLogin: () => void
  t: ReturnType<typeof useTranslations<'login'>>
}

function HomeLoginScreen({ onLogin, t }: HomeLoginScreenProps) {
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
    } catch {
      setError(t('invalidPassword'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">MyKafe</h1>
            <p className="text-gray-500 mt-1">{t('enterPassword')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('password')}
                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                autoFocus
              />
            </div>

            {error && (
              <div className="text-red-500 text-sm text-center">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="w-full py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition"
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
