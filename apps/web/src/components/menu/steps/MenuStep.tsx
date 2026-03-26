'use client'

import { CheckCircle, ArrowLeft, Link2 } from 'lucide-react'
import { useRef, useEffect } from 'react'
import { useLocale } from 'next-intl'
import { useTranslations } from 'next-intl'
import { LanguageSelectorCompact } from '@/components/LanguageSelector'
import { CategoryNav } from '@/components/menu/CategoryNav'
import { MenuItemCard } from '@/components/menu/MenuItemCard'
import { ItemModal } from '@/components/menu/ItemModal'
import { CartButton } from '@/components/cart/CartButton'
import { CartDrawer } from '@/components/cart/CartDrawer'
import { getTranslatedName, getTranslatedDescription } from '@/lib/translations'
import type { Category, MenuItem, Modifier, TableSession } from '@shared/types'
import { ConsumeMode } from '@shared/types'

export interface MenuStepProps {
  tableNumber: number | null
  tableSession: TableSession | null
  sectionCategories: Category[]
  activeCategory: string
  selectedItem: MenuItem | null
  isCartOpen: boolean
  orderSuccess: boolean
  estimatedWait: number | undefined
  onGoBack: () => void
  onCategorySelect: (categoryId: string) => void
  onAddItem: (item: MenuItem) => void
  onAddWithModifiers: (quantity: number, modifiers: Modifier[], notes?: string, consumeMode?: ConsumeMode) => void
  onSelectItemClose: () => void
  onCartOpen: (open: boolean) => void
  onOrderSuccess: (waitMinutes?: number) => void
}

export function MenuStep({
  tableNumber,
  tableSession,
  sectionCategories,
  activeCategory,
  selectedItem,
  isCartOpen,
  orderSuccess,
  estimatedWait,
  onGoBack,
  onCategorySelect,
  onAddItem,
  onAddWithModifiers,
  onSelectItemClose,
  onCartOpen,
  onOrderSuccess,
}: MenuStepProps) {
  const t = useTranslations('tableMenu')
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
      <header className="sticky top-0 z-40 bg-primary-500 text-white p-4 shadow-md">
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
              <h1 className="text-2xl font-display font-semibold italic">MyKafe</h1>
              {tableNumber !== null && tableNumber > 0 && (
                <p className="text-primary-100">
                  {t('table')} {tableNumber}
                  {tableSession && tableSession.linkedTables.length > 0 && (
                    <span className="ml-2 text-xs bg-primary-400 px-2 py-0.5 rounded-full">
                      + {tableSession.linkedTables.join(', ')}
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>
          <LanguageSelectorCompact />
        </div>
        {tableSession && (
          <div className="mt-2 flex items-center gap-2 text-sm text-primary-100">
            <Link2 className="w-4 h-4" />
            <span>{t('sessionActive')}: {t('tables')} {tableNumber}, {tableSession.linkedTables.join(', ')}</span>
          </div>
        )}
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
                />
              ))}
            </div>
          </section>
        ))}
      </main>

      <CartButton onClick={() => onCartOpen(true)} />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => onCartOpen(false)}
        onOrderSuccess={onOrderSuccess}
      />

      {selectedItem && (
        <ItemModal
          item={selectedItem}
          onClose={onSelectItemClose}
          onAdd={onAddWithModifiers}
        />
      )}

      {orderSuccess && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-accent-500 text-white p-4 rounded-xl shadow-lg flex items-center gap-3 animate-in slide-in-from-top">
          <CheckCircle className="w-6 h-6" />
          <div>
            <p className="font-semibold">{t('orderSent')}</p>
            <p className="text-sm text-accent-100">
              {estimatedWait
                ? t('estimatedWait', { minutes: estimatedWait })
                : t('preparing')}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
