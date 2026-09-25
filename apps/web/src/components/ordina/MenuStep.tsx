'use client'

import { CheckCircle, ShoppingBag, Clock, CreditCard, Banknote } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import { LanguageSelectorCompact } from '@/components/LanguageSelector'
import { SidebarMenuLayout, SidebarBackButton } from '@/components/menu/SidebarMenuLayout'
import { ItemModal } from '@/components/menu/ItemModal'
import { CartButton } from '@/components/cart/CartButton'
import { TakeawayCartDrawer } from '@/components/cart/TakeawayCartDrawer'
import type { Category, MenuItem, Modifier } from '@shared/types'
import { ConsumeMode, PaymentMethod } from '@shared/types'
import type { PriceContext } from '@/lib/utils'

export interface MenuStepProps {
  filteredCategories: Category[]
  activeCategory: string
  selectedItem: MenuItem | null
  isCartOpen: boolean
  orderSuccess: boolean
  selectedDate: Date
  selectedTime: string
  paymentMethod: PaymentMethod
  /** Raccolti nel primo passo, passati al carrello per l'invio dell'ordine */
  customerName: string
  customerPhone: string
  scheduledDate: string
  scheduledTime: string
  isDelivery?: boolean
  onGoBack: () => void
  onCategorySelect: (categoryId: string) => void
  onAddItem: (item: MenuItem) => void
  onAddWithModifiers: (quantity: number, modifiers: Modifier[], notes?: string) => void
  onSelectItemClose: () => void
  onCartOpen: (open: boolean) => void
  onOrderSuccess: () => void
}

export function MenuStep({
  filteredCategories,
  activeCategory,
  selectedItem,
  isCartOpen,
  orderSuccess,
  selectedDate,
  selectedTime,
  paymentMethod,
  customerName,
  customerPhone,
  scheduledDate,
  scheduledTime,
  isDelivery,
  onGoBack,
  onCategorySelect,
  onAddItem,
  onAddWithModifiers,
  onSelectItemClose,
  onCartOpen,
  onOrderSuccess,
}: MenuStepProps) {
  const t = useTranslations('ordina')
  const locale = useLocale()

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

  // Listino in base al pagamento scelto: carta e alla consegna hanno prezzi diversi
  const priceContext: PriceContext =
    paymentMethod === PaymentMethod.CARD ? 'takeaway-card' : 'takeaway-remote'
  const paymentLabel = paymentMethod === PaymentMethod.CARD ? t('card') : t('cashAtPickup')
  const pickupTimeDisplay = `${formatDate(selectedDate)} ${selectedTime}`

  const header = (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SidebarBackButton onClick={onGoBack} />
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-6 h-6" />
            <div>
              <h1 className="text-2xl font-display font-semibold italic tracking-tight">MyKafe</h1>
              <p className="text-primary-100 text-sm">{t('subtitle')}</p>
            </div>
          </div>
        </div>
        <LanguageSelectorCompact />
      </div>
      {/* Orario di ritiro e metodo di pagamento scelti */}
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <button
          onClick={onGoBack}
          className="flex items-center gap-1 bg-black/20 px-3 py-1 rounded-full hover:bg-black/30 transition"
        >
          <Clock className="w-4 h-4" />
          <span>{pickupTimeDisplay}</span>
        </button>
        <button
          onClick={onGoBack}
          className="flex items-center gap-1 bg-black/20 px-3 py-1 rounded-full hover:bg-black/30 transition"
        >
          {paymentMethod === PaymentMethod.CARD ? (
            <CreditCard className="w-4 h-4" />
          ) : (
            <Banknote className="w-4 h-4" />
          )}
          <span>{paymentLabel}</span>
        </button>
      </div>
    </>
  )

  return (
    <SidebarMenuLayout
      header={header}
      categories={filteredCategories}
      activeCategory={activeCategory}
      onCategorySelect={onCategorySelect}
      onAddItem={onAddItem}
      priceContext={priceContext}
    >
      <CartButton onClick={() => onCartOpen(true)} />

      <TakeawayCartDrawer
        isOpen={isCartOpen}
        onClose={() => onCartOpen(false)}
        onOrderSuccess={onOrderSuccess}
        paymentMethod={paymentMethod}
        customerName={customerName}
        customerPhone={customerPhone}
        scheduledDate={scheduledDate}
        scheduledTime={scheduledTime}
        isDelivery={isDelivery}
      />

      {selectedItem && (
        <ItemModal
          item={selectedItem}
          onClose={onSelectItemClose}
          onAdd={onAddWithModifiers}
          defaultConsumeMode={ConsumeMode.TAKEAWAY}
          priceContext={priceContext}
          hideConsumeModeSelector={true}
        />
      )}

      {orderSuccess && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-accent-500 text-white p-4 rounded-xl shadow-lg flex items-center gap-3 animate-in slide-in-from-top">
          <CheckCircle className="w-6 h-6" />
          <div>
            <p className="font-semibold">{t('orderSent')}</p>
            <p className="text-sm text-accent-100">
              {t('pickupConfirmation', { time: pickupTimeDisplay })}
            </p>
          </div>
        </div>
      )}
    </SidebarMenuLayout>
  )
}
