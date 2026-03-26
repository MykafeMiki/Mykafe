'use client'

import { Calendar, Clock, AlertTriangle, ArrowLeft, ShoppingBag, CreditCard, Banknote } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import { LanguageSelectorCompact } from '@/components/LanguageSelector'
import { cn } from '@/lib/utils'
import { PaymentMethod } from '@shared/types'

export interface DateTimeStepProps {
  selectedDate: Date
  selectedTime: string
  availableDates: Date[]
  availableTimeSlots: string[]
  showWarning: boolean
  paymentMethod: PaymentMethod | null
  onDateChange: (date: Date) => void
  onTimeChange: (time: string) => void
  onGoBack: () => void
  onContinue: () => void
}

export function DateTimeStep({
  selectedDate,
  selectedTime,
  availableDates,
  availableTimeSlots,
  showWarning,
  paymentMethod,
  onDateChange,
  onTimeChange,
  onGoBack,
  onContinue,
}: DateTimeStepProps) {
  const t = useTranslations('ordina')
  const tc = useTranslations('common')
  const locale = useLocale()

  const paymentLabel = paymentMethod === PaymentMethod.CARD ? t('card') : t('cashAtPickup')

  const formatDate = (date: Date): string => {
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)

    if (date.toDateString() === today.toDateString()) {
      return t('today')
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return t('tomorrow')
    } else {
      return date.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-orange-500 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onGoBack}
              className="p-2 -ml-2 rounded-full hover:bg-orange-400 transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-6 h-6" />
              <h1 className="text-xl font-bold">MyKafe - {t('title')}</h1>
            </div>
          </div>
          <LanguageSelectorCompact />
        </div>
        <p className="text-orange-100 text-sm mt-1 ml-10">
          {t('subtitle')} • {paymentLabel}
        </p>
      </header>

      <main className="flex-1 p-6 max-w-lg mx-auto w-full">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {t('pickupQuestion')}
        </h2>
        <p className="text-gray-500 mb-6">
          {t('selectDateTime')}
        </p>

        {/* Date Selection */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-5 h-5 text-gray-500" />
            <span className="font-medium text-gray-700">{t('day')}</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {availableDates.map((date) => (
              <button
                key={date.toISOString()}
                onClick={() => {
                  onDateChange(date)
                  onTimeChange('')
                }}
                className={cn(
                  'flex-shrink-0 px-4 py-3 rounded-xl border-2 transition text-center min-w-[100px]',
                  selectedDate.toDateString() === date.toDateString()
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                )}
              >
                <div className="font-semibold">{formatDate(date)}</div>
                <div className="text-xs text-gray-500">
                  {date.toLocaleDateString(locale, { day: 'numeric', month: 'short' })}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Time Selection */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-gray-500" />
            <span className="font-medium text-gray-700">{t('time')}</span>
          </div>
          {availableTimeSlots.length === 0 ? (
            <p className="text-gray-500 text-sm">
              {t('noTimeSlots')}
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {availableTimeSlots.map((time) => (
                <button
                  key={time}
                  onClick={() => onTimeChange(time)}
                  className={cn(
                    'py-2 px-3 rounded-lg border-2 transition text-sm font-medium',
                    selectedTime === time
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  )}
                >
                  {time}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Warning for short notice */}
        {showWarning && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0" />
            <div>
              <p className="font-medium text-amber-800">{t('shortNotice')}</p>
              <p className="text-sm text-amber-700">
                {t('shortNoticeWarning')}
              </p>
            </div>
          </div>
        )}

        {/* Continue Button */}
        <button
          onClick={onContinue}
          disabled={!selectedTime}
          className={cn(
            'w-full py-4 rounded-xl font-semibold text-lg transition',
            selectedTime
              ? 'bg-orange-500 text-white hover:bg-orange-600'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          )}
        >
          {tc('continue')}
        </button>
      </main>
    </div>
  )
}
