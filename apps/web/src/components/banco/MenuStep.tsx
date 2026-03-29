'use client'

import { CheckCircle, ArrowLeft, Store, User } from 'lucide-react'
import { useRef } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { LanguageSelectorCompact } from '@/components/LanguageSelector'
import { CategoryNav } from '@/components/menu/CategoryNav'
import { MenuItemCard } from '@/components/menu/MenuItemCard'
import { ItemModal } from '@/components/menu/ItemModal'
import { CartButton } from '@/components/cart/CartButton'
import { BancoCartDrawer } from '@/components/cart/BancoCartDrawer'
import { getTranslatedName, getTranslatedDescription } from '@/lib/translations'
import type { Category, MenuItem, Modifier } from '@shared/types'
import { ConsumeMode } from '@shared/types'
import type { PriceContext } from '@/lib/utils'

export interface MenuStepProps {
  customerName: string
  sectionCategories: Category[]
  activeCategory: string
  selectedItem: MenuItem | null
  isCartOpen: boolean
  orderSuccess: boolean
  currentPriceContext: PriceContext
  currentConsumeMode: ConsumeMode
  onGoBack: () => void
  onCategorySelect: (categoryId: string) => void
  onAddItem: (item: MenuItem) => void
  onAddWithModifiers: (quantity: number, modifiers: Modifier[], notes?: string) => void
  onSelectItemClose: () => void
  onCartOpen: (open: boolean) => void
  onOrderSuccess: () => void
}

export function MenuStep({
  customerName,
  sectionCategories,
  activeCategory,
  selectedItem,
  isCartOpen,
  orderSuccess,
  currentPriceContext,
  currentConsumeMode,
  onGoBack,
  onCategorySelect,
  onAddItem,
  onAddWithModifiers,
  onSelectItemClose,
  onCartOpen,
  onOrderSuccess,
}: MenuStepProps) {
  const t = useTranslations('banco')
  const locale = useLocale()
  const categoryRefs = useRef<Record<string, HTMLElement | null>>({})

  const scrollToCategory = (categoryId: string) => {
    onCategorySelect(categoryId)
    categoryRefs.current[categoryId]?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-primary-500 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onGoBack}
              className="p-2 -ml-2 rounded-full hover:bg-primary-400 transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Store className="w-6 h-6" />
              <h1 className="text-xl font-bold">MyKafe</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full">
              <User className="w-4 h-4" />
              <span className="text-sm font-medium">{customerName}</span>
            </div>
            <LanguageSelectorCompact />
          </div>
        </div>
      </header>

      <CategoryNav
        categories={sectionCategories}
        activeCategory={activeCategory}
        onSelect={scrollToCategory}
      />

      <main className="p-4 space-y-8">
        {sectionCategories.map((category) => (
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
                  priceContext={currentPriceContext}
                />
              ))}
            </div>
          </section>
        ))}
      </main>

      <CartButton onClick={() => onCartOpen(true)} />

      <BancoCartDrawer
        isOpen={isCartOpen}
        onClose={() => onCartOpen(false)}
        onOrderSuccess={onOrderSuccess}
        customerName={customerName}
      />

      {selectedItem && (
        <ItemModal
          item={selectedItem}
          onClose={onSelectItemClose}
          onAdd={onAddWithModifiers}
          defaultConsumeMode={currentConsumeMode}
          priceContext={currentPriceContext}
          hideConsumeModeSelector={true}
        />
      )}

      {orderSuccess && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-accent-500 text-white p-4 rounded-xl shadow-lg flex items-center gap-3 animate-in slide-in-from-top">
          <CheckCircle className="w-6 h-6" />
          <div>
            <p className="font-semibold">{t('orderSent', { name: customerName })}</p>
            <p className="text-sm text-accent-100">
              {t('orderConfirmation')}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
