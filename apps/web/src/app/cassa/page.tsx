'use client'

import { useState, useEffect } from 'react'
import { CreditCard, Lock, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { adminLogin, verifyToken, setAuthToken, getAuthToken } from '@/lib/api'

export default function CassaPage() {
  const t = useTranslations('cassa')
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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">{tl('verifyingAccess')}</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <CassaLoginScreen onLogin={() => setIsAuthenticated(true)} t={tl} />
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-purple-600 text-white p-4">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-purple-200">{t('subtitle')}</p>
      </header>

      <main className="p-4 max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <CreditCard className="w-16 h-16 text-purple-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t('comingSoon')}</h2>
          <p className="text-gray-500">{t('comingSoonDesc')}</p>
        </div>
      </main>
    </div>
  )
}

interface CassaLoginScreenProps {
  onLogin: () => void
  t: ReturnType<typeof useTranslations<'login'>>
}

function CassaLoginScreen({ onLogin, t }: CassaLoginScreenProps) {
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
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Cassa MyKafe</h1>
            <p className="text-gray-500 mt-1">{t('enterPassword')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('password')}
                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                autoFocus
              />
            </div>

            {error && (
              <div className="text-red-500 text-sm text-center">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="w-full py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition"
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
