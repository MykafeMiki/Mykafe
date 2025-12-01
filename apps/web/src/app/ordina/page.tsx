'use client'

import { useState, useEffect, useRef } from 'react'
import { CheckCircle, ShoppingBag, Banknote, CreditCard, Calendar, Clock, AlertTriangle } from 'lucide-react'
import { CategoryNav } from '@/components/menu/CategoryNav'
import { MenuItemCard } from '@/components/menu/MenuItemCard'
import { ItemModal } from '@/components/menu/ItemModal'
import { CartButton } from '@/components/cart/CartButton'
import { TakeawayCartDrawer } from '@/components/cart/TakeawayCartDrawer'
import { useCart } from '@/lib/cart'
import { getMenu, getTableByQr } from '@/lib/api'
import type { Category, MenuItem, Modifier } from '@shared/types'
import { ConsumeMode, PaymentMethod } from '@shared/types'
import { cn } from '@/lib/utils'

type OrderStep = 'datetime' | 'payment' | 'menu'

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

function formatDate(date: Date): string {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  if (date.toDateString() === today.toDateString()) {
    return 'Oggi'
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return 'Domani'
  } else {
    return date.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
  }
}

function getAvailableTimeSlots(selectedDate: Date): string[] {
  const slots: string[] = []
  const now = new Date()
  const isToday = selectedDate.toDateString() === now.toDateString()

  // Opening hours: 8:00 - 20:00
  const openingHour = 8
  const closingHour = 20

  for (let hour = openingHour; hour < closingHour; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const slotTime = new Date(selectedDate)
      slotTime.setHours(hour, minute, 0, 0)

      // Skip past times for today
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
  const [step, setStep] = useState<OrderStep>('datetime')
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

  const availableDates = getAvailableDates()
  const availableTimeSlots = getAvailableTimeSlots(selectedDate)
  const showWarning = selectedTime && isWithin30Minutes(selectedDate, selectedTime)

  useEffect(() => {
    async function loadData() {
      try {
        // Load takeaway table
        const table = await getTableByQr('takeaway')
        setTableIdInCart(table.id)

        // Load menu
        const menuData = await getMenu()
        setCategories(menuData)
        if (menuData.length > 0) {
          setActiveCategory(menuData[0].id)
        }
      } catch (err) {
        setError('Errore nel caricamento del menu')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [setTableIdInCart])

  // Update pickup time in cart when date/time changes
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

  const handleContinueToPayment = () => {
    if (selectedTime) {
      setStep('payment')
    }
  }

  const handleSelectPayment = (method: PaymentMethod) => {
    setPaymentMethod(method)
    setStep('menu')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Caricamento...</div>
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
            Riprova
          </button>
        </div>
      </div>
    )
  }

  // Step 1: Date/Time Selection
  if (step === 'datetime') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-orange-500 text-white p-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-6 h-6" />
            <h1 className="text-xl font-bold">MyKafe - Ordina Online</h1>
          </div>
          <p className="text-orange-100 text-sm mt-1">
            Ordina e ritira in negozio
          </p>
        </header>

        <main className="flex-1 p-6 max-w-lg mx-auto w-full">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Quando vuoi ritirare?
          </h2>
          <p className="text-gray-500 mb-6">
            Seleziona giorno e orario per il ritiro
          </p>

          {/* Date Selection */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-5 h-5 text-gray-500" />
              <span className="font-medium text-gray-700">Giorno</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {availableDates.map((date) => (
                <button
                  key={date.toISOString()}
                  onClick={() => {
                    setSelectedDate(date)
                    setSelectedTime('') // Reset time when date changes
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
                    {date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Time Selection */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-5 h-5 text-gray-500" />
              <span className="font-medium text-gray-700">Orario</span>
            </div>
            {availableTimeSlots.length === 0 ? (
              <p className="text-gray-500 text-sm">
                Nessun orario disponibile per questo giorno. Seleziona un altro giorno.
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
                <p className="font-medium text-amber-800">Preavviso breve</p>
                <p className="text-sm text-amber-700">
                  Gli ordini con meno di 30 minuti di preavviso potrebbero subire ritardi
                  in base all'affluenza in negozio.
                </p>
              </div>
            </div>
          )}

          {/* Continue Button */}
          <button
            onClick={handleContinueToPayment}
            disabled={!selectedTime}
            className={cn(
              'w-full py-4 rounded-xl font-semibold text-lg transition',
              selectedTime
                ? 'bg-orange-500 text-white hover:bg-orange-600'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            )}
          >
            Continua
          </button>
        </main>
      </div>
    )
  }

  // Step 2: Payment Selection
  if (step === 'payment') {
    const [hours, minutes] = selectedTime.split(':')
    const pickupTimeDisplay = `${formatDate(selectedDate)} alle ${hours}:${minutes}`

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-orange-500 text-white p-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-6 h-6" />
            <h1 className="text-xl font-bold">MyKafe - Ordina Online</h1>
          </div>
          <p className="text-orange-100 text-sm mt-1">
            Ritiro: {pickupTimeDisplay}
          </p>
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <button
              onClick={() => setStep('datetime')}
              className="text-orange-500 mb-4 text-sm font-medium"
            >
              &larr; Cambia orario
            </button>

            <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
              Come vuoi pagare?
            </h2>
            <p className="text-gray-500 text-center mb-8">
              Seleziona il metodo di pagamento
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
                    Alla consegna in cassa
                  </span>
                  <span className="text-sm text-gray-500">
                    Paga quando ritiri l'ordine
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
                    Carta
                  </span>
                  <span className="text-sm text-gray-500">
                    Paga subito online (+3% commissione)
                  </span>
                </div>
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Step 3: Menu
  const [hours, minutes] = selectedTime.split(':')
  const pickupTimeDisplay = `${formatDate(selectedDate)} alle ${hours}:${minutes}`

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-orange-500 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-6 h-6" />
            <h1 className="text-xl font-bold">MyKafe</h1>
          </div>
          <button
            onClick={() => setStep('payment')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium',
              paymentMethod === PaymentMethod.CASH
                ? 'bg-green-600 text-white'
                : 'bg-blue-600 text-white'
            )}
          >
            {paymentMethod === PaymentMethod.CASH ? (
              <><Banknote className="w-4 h-4" /> Contanti</>
            ) : (
              <><CreditCard className="w-4 h-4" /> Carta</>
            )}
          </button>
        </div>
        <button
          onClick={() => setStep('datetime')}
          className="text-orange-100 text-sm mt-1 hover:text-white"
        >
          Ritiro: {pickupTimeDisplay} &rarr;
        </button>
      </header>

      <CategoryNav
        categories={categories}
        activeCategory={activeCategory}
        onSelect={scrollToCategory}
      />

      <main className="p-4 space-y-8">
        {categories.map((category) => (
          <section
            key={category.id}
            ref={(el) => {
              categoryRefs.current[category.id] = el
            }}
            className="scroll-mt-20"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              {category.name}
            </h2>
            {category.description && (
              <p className="text-gray-500 text-sm mb-4">
                {category.description}
              </p>
            )}

            <div className="space-y-3">
              {category.items?.map((item) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  onAdd={handleAddItem}
                  priceMultiplier={paymentMethod === PaymentMethod.CARD ? 1.03 : 1}
                />
              ))}
            </div>
          </section>
        ))}
      </main>

      <CartButton onClick={() => setIsCartOpen(true)} paymentMethod={paymentMethod} />

      <TakeawayCartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onOrderSuccess={handleOrderSuccess}
        paymentMethod={paymentMethod!}
      />

      {selectedItem && (
        <ItemModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onAdd={handleAddWithModifiers}
          defaultConsumeMode={ConsumeMode.TAKEAWAY}
          priceMultiplier={paymentMethod === PaymentMethod.CARD ? 1.03 : 1}
          hideConsumeModeSelector={true}
        />
      )}

      {orderSuccess && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-accent-500 text-white p-4 rounded-xl shadow-lg flex items-center gap-3 animate-in slide-in-from-top">
          <CheckCircle className="w-6 h-6" />
          <div>
            <p className="font-semibold">Ordine inviato!</p>
            <p className="text-sm text-accent-100">
              Ti aspettiamo {pickupTimeDisplay}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
