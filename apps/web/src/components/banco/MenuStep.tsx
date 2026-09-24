'use client'

import { CheckCircle, Store, User } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { LanguageSelectorCompact } from '@/components/LanguageSelector'
import { SidebarMenuLayout, SidebarBackButton } from '@/components/menu/SidebarMenuLayout'
import { ItemModal } from '@/components/menu/ItemModal'
import { CartButton } from '@/components/cart/CartButton'
import { BancoCartDrawer } from '@/components/cart/BancoCartDrawer'
import type { Category, MenuItem, Modifier } from '@shared/types'
import { ConsumeMode } from '@shared/types'
import type { PriceContext } from '@/lib/utils'

export interface MenuStepProps {
  customerName: string
  categories: Category[]
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
  categories,
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

  const header = (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <SidebarBackButton onClick={onGoBack} />
        <div className="flex items-center gap-2">
          <Store className="w-6 h-6" />
          <h1 className="text-2xl font-display font-semibold italic tracking-tight">MyKafe</h1>
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
  )

  return (
    <SidebarMenuLayout
      header={header}
      categories={categories}
      activeCategory={activeCategory}
      onCategorySelect={onCategorySelect}
      onAddItem={onAddItem}
      priceContext={currentPriceContext}
    >
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
            <p className="text-sm text-accent-100">{t('orderConfirmation')}</p>
          </div>
        </div>
      )}
    </SidebarMenuLayout>
  )
}
