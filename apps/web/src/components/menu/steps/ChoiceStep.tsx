'use client'

import { User, Users, ArrowLeft } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { LanguageSelectorCompact } from '@/components/LanguageSelector'

export interface ChoiceStepProps {
  tableNumber: number | null
  customerName: string
  onGoBack: () => void
  onSingleTable: () => void
  onMergeTables: () => void
}

export function ChoiceStep({
  tableNumber,
  customerName,
  onGoBack,
  onSingleTable,
  onMergeTables,
}: ChoiceStepProps) {
  const t = useTranslations('tableMenu')
  const tc = useTranslations('common')

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-primary-500 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onGoBack}
              className="flex items-center gap-2 px-4 py-2.5 -ml-1 rounded-xl bg-white/20 hover:bg-white/30 active:bg-white/40 transition font-semibold text-base shadow"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Indietro</span>
            </button>
            <div>
              <h1 className="text-xl font-bold">MyKafe</h1>
              {tableNumber && (
                <p className="text-primary-100">{t('table')} {tableNumber}</p>
              )}
            </div>
          </div>
          <LanguageSelectorCompact />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
            {t('singleTable')}
          </h2>

          <button
            onClick={onSingleTable}
            className="w-full flex items-center gap-4 p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-primary-500 hover:bg-primary-50 transition"
          >
            <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center">
              <User className="w-7 h-7 text-primary-600" />
            </div>
            <div className="text-left">
              <span className="block font-semibold text-lg text-gray-900">
                {tc('yes')}
              </span>
              <span className="text-sm text-gray-500">
                {t('singleTableDesc')}
              </span>
            </div>
          </button>

          <button
            onClick={onMergeTables}
            className="w-full flex items-center gap-4 p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-orange-500 hover:bg-orange-50 transition"
          >
            <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center">
              <Users className="w-7 h-7 text-orange-600" />
            </div>
            <div className="text-left">
              <span className="block font-semibold text-lg text-gray-900">
                {t('mergeTables')}
              </span>
              <span className="text-sm text-gray-500">
                {t('mergeTablesDesc')}
              </span>
            </div>
          </button>
        </div>
      </main>
    </div>
  )
}
