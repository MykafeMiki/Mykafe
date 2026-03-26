'use client'

import { CheckCircle, ArrowLeft } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { LanguageSelectorCompact } from '@/components/LanguageSelector'
import { MenuSections } from '@/components/menu/MenuSections'
import { CartButton } from '@/components/cart/CartButton'
import { CartDrawer } from '@/components/cart/CartDrawer'
import type { Category } from '@shared/types'

export interface SectionsStepProps {
  tableNumber: number | null
  filteredCategories: Category[]
  isCartOpen: boolean
  orderSuccess: boolean
  estimatedWait: number | undefined
  onGoBack: () => void
  onSelectSection: (sectionId: string) => void
  onCartOpen: (open: boolean) => void
  onOrderSuccess: (waitMinutes?: number) => void
}

export function SectionsStep({
  tableNumber,
  filteredCategories,
  isCartOpen,
  orderSuccess,
  estimatedWait,
  onGoBack,
  onSelectSection,
  onCartOpen,
  onOrderSuccess,
}: SectionsStepProps) {
  const t = useTranslations('tableMenu')

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
                <p className="text-primary-100">{t('table')} {tableNumber}</p>
              )}
            </div>
          </div>
          <LanguageSelectorCompact />
        </div>
      </header>

      <MenuSections onSelectSection={onSelectSection} activeCategories={filteredCategories} />

      <CartButton onClick={() => onCartOpen(true)} />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => onCartOpen(false)}
        onOrderSuccess={onOrderSuccess}
      />

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
