'use client'

import { useState } from 'react'
import { X, Minus, Plus, Trash2, Loader2, User, Phone } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useCart } from '@/lib/cart'
import { formatPrice, getItemPrice as getContextPrice } from '@/lib/utils'
import { createOrder } from '@/lib/api'
import { PaymentMethod, OrderType, ConsumeMode, applyCardSurcharge } from '@shared/types'
import type { MenuItem } from '@shared/types'
import {
  getTimerConfig,
  getAvailableDates as getDates,
  getAvailableTimeSlots
} from '@/lib/menuTimers'

interface TakeawayCartDrawerProps {
  isOpen: boolean
  onClose: () => void
  onOrderSuccess: () => void
  paymentMethod: PaymentMethod
}

// Calcola il prezzo di un item con eventuale maggiorazione carta (usa utility condivisa)
function calculateItemPrice(basePrice: number, modifiersPrice: number, quantity: number, isCard: boolean): number {
  const itemTotal = (basePrice + modifiersPrice) * quantity
  return applyCardSurcharge(itemTotal, isCard)
}

export function TakeawayCartDrawer({ isOpen, onClose, onOrderSuccess, paymentMethod }: TakeawayCartDrawerProps) {
  const t = useTranslations('cart')
  const { items, tableId, priceContext, updateQuantity, removeItem, clearCart } = useCart()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [phoneConfirm, setPhoneConfirm] = useState('')

  const isCard = paymentMethod === PaymentMethod.CARD

  // Calcola il totale con i prezzi già maggiorati per carta
  const total = items.reduce((sum, item) => {
    const basePrice = getContextPrice(item.menuItem, priceContext)
    const modifiersPrice = item.selectedModifiers.reduce((s, m) => s + m.price, 0)
    return sum + calculateItemPrice(basePrice, modifiersPrice, item.quantity, isCard)
  }, 0)



  // Date and Time state
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')

  // Calcola le date disponibili (oggi e domani) usando la config
  const getAvailableDates = () => {
    const dates = getDates(2) // Get next 2 available days
    return dates.map(date => {
      const today = new Date()
      const isToday = date.toDateString() === today.toDateString()
      const tomorrow = new Date(today)
      tomorrow.setDate(today.getDate() + 1)
      const isTomorrow = date.toDateString() === tomorrow.toDateString()

      let label = date.toLocaleDateString('it-IT')
      if (isToday) label = t('today')
      if (isTomorrow) label = t('tomorrow')

      return {
        value: date.toISOString().split('T')[0],
        label: label
      }
    })
  }

  // Generate time slots based on config
  const getTimeSlots = () => {
    if (!scheduledDate) return []

    const config = getTimerConfig().takeaway
    const date = new Date(scheduledDate)

    return getAvailableTimeSlots(date, config.openingHour, config.closingHour)
  }

  const handleSubmitOrder = async () => {
    if (!tableId || items.length === 0) return

    if (!customerName.trim()) {
      setError(t('enterName'))
      return
    }

    if (!customerPhone.trim()) {
      setError(t('enterPhone'))
      return
    }

    // Verifica che il prefisso inserito corrisponda all'inizio del numero
    const cleanPhone = customerPhone.replace(/\s+/g, '')
    const cleanConfirm = phoneConfirm.replace(/\s+/g, '')

    if (!cleanConfirm || cleanConfirm.length < 3) {
      setError(t('enterPhoneConfirm'))
      return
    }

    if (!cleanPhone.startsWith(cleanConfirm)) {
      setError(t('phoneNoMatch'))
      return
    }

    if (!scheduledDate || !scheduledTime) {
      setError(t('enterDateTime'))
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await createOrder({
        tableId,
        items: items.map((item) => ({
          menuItemId: item.menuItem.id,
          quantity: item.quantity,
          notes: item.notes,
          modifierIds: item.selectedModifiers.map((m) => m.id),
          consumeMode: ConsumeMode.TAKEAWAY,
        })),
        orderType: OrderType.TAKEAWAY,
        paymentMethod,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        notes: `Ritiro: ${scheduledDate} alle ${scheduledTime}`, // Store in notes for now if backend doesn't support it directly
      })

      clearCart()
      setCustomerName('')
      setCustomerPhone('')
      setPhoneConfirm('')
      setScheduledDate('')
      setScheduledTime('')
      onOrderSuccess()
      onClose()
    } catch (err) {
      setError(t('orderError'))
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative w-full max-w-lg max-h-[90vh] bg-white rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-orange-50">
          <h2 className="text-lg font-bold text-gray-900">{t('takeawayOrder')}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              {t('empty')}
            </p>
          ) : (
            <div className="space-y-6">
              {/* Cart Items */}
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="flex gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900">
                        {item.menuItem.name}
                      </h3>
                      {item.selectedModifiers.length > 0 && (
                        <p className="text-sm text-gray-500">
                          {item.selectedModifiers.map((m) => m.name).join(', ')}
                        </p>
                      )}
                      {item.notes && (
                        <p className="text-sm text-gray-400 italic">
                          "{item.notes}"
                        </p>
                      )}
                      <p className="font-semibold text-primary-600 mt-1">
                        {formatPrice(
                          calculateItemPrice(
                            getContextPrice(item.menuItem, priceContext),
                            item.selectedModifiers.reduce((s, m) => s + m.price, 0),
                            item.quantity,
                            isCard
                          )
                        )}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <button
                        onClick={() => removeItem(index)}
                        className="p-1 text-gray-400 hover:text-red-500 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="flex items-center gap-2 bg-white border rounded">
                        <button
                          onClick={() => updateQuantity(index, item.quantity - 1)}
                          className="p-2 hover:bg-gray-100 transition"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-6 text-center font-semibold">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(index, item.quantity + 1)}
                          className="p-2 hover:bg-gray-100 transition"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Customer Info */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">{t('yourData')}</h3>
                <div className="space-y-2">
                  <div className="space-y-2">
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder={t('namePlaceholder')}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="tel"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder={t('phonePlaceholder')}
                          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1 ml-1">{t('phoneHelper')}</p>
                    </div>
                    <div>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="tel"
                          value={phoneConfirm}
                          onChange={(e) => setPhoneConfirm(e.target.value)}
                          placeholder={t('phoneConfirmPlaceholder')}
                          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1 ml-1">{t('phoneConfirmHelper')}</p>
                    </div>

                    {/* Date and Time Picker */}
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">{t('date')}</label>
                        <select
                          value={scheduledDate}
                          onChange={(e) => setScheduledDate(e.target.value)}
                          className="w-full px-3 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                        >
                          <option value="">{t('selectDate')}</option>
                          {getAvailableDates().map(date => (
                            <option key={date.value} value={date.value}>{date.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">{t('time')}</label>
                        <select
                          value={scheduledTime}
                          onChange={(e) => setScheduledTime(e.target.value)}
                          className="w-full px-3 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                        >
                          <option value="">{t('selectTime')}</option>
                          {getTimeSlots().map(time => (
                            <option key={time} value={time}>{time}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-4 border-t bg-gray-50">
            {error && (
              <p className="text-red-500 text-sm mb-3 text-center">{error}</p>
            )}

            <div className="flex items-center justify-between text-lg font-bold mb-4">
              <span>{t('total')}</span>
              <span>{formatPrice(total)}</span>
            </div>

            <button
              onClick={handleSubmitOrder}
              disabled={isSubmitting}
              className="w-full py-4 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t('sending')}
                </>
              ) : (
                `${t('orderButton')} - ${formatPrice(total)}`
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
