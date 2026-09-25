'use client'

import { Bike, ShoppingBag, Store, ArrowLeft } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { LanguageSelectorCompact } from '@/components/LanguageSelector'

export type ServiceType = 'takeaway' | 'delivery'

export interface ServiceStepProps {
  onSelect: (service: ServiceType) => void
  onGoBack: () => void
}

/** Secondo passo: ritiro in negozio o consegna a domicilio */
export function ServiceStep({ onSelect, onGoBack }: ServiceStepProps) {
  const t = useTranslations('ordina')

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-primary-500 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onGoBack} className="p-2 -ml-2 rounded-full hover:bg-primary-400 transition">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-6 h-6" />
              <h1 className="text-xl font-bold">MyKafe - {t('title')}</h1>
            </div>
          </div>
          <LanguageSelectorCompact />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">{t('serviceQuestion')}</h2>
          <p className="text-gray-500 text-center mb-8">{t('serviceHint')}</p>

          <div className="space-y-4">
            <button
              onClick={() => onSelect('takeaway')}
              className="w-full flex items-center gap-4 p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-primary-500 hover:bg-primary-50 transition"
            >
              <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center">
                <Store className="w-7 h-7 text-primary-600" />
              </div>
              <div className="text-left">
                <span className="block font-semibold text-lg text-gray-900">{t('serviceTakeaway')}</span>
                <span className="text-sm text-gray-500">{t('serviceTakeawayDesc')}</span>
              </div>
            </button>

            <button
              onClick={() => onSelect('delivery')}
              className="w-full flex items-center gap-4 p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-amber-500 hover:bg-amber-50 transition"
            >
              <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center">
                <Bike className="w-7 h-7 text-amber-600" />
              </div>
              <div className="text-left">
                <span className="block font-semibold text-lg text-gray-900">{t('serviceDelivery')}</span>
                <span className="text-sm text-gray-500">{t('serviceDeliveryDesc')}</span>
              </div>
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
