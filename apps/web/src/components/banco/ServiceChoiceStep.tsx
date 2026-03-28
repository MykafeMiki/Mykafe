'use client'

import { ShoppingBag, UtensilsCrossed, ArrowLeft, Store } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { LanguageSelectorCompact } from '@/components/LanguageSelector'

export interface ServiceChoiceStepProps {
  customerName: string
  onGoBack: () => void
  onSelectTakeaway: () => void
  onSelectDineIn: () => void
}

export function ServiceChoiceStep({
  customerName,
  onGoBack,
  onSelectTakeaway,
  onSelectDineIn,
}: ServiceChoiceStepProps) {
  const t = useTranslations('banco')
  const tc = useTranslations('common')

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-primary-500 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onGoBack}
              className="p-2 -ml-2 rounded-full hover:bg-primary-400 transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Store className="w-6 h-6" />
              <h1 className="text-xl font-bold">MyKafe</h1>
            </div>
          </div>
          <LanguageSelectorCompact />
        </div>
        <p className="text-primary-100 text-sm mt-1 ml-10">
          {t('title')} • {customerName}
        </p>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
            {t('serviceQuestion')}
          </h2>

          <button
            onClick={onSelectTakeaway}
            className="w-full flex items-center gap-4 p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-orange-500 hover:bg-orange-50 transition"
          >
            <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center">
              <ShoppingBag className="w-7 h-7 text-orange-600" />
            </div>
            <div className="text-left">
              <span className="block font-semibold text-lg text-gray-900">
                {t('takeaway')}
              </span>
              <span className="text-sm text-gray-500">
                {t('takeawayDesc')}
              </span>
            </div>
          </button>

          <button
            onClick={onSelectDineIn}
            className="w-full flex items-center gap-4 p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-primary-500 hover:bg-primary-50 transition"
          >
            <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center">
              <UtensilsCrossed className="w-7 h-7 text-primary-600" />
            </div>
            <div className="text-left">
              <span className="block font-semibold text-lg text-gray-900">
                {t('dineIn')}
              </span>
              <span className="text-sm text-gray-500">
                {t('dineInDesc')}
              </span>
            </div>
          </button>
        </div>
      </main>
    </div>
  )
}
