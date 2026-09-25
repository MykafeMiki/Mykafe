'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useCart } from '@/lib/cart'
import { getMenu, getTableByQr } from '@/lib/api'
import { filterCategoriesByTime, getTakeawayConfig, getTakeawayStatus, fetchClosureConfig, isOnlineOrderingOpen, getAvailableDates as getAvailableDatesFromConfig, isOrderingBlackoutNow, isPickupInBlackout, type ClosureConfig } from '@/lib/menuTimers'
import { TakeawayUnavailableMessage } from '@/components/TakeawayUnavailableMessage'
import type { Category, MenuItem, Modifier } from '@shared/types'
import { ConsumeMode, PaymentMethod } from '@shared/types'
import { IdentityStep } from '@/components/ordina/IdentityStep'
import { PaymentStep } from '@/components/ordina/PaymentStep'
import { DateTimeStep } from '@/components/ordina/DateTimeStep'
import { MenuStep } from '@/components/ordina/MenuStep'
import { ClosedScreen } from '@/components/ordina/ClosedScreen'
import { ServiceStep, type ServiceType } from '@/components/ordina/ServiceStep'
import { DriverCodeStep } from '@/components/ordina/DriverCodeStep'
import { emptyPhoneInput, type PhoneInputState } from '@/lib/phone'

type OrderStep = 'identity' | 'service' | 'driver' | 'payment' | 'datetime' | 'menu'

/**
 * Data locale in formato YYYY-MM-DD.
 * Non si usa toISOString(): converte in UTC e in fuso italiano una data a
 * mezzanotte tornerebbe indietro di un giorno.
 */
function toLocalDateString(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

function getAvailableTimeSlots(selectedDate: Date, openingHour: number, closingHour: number): string[] {
  const slots: string[] = []
  const now = new Date()
  const isToday = selectedDate.toDateString() === now.toDateString()

  for (let hour = openingHour; hour < closingHour; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const slotTime = new Date(selectedDate)
      slotTime.setHours(hour, minute, 0, 0)

      if (isToday && slotTime <= now) {
        continue
      }

      // Venerdi dalle 15 a sabato alle 22:30 il locale e' fermo
      if (isPickupInBlackout(slotTime)) {
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

  const [takeawayStatus, setTakeawayStatus] = useState<ReturnType<typeof getTakeawayStatus> | null>(null)
  const [orderingStatus, setOrderingStatus] = useState<ReturnType<typeof isOnlineOrderingOpen>>({ isOpen: true })
  const [closureConfig, setClosureConfig] = useState<ClosureConfig | null>(null)
  const [step, setStep] = useState<OrderStep>('identity')
  const [serviceType, setServiceType] = useState<ServiceType>('takeaway')
  const [customerName, setCustomerName] = useState('')
  const [phoneInput, setPhoneInput] = useState<PhoneInputState>(() => emptyPhoneInput(locale))
  const [resolvedPhone, setResolvedPhone] = useState('')
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
  const setPriceContext = useCart((state) => state.setPriceContext)
  const addToCart = useCart((state) => state.addItem)
  const clearCart = useCart((state) => state.clearCart)

  // Filter categories - takeaway context shows panini always, but still respects sushi timer
  const filteredCategories = useMemo(() => {
    return filterCategoriesByTime(categories, 'takeaway')
  }, [categories])

  // Get takeaway pickup hours config
  const takeawayConfig = getTakeawayConfig()

  // Fuori orario (cucina chiusa) si puo' ordinare solo per i giorni successivi.
  // Le chiusure esplicite dell'admin (menu disattivato, chiusura temporanea) restano bloccanti.
  const closedBySchedule = !orderingStatus.isOpen && orderingStatus.kind === 'schedule'
  const closedByTakeawayHours =
    !!takeawayStatus && !takeawayStatus.isAvailable &&
    (takeawayStatus.reason === 'outside_hours' || takeawayStatus.reason === 'closed_day')
  const nextDayOnly = closedBySchedule || closedByTakeawayHours

  const availableDates = getAvailableDatesFromConfig(7).filter((date) => {
    if (nextDayOnly && date.toDateString() === new Date().toDateString()) return false
    // Giorni in cui il calendario admin non prevede ordini online
    if (closureConfig?.enabled && closureConfig.schedule[date.getDay()]?.enabled === false) return false
    // Giorni senza nemmeno un orario prenotabile (es. sabato)
    return getAvailableTimeSlots(date, takeawayConfig.openingHour, takeawayConfig.closingHour).length > 0 ||
      date.toDateString() === new Date().toDateString()
  })
  const availableTimeSlots = getAvailableTimeSlots(selectedDate, takeawayConfig.openingHour, takeawayConfig.closingHour)
  const showWarning = !!(selectedTime && isWithin30Minutes(selectedDate, selectedTime))

  // Check takeaway availability on mount
  useEffect(() => {
    const status = getTakeawayStatus()
    setTakeawayStatus(status)
  }, [])

  // Il carrello e' persistito in localStorage: su un dispositivo condiviso il
  // cliente successivo si ritroverebbe gli articoli del precedente. Ogni volta
  // che si entra nel flusso si riparte da zero.
  useEffect(() => {
    clearCart()
  }, [clearCart])

  useEffect(() => {
    async function loadData() {
      try {
        const table = await getTableByQr('takeaway')
        setTableIdInCart(table.id)
        setPriceContext('takeaway-remote')

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
  }, [setTableIdInCart, setPriceContext, tc])

  // Check chiusura separato: non blocca il caricamento del menu
  useEffect(() => {
    if (loading) return
    fetchClosureConfig()
      .then(config => {
        setClosureConfig(config)
        try {
          setOrderingStatus(isOnlineOrderingOpen(config))
        } catch (e) {
          console.error('isOnlineOrderingOpen error:', e)
        }
      })
      .catch(e => console.error('fetchClosureConfig error:', e))
  }, [loading])

  // La data preselezionata (oggi) puo' non essere ordinabile: si passa alla prima disponibile
  const firstAvailableKey = availableDates[0]?.toDateString()
  const selectedIsAvailable = availableDates.some((d) => d.toDateString() === selectedDate.toDateString())
  useEffect(() => {
    if (!selectedIsAvailable && firstAvailableKey && availableDates[0]) {
      setSelectedDate(availableDates[0])
      setSelectedTime('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIsAvailable, firstAvailableKey])

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
    setSelectedItem(item)
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

    // Ordine inviato: si riparte da zero per il cliente successivo, altrimenti
    // il prossimo si ritroverebbe nome e telefono di chi lo precede.
    setCustomerName('')
    setPhoneInput(emptyPhoneInput(locale))
    setResolvedPhone('')
    setSelectedTime('')
    setSelectedDate(new Date())
    setPaymentMethod(null)
    setServiceType('takeaway')
    setStep('identity')
  }

  const handleIdentityContinue = (phone: string) => {
    setResolvedPhone(phone)
    setStep('service')
  }

  const handleSelectService = (service: ServiceType) => {
    setServiceType(service)
    setStep(service === 'delivery' ? 'driver' : 'payment')
  }

  const handleContinueToMenu = () => {
    if (selectedTime) {
      setStep('menu')
    }
  }

  const handleSelectPayment = (method: PaymentMethod) => {
    setPaymentMethod(method)
    // Il listino dipende dal pagamento: con carta il cliente vede i prezzi carta.
    setPriceContext(method === PaymentMethod.CARD ? 'takeaway-card' : 'takeaway-remote')
    setStep('datetime')
  }

  const handleCheckout = () => {
    // Open cart drawer directly since payment and time are already selected
    setIsCartOpen(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-500">{tc('loading')}</div>
      </div>
    )
  }

  // Venerdi dalle 15 a sabato alle 22:30 non si ordina mai, nemmeno per i giorni dopo
  if (isOrderingBlackoutNow()) {
    return <ClosedScreen reason={t('blackoutMessage')} />
  }

  if (!orderingStatus.isOpen && !closedBySchedule) {
    return (
      <ClosedScreen
        reason={orderingStatus.reason}
        nextOpenTime={orderingStatus.nextOpenTime}
      />
    )
  }

  // Show unavailable message if takeaway is not available
  if (takeawayStatus && !takeawayStatus.isAvailable && !closedByTakeawayHours) {
    return <TakeawayUnavailableMessage status={takeawayStatus} />
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

  if (step === 'identity') {
    return (
      <IdentityStep
        customerName={customerName}
        phone={phoneInput}
        onNameChange={setCustomerName}
        onPhoneChange={setPhoneInput}
        onContinue={handleIdentityContinue}
      />
    )
  }

  if (step === 'service') {
    return <ServiceStep onSelect={handleSelectService} onGoBack={() => setStep('identity')} />
  }

  if (step === 'driver') {
    return (
      <DriverCodeStep
        driverPhone={closureConfig?.deliveryDriverPhone}
        onGoBack={() => setStep('service')}
        onContinue={() => setStep('payment')}
      />
    )
  }

  if (step === 'payment') {
    return <PaymentStep onSelectPayment={handleSelectPayment} />
  }

  if (step === 'datetime') {
    return (
      <DateTimeStep
        selectedDate={selectedDate}
        selectedTime={selectedTime}
        availableDates={availableDates}
        availableTimeSlots={availableTimeSlots}
        showWarning={showWarning}
        paymentMethod={paymentMethod}
        onDateChange={setSelectedDate}
        onTimeChange={setSelectedTime}
        onGoBack={() => setStep('payment')}
        onContinue={handleContinueToMenu}
      />
    )
  }

  return (
    <MenuStep
      filteredCategories={filteredCategories}
      activeCategory={activeCategory}
      selectedItem={selectedItem}
      isCartOpen={isCartOpen}
      orderSuccess={orderSuccess}
      selectedDate={selectedDate}
      selectedTime={selectedTime}
      paymentMethod={paymentMethod || PaymentMethod.CASH}
      customerName={customerName}
      customerPhone={resolvedPhone}
      scheduledDate={toLocalDateString(selectedDate)}
      scheduledTime={selectedTime}
      isDelivery={serviceType === 'delivery'}
      onGoBack={() => setStep('datetime')}
      onCategorySelect={setActiveCategory}
      onAddItem={handleAddItem}
      onAddWithModifiers={handleAddWithModifiers}
      onSelectItemClose={() => setSelectedItem(null)}
      onCartOpen={setIsCartOpen}
      onOrderSuccess={handleOrderSuccess}
    />
  )
}
