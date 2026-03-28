'use client'

import { useState } from 'react'
import { UserCircle, User } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { LanguageSelectorCompact } from '@/components/LanguageSelector'
import type { TableCustomer } from '@/lib/api'

export interface EnterNameStepProps {
  tableNumber: number | null
  customerName: string
  existingCustomers: TableCustomer[]
  isSelectingExisting: boolean
  loadingCustomers: boolean
  onCustomerNameChange: (name: string) => void
  onSubmitName: () => void
  onSelectExistingCustomer: (customer: TableCustomer) => void
  onToggleSelectingExisting: (selecting: boolean) => void
}

export function EnterNameStep({
  tableNumber,
  customerName,
  existingCustomers,
  isSelectingExisting,
  loadingCustomers,
  onCustomerNameChange,
  onSubmitName,
  onSelectExistingCustomer,
  onToggleSelectingExisting,
}: EnterNameStepProps) {
  const t = useTranslations('tableMenu')
  const tc = useTranslations('common')
  const hasExistingCustomers = existingCustomers.length > 0

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-primary-500 text-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">MyKafe</h1>
            {tableNumber && (
              <p className="text-primary-100">{t('table')} {tableNumber}</p>
            )}
          </div>
          <LanguageSelectorCompact />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserCircle className="w-10 h-10 text-primary-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              {t('welcome')}
            </h2>
            <p className="text-gray-600 mt-2">
              {hasExistingCustomers ? t('selectOrEnterName') : t('enterYourName')}
            </p>
          </div>

          {hasExistingCustomers && !isSelectingExisting && (
            <div className="mb-6">
              <p className="text-sm text-gray-500 mb-3 text-center">{t('alreadyAtTable')}</p>
              <div className="space-y-2">
                {existingCustomers.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => onSelectExistingCustomer(customer)}
                    className="w-full flex items-center gap-3 p-4 bg-white rounded-xl border-2 border-gray-200 hover:border-primary-500 hover:bg-primary-50 transition"
                  >
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-primary-600" />
                    </div>
                    <span className="font-medium text-gray-900">{customer.name}</span>
                    {customer.isHost && (
                      <span className="ml-auto text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-full">
                        Host
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-gray-50 text-gray-500">{t('orNewName')}</span>
                </div>
              </div>
            </div>
          )}

          <input
            type="text"
            value={customerName}
            onChange={(e) => onCustomerNameChange(e.target.value)}
            placeholder={t('namePlaceholder')}
            className="w-full px-4 py-4 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:outline-none text-lg text-center"
            autoFocus={!hasExistingCustomers}
          />

          <button
            onClick={onSubmitName}
            disabled={!customerName.trim() || loadingCustomers}
            className={`w-full mt-6 py-4 rounded-xl font-semibold text-lg transition ${
              customerName.trim() && !loadingCustomers
                ? 'bg-primary-500 text-white hover:bg-primary-600'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {loadingCustomers ? tc('loading') : tc('continue')}
          </button>
        </div>
      </main>
    </div>
  )
}
