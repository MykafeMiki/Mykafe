'use client'

import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { LanguageSelectorCompact } from '@/components/LanguageSelector'

export interface BlockedStepProps {
  tableNumber: number | null
}

export function BlockedStep({ tableNumber }: BlockedStepProps) {
  const t = useTranslations('tableMenu')

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-red-500 text-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">MyKafe</h1>
            {tableNumber && (
              <p className="text-red-100">{t('table')} {tableNumber}</p>
            )}
          </div>
          <LanguageSelectorCompact />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <X className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {t('cannotOrder')}
          </h2>
          <p className="text-gray-600 mb-8">
            {t('scanAnotherTable')}
          </p>
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
            <p className="text-yellow-800 font-medium">
              {t('scanAnotherTableHint')}
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
