'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { verifyToken, setAuthToken, getAuthToken } from '@/lib/api'
import { CassaLoginScreen } from '@/components/cassa/CassaLoginScreen'
import { CassaContent } from '@/components/cassa/CassaContent'

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
    return <CassaLoginScreen onLogin={() => setIsAuthenticated(true)} />
  }

  return <CassaContent t={t} />
}
