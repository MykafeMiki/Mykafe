'use client'

import { ArrowLeft, Store, User } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { LanguageSelectorCompact } from '@/components/LanguageSelector'
import { MenuSections } from '@/components/menu/MenuSections'
import { CartButton } from '@/components/cart/CartButton'
import { BancoCartDrawer } from '@/components/cart/BancoCartDrawer'
import type { Category } from '@shared/types'

export interface SectionsStepProps {
  customerName: string
  serviceMode: 'takeaway' | 'dine-in'
  filteredCategories: Category[]
  isCartOpen: boolean
  onGoBack: () => void
  onSelectSection: (sectionId: string) => void
  onCartOpen: (open: boolean) => void
  onOrderSuccess: () => void
}

export function SectionsStep({
  customerName,
  serviceMode,
  filteredCategories,
  isCartOpen,
  onGoBack,
  onSelectSection,
  onCartOpen,
  onOrderSuccess,
}: SectionsStepProps) {
  const t = useTranslations('banco')

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
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
        <p className="text-primary-100 text-sm mt-1 ml-10">
          {t('title')} • {serviceMode === 'takeaway' ? t('takeaway') : t('dineIn')}
        </p>
      </header>

      <main className="flex-1 p-4">
        <MenuSections
          onSelectSection={onSelectSection}
        />
      </main>

      <CartButton onClick={() => onCartOpen(true)} />

      <BancoCartDrawer
        isOpen={isCartOpen}
        onClose={() => onCartOpen(false)}
        onOrderSuccess={onOrderSuccess}
        customerName={customerName}
      />
    </div>
  )
}
