'use client'

import { useState, type KeyboardEvent } from 'react'
import { ArrowLeft, ArrowRight, Bike, KeyRound, PhoneCall } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { LanguageSelectorCompact } from '@/components/LanguageSelector'

// Il codice non compare mai in interfaccia: il cliente lo ottiene solo
// chiamando il driver, che cosi' conferma di poter fare la consegna.
const DELIVERY_CODE = '613'

export interface DriverCodeStepProps {
  driverPhone?: string
  onGoBack: () => void
  onContinue: () => void
}

export function DriverCodeStep({ driverPhone, onGoBack, onContinue }: DriverCodeStepProps) {
  const t = useTranslations('ordina')
  const [code, setCode] = useState('')
  const [error, setError] = useState(false)

  const handleContinue = () => {
    if (code.trim() === DELIVERY_CODE) {
      setError(false)
      onContinue()
    } else {
      setError(true)
    }
  }

  const handleEnter = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleContinue()
    }
  }

  const telHref = driverPhone ? `tel:${driverPhone.replace(/[^\d+]/g, '')}` : undefined

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-primary-500 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onGoBack} className="p-2 -ml-2 rounded-full hover:bg-primary-400 transition">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Bike className="w-6 h-6" />
              <h1 className="text-xl font-bold">MyKafe - {t('title')}</h1>
            </div>
          </div>
          <LanguageSelectorCompact />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">{t('driverTitle')}</h2>
          <p className="text-gray-500 text-center mb-6">{t('driverHint')}</p>

          {telHref ? (
            <a
              href={telHref}
              className="w-full flex items-center justify-center gap-3 py-4 mb-6 bg-amber-500 text-white font-semibold rounded-xl hover:bg-amber-600 transition"
            >
              <PhoneCall className="w-5 h-5" />
              {t('driverCall')} {driverPhone}
            </a>
          ) : (
            <p className="mb-6 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
              {t('driverNoPhone')}
            </p>
          )}

          <div className="space-y-3">
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value)
                  setError(false)
                }}
                onKeyDown={handleEnter}
                placeholder={t('driverCodePlaceholder')}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">
                {t('driverCodeWrong')}
              </p>
            )}

            <button
              onClick={handleContinue}
              disabled={!code.trim()}
              className="w-full flex items-center justify-center gap-2 py-4 bg-primary-500 text-white font-semibold rounded-xl hover:bg-primary-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('continue')}
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
