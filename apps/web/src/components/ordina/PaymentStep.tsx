'use client'

import { Banknote, CreditCard, ShoppingBag } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { LanguageSelectorCompact } from '@/components/LanguageSelector'
import { PaymentMethod } from '@shared/types'

export interface PaymentStepProps {
  onSelectPayment: (method: PaymentMethod) => void
}

export function PaymentStep({ onSelectPayment }: PaymentStepProps) {
  const t = useTranslations('ordina')

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-orange-500 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-6 h-6" />
            <h1 className="text-xl font-bold">MyKafe - {t('title')}</h1>
          </div>
          <LanguageSelectorCompact />
        </div>
        <p className="text-orange-100 text-sm mt-1">
          {t('subtitle')}
        </p>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
            {t('paymentQuestion')}
          </h2>
          <p className="text-gray-500 text-center mb-8">
            {t('selectPayment')}
          </p>

          <div className="space-y-4">
            <button
              onClick={() => onSelectPayment(PaymentMethod.CASH)}
              className="w-full flex items-center gap-4 p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 transition"
            >
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
                <Banknote className="w-7 h-7 text-green-600" />
              </div>
              <div className="text-left">
                <span className="block font-semibold text-lg text-gray-900">
                  {t('cashAtPickup')}
                </span>
                <span className="text-sm text-gray-500">
                  {t('cashDescription')}
                </span>
              </div>
            </button>

            <button
              onClick={() => onSelectPayment(PaymentMethod.CARD)}
              className="w-full flex items-center gap-4 p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition"
            >
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
                <CreditCard className="w-7 h-7 text-blue-600" />
              </div>
              <div className="text-left">
                <span className="block font-semibold text-lg text-gray-900">
                  {t('card')}
                </span>
                <span className="text-sm text-gray-500">
                  {t('cardDescription')}
                </span>
              </div>
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
