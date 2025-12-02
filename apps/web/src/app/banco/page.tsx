'use client'

import { useState, useEffect, useRef } from 'react'
import { CheckCircle, Store, User } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { CategoryNav } from '@/components/menu/CategoryNav'
import { MenuItemCard } from '@/components/menu/MenuItemCard'
import { ItemModal } from '@/components/menu/ItemModal'
import { CartButton } from '@/components/cart/CartButton'
import { BancoCartDrawer } from '@/components/cart/BancoCartDrawer'
import { LanguageSelectorCompact } from '@/components/LanguageSelector'
import { useCart } from '@/lib/cart'
import { getMenu, getTableByQr } from '@/lib/api'
import type { Category, MenuItem, Modifier } from '@shared/types'
import { ConsumeMode } from '@shared/types'
import { cn } from '@/lib/utils'

type OrderStep = 'name' | 'menu'

export default function BancoPage() {
  const t = useTranslations('banco')
  const tc = useTranslations('common')

  const [step, setStep] = useState<OrderStep>('name')
  const [customerName, setCustomerNameLocal] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [activeCategory, setActiveCategory] = useState<string>('')
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const categoryRefs = useRef<Record<string, HTMLElement | null>>({})
  const setTableIdInCart = useCart((state) => state.setTableId)
  const setCustomerNameInCart = useCart((state) => state.setCustomerName)
  const addToCart = useCart((state) => state.addItem)

  useEffect(() => {
    async function loadData() {
      try {
        // Load counter/takeaway table
        const table = await getTableByQr('takeaway')
        setTableIdInCart(table.id)

        // Load menu
        const menuData = await getMenu()
        setCategories(menuData)
        if (menuData.length > 0) {
          setActiveCategory(menuData[0].id)
        }
      } catch (err) {
        setError(tc('error'))
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [setTableIdInCart])

  const scrollToCategory = (categoryId: string) => {
    setActiveCategory(categoryId)
    categoryRefs.current[categoryId]?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  const handleAddItem = (item: MenuItem) => {
    if (item.modifierGroups && item.modifierGroups.length > 0) {
      setSelectedItem(item)
    } else {
      addToCart(item, 1, [], undefined, ConsumeMode.TAKEAWAY)
    }
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
    // Reset after order
    setTimeout(() => {
      setOrderSuccess(false)
      setStep('name')
      setCustomerNameLocal('')
    }, 5000)
  }

  const handleContinueToMenu = () => {
    if (customerName.trim()) {
      setCustomerNameInCart(customerName.trim())
      setStep('menu')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-500">{tc('loading')}</div>
      </div>
    )
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

  // Step 1: Name Input
  if (step === 'name') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-primary-500 text-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Store className="w-6 h-6" />
              <h1 className="text-xl font-bold">MyKafe - {t('title')}</h1>
            </div>
            <LanguageSelectorCompact />
          </div>
          <p className="text-primary-100 text-sm mt-1">
            {t('subtitle')}
          </p>
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <User className="w-10 h-10 text-primary-600" />
            </div>

            <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
              {t('nameQuestion')}
            </h2>
            <p className="text-gray-500 text-center mb-8">
              {t('nameDescription')}
            </p>

            <div className="space-y-4">
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerNameLocal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleContinueToMenu()
                }}
                placeholder={t('namePlaceholder')}
                autoFocus
                className="w-full px-4 py-4 text-lg border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none transition"
              />

              <button
                onClick={handleContinueToMenu}
                disabled={!customerName.trim()}
                className={cn(
                  'w-full py-4 rounded-xl font-semibold text-lg transition',
                  customerName.trim()
                    ? 'bg-primary-500 text-white hover:bg-primary-600'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                )}
              >
                {tc('continue')}
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Step 2: Menu
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-primary-500 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store className="w-6 h-6" />
            <h1 className="text-xl font-bold">MyKafe</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full">
              <User className="w-4 h-4" />
              <span className="text-sm font-medium">{customerName}</span>
            </div>
            <LanguageSelectorCompact />
          </div>
        </div>
        <p className="text-primary-100 text-sm mt-1">
          {t('title')}
        </p>
      </header>

      <CategoryNav
        categories={categories}
        activeCategory={activeCategory}
        onSelect={scrollToCategory}
      />

      <main className="p-4 space-y-8">
        {categories.map((category) => (
          <section
            key={category.id}
            ref={(el) => {
              categoryRefs.current[category.id] = el
            }}
            className="scroll-mt-20"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              {category.name}
            </h2>
            {category.description && (
              <p className="text-gray-500 text-sm mb-4">
                {category.description}
              </p>
            )}

            <div className="space-y-3">
              {category.items?.map((item) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  onAdd={handleAddItem}
                />
              ))}
            </div>
          </section>
        ))}
      </main>

      <CartButton onClick={() => setIsCartOpen(true)} />

      <BancoCartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onOrderSuccess={handleOrderSuccess}
        customerName={customerName}
      />

      {selectedItem && (
        <ItemModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onAdd={handleAddWithModifiers}
          defaultConsumeMode={ConsumeMode.TAKEAWAY}
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
