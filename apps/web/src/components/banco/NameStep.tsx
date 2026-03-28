'use client'

import { User, Store } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { LanguageSelectorCompact } from '@/components/LanguageSelector'
import { cn } from '@/lib/utils'

export interface NameStepProps {
  customerName: string
  onCustomerNameChange: (name: string) => void
  onContinue: () => void
}

export function NameStep({
  customerName,
  onCustomerNameChange,
  onContinue,
}: NameStepProps) {
  const t = useTranslations('banco')
  const tc = useTranslations('common')

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-primary-500 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store className="w-6 h-6" />
            <h1 className="text-xl font-bold">MyKafe - {t('title')}</h1>
          </div>
          <LanguageSelectorCompact />
        </div>
        <p className="text-primary-100 text-sm mt-1">
          {t('subtitle')}
        </p>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <User className="w-10 h-10 text-primary-600" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
            {t('nameQuestion')}
          </h2>
          <p className="text-gray-500 text-center mb-8">
            {t('nameDescription')}
          </p>

          <div className="space-y-4">
            <input
              type="text"
              value={customerName}
              onChange={(e) => onCustomerNameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onContinue()
              }}
              placeholder={t('namePlaceholder')}
              autoFocus
              className="w-full px-4 py-4 text-lg border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none transition"
            />

            <button
              onClick={onContinue}
              disabled={!customerName.trim()}
              className={cn(
                'w-full py-4 rounded-xl font-semibold text-lg transition',
                customerName.trim()
                  ? 'bg-primary-500 text-white hover:bg-primary-600'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              )}
            >
              {tc('continue')}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
