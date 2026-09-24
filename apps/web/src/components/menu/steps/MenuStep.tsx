'use client'

import { CheckCircle, Link2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { LanguageSelectorCompact } from '@/components/LanguageSelector'
import { SidebarMenuLayout, SidebarBackButton } from '@/components/menu/SidebarMenuLayout'
import { ItemModal } from '@/components/menu/ItemModal'
import { CartButton } from '@/components/cart/CartButton'
import { CartDrawer } from '@/components/cart/CartDrawer'
import type { Category, MenuItem, Modifier } from '@shared/types'
import { ConsumeMode } from '@shared/types'
import type { TableSession } from '@/lib/api'

export interface MenuStepProps {
  tableNumber: number | null
  tableSession: TableSession | null
  categories: Category[]
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
  categories,
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

  const header = (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SidebarBackButton onClick={onGoBack} />
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-semibold italic tracking-tight">MyKafe</h1>
            {tableNumber !== null && tableNumber > 0 && (
              <p className="text-primary-100 text-sm sm:text-base">
                {t('table')} {tableNumber}
                {tableSession && tableSession.linkedTables.length > 0 && (
                  <span className="ml-2 text-xs bg-primary-400/80 px-2 py-0.5 rounded-full">
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
          <span>
            {t('sessionActive')}: {t('tables')} {tableNumber}, {tableSession.linkedTables.join(', ')}
          </span>
        </div>
      )}
    </>
  )

  return (
    <SidebarMenuLayout
      header={header}
      categories={categories}
      activeCategory={activeCategory}
      onCategorySelect={onCategorySelect}
      onAddItem={onAddItem}
    >
      <CartButton onClick={() => onCartOpen(true)} />

      <CartDrawer isOpen={isCartOpen} onClose={() => onCartOpen(false)} onOrderSuccess={onOrderSuccess} />

      {selectedItem && (
        <ItemModal item={selectedItem} onClose={onSelectItemClose} onAdd={onAddWithModifiers} />
      )}

      {orderSuccess && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-accent-500 text-white p-4 rounded-xl shadow-lg flex items-center gap-3 animate-in slide-in-from-top">
          <CheckCircle className="w-6 h-6" />
          <div>
            <p className="font-semibold">{t('orderSent')}</p>
            <p className="text-sm text-accent-100">
              {estimatedWait ? t('estimatedWait', { minutes: estimatedWait }) : t('preparing')}
            </p>
          </div>
        </div>
      )}
    </SidebarMenuLayout>
  )
}
