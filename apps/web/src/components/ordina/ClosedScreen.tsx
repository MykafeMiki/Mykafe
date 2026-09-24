'use client'

import { Clock, ShoppingBag } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { LanguageSelectorCompact } from '@/components/LanguageSelector'

export interface ClosedScreenProps {
  reason?: string
  nextOpenTime?: string
}

export function ClosedScreen({ reason, nextOpenTime }: ClosedScreenProps) {
  const t = useTranslations('ordina')

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-primary-500 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-6 h-6" />
            <h1 className="text-xl font-bold">MyKafe - {t('title')}</h1>
          </div>
          <LanguageSelectorCompact />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-primary-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Ordini Online Chiusi
          </h2>
          <p className="text-gray-600 mb-4">
            {reason || 'Il servizio di ordini online non è attualmente disponibile.'}
          </p>
          {nextOpenTime && (
            <div className="bg-primary-50 border border-primary-200 rounded-xl p-4">
              <p className="text-sm text-primary-800">
                <span className="font-semibold">Prossima apertura:</span>{' '}
                {nextOpenTime}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
