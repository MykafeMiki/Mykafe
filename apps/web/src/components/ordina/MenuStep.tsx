'use client'

import { CheckCircle, ArrowLeft, ShoppingBag, Clock, CreditCard, Banknote } from 'lucide-react'
import { useRef, useLocale } from 'react'
import { useTranslations } from 'next-intl'
import { LanguageSelectorCompact } from '@/components/LanguageSelector'
import { CategoryNav } from '@/components/menu/CategoryNav'
import { MenuItemCard } from '@/components/menu/MenuItemCard'
import { ItemModal } from '@/components/menu/ItemModal'
import { CartButton } from '@/components/cart/CartButton'
import { TakeawayCartDrawer } from '@/components/cart/TakeawayCartDrawer'
import { getTranslatedName, getTranslatedDescription } from '@/lib/translations'
import type { Category, MenuItem, Modifier } from '@shared/types'
import { ConsumeMode, PaymentMethod } from '@shared/types'

export interface MenuStepProps {
  filteredCategories: Category[]
  activeCategory: string
  selectedItem: MenuItem | null
  isCartOpen: boolean
  orderSuccess: boolean
  selectedDate: Date
  selectedTime: string
  paymentMethod: PaymentMethod
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
  const categoryRefs = useRef<Record<string, HTMLElement | null>>({})

  const scrollToCategory = (categoryId: string) => {
    onCategorySelect(categoryId)
    categoryRefs.current[categoryId]?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

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

  const paymentLabel = paymentMethod === PaymentMethod.CARD ? t('card') : t('cashAtPickup')
  const pickupTimeDisplay = `${formatDate(selectedDate)} ${selectedTime}`

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
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
              <div>
                <h1 className="text-xl font-bold">MyKafe</h1>
                <p className="text-orange-100 text-sm">{t('subtitle')}</p>
              </div>
            </div>
          </div>
          <LanguageSelectorCompact />
        </div>
        {/* Show selected payment and pickup time */}
        <div className="mt-2 flex items-center gap-4 text-sm">
          <button
            onClick={onGoBack}
            className="flex items-center gap-1 bg-orange-600 px-3 py-1 rounded-full hover:bg-orange-700 transition"
          >
            <Clock className="w-4 h-4" />
            <span>{pickupTimeDisplay}</span>
          </button>
          <button
            onClick={onGoBack}
            className="flex items-center gap-1 bg-orange-600 px-3 py-1 rounded-full hover:bg-orange-700 transition"
          >
            {paymentMethod === PaymentMethod.CARD ? (
              <CreditCard className="w-4 h-4" />
            ) : (
              <Banknote className="w-4 h-4" />
            )}
            <span>{paymentLabel}</span>
          </button>
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
                  onAdd={onAddItem}
                  priceContext="takeaway-remote"
                />
              ))}
            </div>
          </section>
        ))}
      </main>

      <CartButton onClick={() => onCartOpen(true)} />

      <TakeawayCartDrawer
        isOpen={isCartOpen}
        onClose={() => onCartOpen(false)}
        onOrderSuccess={onOrderSuccess}
        paymentMethod={paymentMethod}
      />

      {selectedItem && (
        <ItemModal
          item={selectedItem}
          onClose={onSelectItemClose}
          onAdd={onAddWithModifiers}
          defaultConsumeMode={ConsumeMode.TAKEAWAY}
          priceContext="takeaway-remote"
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
    </div>
  )
}
