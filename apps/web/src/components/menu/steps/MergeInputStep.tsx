'use client'

import { Link2, ArrowLeft } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { LanguageSelectorCompact } from '@/components/LanguageSelector'

export interface MergeInputStepProps {
  tableNumber: number | null
  mergeInput: string
  mergeError: string | null
  creatingSession: boolean
  onMergeInputChange: (input: string) => void
  onGoBack: () => void
  onConfirmMerge: () => void
}

export function MergeInputStep({
  tableNumber,
  mergeInput,
  mergeError,
  creatingSession,
  onMergeInputChange,
  onGoBack,
  onConfirmMerge,
}: MergeInputStepProps) {
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

      <main className="flex-1 p-6 max-w-md mx-auto w-full">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
            <Link2 className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {t('mergeTables')}
            </h2>
            <p className="text-gray-500 text-sm">
              {t('table')} {tableNumber}
            </p>
          </div>
        </div>

        <p className="text-gray-600 mb-4">
          {t('enterTableNumbers')}
        </p>

        <input
          type="text"
          value={mergeInput}
          onChange={(e) => onMergeInputChange(e.target.value)}
          placeholder={t('tableNumbersPlaceholder')}
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:outline-none text-lg"
        />

        {mergeError && (
          <p className="text-red-500 text-sm mt-2">{mergeError}</p>
        )}

        <button
          onClick={onConfirmMerge}
          disabled={!mergeInput.trim() || creatingSession}
          className={`w-full mt-6 py-4 rounded-xl font-semibold text-lg transition ${
            mergeInput.trim() && !creatingSession
              ? 'bg-primary-500 text-white hover:bg-primary-600'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {creatingSession ? tc('loading') : t('confirmMerge')}
        </button>
      </main>
    </div>
  )
}
