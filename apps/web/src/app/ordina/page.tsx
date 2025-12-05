'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { CheckCircle, ShoppingBag, Banknote, CreditCard, Calendar, Clock, AlertTriangle } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import { CategoryNav } from '@/components/menu/CategoryNav'
import { MenuItemCard } from '@/components/menu/MenuItemCard'
import { ItemModal } from '@/components/menu/ItemModal'
import { CartButton } from '@/components/cart/CartButton'
import { TakeawayCartDrawer } from '@/components/cart/TakeawayCartDrawer'
import { LanguageSelectorCompact } from '@/components/LanguageSelector'
import { useCart } from '@/lib/cart'
import { getMenu, getTableByQr } from '@/lib/api'
import { filterCategoriesByTime } from '@/lib/menuTimers'
import { getTranslatedName, getTranslatedDescription } from '@/lib/translations'
import type { Category, MenuItem, Modifier } from '@shared/types'
import { ConsumeMode, PaymentMethod } from '@shared/types'
import { cn } from '@/lib/utils'

type OrderStep = 'menu' | 'payment' | 'datetime'

function getAvailableDates(): Date[] {
  const dates: Date[] = []
  const today = new Date()

  for (let i = 0; i < 7; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    dates.push(date)
  }

  return dates
}

function getAvailableTimeSlots(selectedDate: Date): string[] {
  const slots: string[] = []
  const now = new Date()
  const isToday = selectedDate.toDateString() === now.toDateString()

  const openingHour = 8
  const closingHour = 20

  for (let hour = openingHour; hour < closingHour; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const slotTime = new Date(selectedDate)
      slotTime.setHours(hour, minute, 0, 0)

      if (isToday && slotTime <= now) {
        continue
      }

      const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      slots.push(timeStr)
    }
  }

  return slots
}

function isWithin30Minutes(selectedDate: Date, selectedTime: string): boolean {
  const now = new Date()
  const [hours, minutes] = selectedTime.split(':').map(Number)
  const pickupTime = new Date(selectedDate)
  pickupTime.setHours(hours, minutes, 0, 0)

  const diffMs = pickupTime.getTime() - now.getTime()
  const diffMinutes = diffMs / (1000 * 60)

  return diffMinutes < 30
}

export default function OrdinaPage() {
  const t = useTranslations('ordina')
  const tc = useTranslations('common')
  const locale = useLocale()

  const [step, setStep] = useState<OrderStep>('menu')
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [categories, setCategories] = useState<Category[]>([])
  const [activeCategory, setActiveCategory] = useState<string>('')
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null)

  const categoryRefs = useRef<Record<string, HTMLElement | null>>({})
  const setTableIdInCart = useCart((state) => state.setTableId)
  const setPickupTime = useCart((state) => state.setPickupTime)
  const addToCart = useCart((state) => state.addItem)

  // Filter categories - takeaway context shows panini always, but still respects sushi timer
  const filteredCategories = useMemo(() => {
    return filterCategoriesByTime(categories, 'takeaway')
  }, [categories])

  const availableDates = getAvailableDates()
  const availableTimeSlots = getAvailableTimeSlots(selectedDate)
  const showWarning = selectedTime && isWithin30Minutes(selectedDate, selectedTime)

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

  useEffect(() => {
    async function loadData() {
      try {
        const table = await getTableByQr('takeaway')
        setTableIdInCart(table.id)

        const menuData = await getMenu()
        setCategories(menuData)
        if (menuData.length > 0) {
          // Set active category to first filtered category
          const filtered = filterCategoriesByTime(menuData, 'takeaway')
          if (filtered.length > 0) {
            setActiveCategory(filtered[0].id)
          }
        }
      } catch (err) {
        setError(tc('error'))
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [setTableIdInCart, tc])

  useEffect(() => {
    if (selectedDate && selectedTime) {
      const [hours, minutes] = selectedTime.split(':').map(Number)
      const pickupDateTime = new Date(selectedDate)
      pickupDateTime.setHours(hours, minutes, 0, 0)
      setPickupTime(pickupDateTime.toISOString())
    }
  }, [selectedDate, selectedTime, setPickupTime])

  const scrollToCategory = (categoryId: string) => {
    setActiveCategory(categoryId)
    categoryRefs.current[categoryId]?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  const handleAddItem = (item: MenuItem) => {
    if (item.modifierGroups && item.modifierGroups.length > 0) {
      setSelectedItem(item)
    } else {
      addToCart(item, 1, [], undefined, ConsumeMode.TAKEAWAY)
    }
  }

  const handleAddWithModifiers = (
    quantity: number,
    modifiers: Modifier[],
    notes?: string,
    consumeMode?: ConsumeMode
  ) => {
    if (selectedItem) {
      addToCart(selectedItem, quantity, modifiers, notes, ConsumeMode.TAKEAWAY)
    }
  }

  const handleOrderSuccess = () => {
    setOrderSuccess(true)
    setTimeout(() => setOrderSuccess(false), 5000)
  }

  const handleContinueToCart = () => {
    if (selectedTime) {
      setIsCartOpen(true)
    }
  }

  const handleSelectPayment = (method: PaymentMethod) => {
    setPaymentMethod(method)
    setStep('datetime')
  }

  const handleCheckout = () => {
    // When user wants to checkout, first select payment method
    setStep('payment')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-500">{tc('loading')}</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg"
          >
            {tc('retry')}
          </button>
        </div>
      </div>
    )
  }

  // Step 3: Date/Time Selection (after payment choice)
  if (step === 'datetime') {
    const paymentLabel = paymentMethod === PaymentMethod.CARD ? t('card') : t('cash')

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
            {t('subtitle')} • {paymentLabel}
          </p>
        </header>

        <main className="flex-1 p-6 max-w-lg mx-auto w-full">
          <button
            onClick={() => setStep('payment')}
            className="text-orange-500 mb-4 text-sm font-medium"
          >
            &larr; {tc('back')}
          </button>

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
                    setSelectedDate(date)
                    setSelectedTime('')
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
                    onClick={() => setSelectedTime(time)}
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
            onClick={handleContinueToCart}
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

  // Step 2: Payment Selection (first step after menu)
  if (step === 'payment') {
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
            <button
              onClick={() => setStep('menu')}
              className="text-orange-500 mb-4 text-sm font-medium"
            >
              &larr; {tc('back')}
            </button>

            <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
              {t('paymentQuestion')}
            </h2>
            <p className="text-gray-500 text-center mb-8">
              {t('selectPayment')}
            </p>

            <div className="space-y-4">
              <button
                onClick={() => handleSelectPayment(PaymentMethod.CASH)}
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
                onClick={() => handleSelectPayment(PaymentMethod.CARD)}
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

  // Menu view (initial step)
  // Build pickup time display if already selected
  const pickupTimeDisplay = selectedTime
    ? `${formatDate(selectedDate)} ${selectedTime}`
    : null

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-orange-500 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-6 h-6" />
            <div>
              <h1 className="text-xl font-bold">MyKafe</h1>
              <p className="text-orange-100 text-sm">{t('subtitle')}</p>
            </div>
          </div>
          <LanguageSelectorCompact />
        </div>
      </header>

      <CategoryNav
        categories={filteredCategories}
        activeCategory={activeCategory}
        onSelect={scrollToCategory}
      />

      <main className="p-4 space-y-8">
        {filteredCategories.map((category) => (
          <section
            key={category.id}
            ref={(el) => {
              categoryRefs.current[category.id] = el
            }}
            className="scroll-mt-20"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              {getTranslatedName(category, locale)}
            </h2>
            {getTranslatedDescription(category, locale) && (
              <p className="text-gray-500 text-sm mb-4">
                {getTranslatedDescription(category, locale)}
              </p>
            )}

            <div className="space-y-3">
              {category.items?.map((item) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  onAdd={handleAddItem}
                />
              ))}
            </div>
          </section>
        ))}
      </main>

      <CartButton onClick={handleCheckout} />

      <TakeawayCartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onOrderSuccess={handleOrderSuccess}
        paymentMethod={paymentMethod || PaymentMethod.CASH}
      />

      {selectedItem && (
        <ItemModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onAdd={handleAddWithModifiers}
          defaultConsumeMode={ConsumeMode.TAKEAWAY}
          hideConsumeModeSelector={true}
        />
      )}

      {orderSuccess && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-accent-500 text-white p-4 rounded-xl shadow-lg flex items-center gap-3 animate-in slide-in-from-top">
          <CheckCircle className="w-6 h-6" />
          <div>
            <p className="font-semibold">{t('orderSent')}</p>
            {pickupTimeDisplay && (
              <p className="text-sm text-accent-100">
                {t('pickupConfirmation', { time: pickupTimeDisplay })}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
