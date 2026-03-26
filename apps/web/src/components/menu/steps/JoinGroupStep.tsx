'use client'

import { Users, User, ArrowLeft } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { LanguageSelectorCompact } from '@/components/LanguageSelector'
import type { TableSession } from '@/lib/api'

export interface JoinGroupStepProps {
  tableNumber: number | null
  tableSession: TableSession
  onGoBack: () => void
  onJoinGroup: () => void
  onNotInGroup: () => void
}

export function JoinGroupStep({
  tableNumber,
  tableSession,
  onGoBack,
  onJoinGroup,
  onNotInGroup,
}: JoinGroupStepProps) {
  const t = useTranslations('tableMenu')
  const tc = useTranslations('common')

  const otherGroupTables = tableSession.linkedTables.filter(n => n !== tableNumber)

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
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-orange-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              {tableSession.hostCustomerName
                ? t('areYouWith', { name: tableSession.hostCustomerName })
                : t('groupExists')}
            </h2>
            <p className="text-gray-600 mt-2">
              {t('groupExistsDesc', { tables: otherGroupTables.join(', ') })}
            </p>
          </div>

          <button
            onClick={onJoinGroup}
            className="w-full flex items-center gap-4 p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-primary-500 hover:bg-primary-50 transition"
          >
            <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center">
              <Users className="w-7 h-7 text-primary-600" />
            </div>
            <div className="text-left">
              <span className="block font-semibold text-lg text-gray-900">
                {tc('yes')}
              </span>
              <span className="text-sm text-gray-500">
                {t('joinGroupDesc')}
              </span>
            </div>
          </button>

          <button
            onClick={onNotInGroup}
            className="w-full flex items-center gap-4 p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition"
          >
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
              <User className="w-7 h-7 text-gray-600" />
            </div>
            <div className="text-left">
              <span className="block font-semibold text-lg text-gray-900">
                {tc('no')}
              </span>
              <span className="text-sm text-gray-500">
                {t('notInGroupDesc')}
              </span>
            </div>
          </button>
        </div>
      </main>
    </div>
  )
}
