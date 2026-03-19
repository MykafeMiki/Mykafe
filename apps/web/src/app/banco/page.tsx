'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { CheckCircle, User, ShoppingBag, UtensilsCrossed } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import { CategoryNav } from '@/components/menu/CategoryNav'
import { MenuItemCard } from '@/components/menu/MenuItemCard'
import { ItemModal } from '@/components/menu/ItemModal'
import { MenuSections, categoryToSectionMap, getSectionName, menuSections } from '@/components/menu/MenuSections'
import { CartButton } from '@/components/cart/CartButton'
import { BancoCartDrawer } from '@/components/cart/BancoCartDrawer'
import { LanguageSelectorCompact } from '@/components/LanguageSelector'
import { AppHeader } from '@/components/AppHeader'
import { useCart } from '@/lib/cart'
import { getMenu, getTableByQr } from '@/lib/api'
import { filterCategoriesByTime } from '@/lib/menuTimers'
import { getTranslatedName, getTranslatedDescription } from '@/lib/translations'
import type { Category, MenuItem, Modifier } from '@shared/types'
import { ConsumeMode } from '@shared/types'
import { cn } from '@/lib/utils'

type OrderStep = 'name' | 'choice' | 'sections' | 'menu'
type ServiceMode = 'takeaway' | 'dine-in'

export default function BancoPage() {
  const t = useTranslations('banco')
  const th = useTranslations('home')
  const tc = useTranslations('common')
  const locale = useLocale()

  const [step, setStep] = useState<OrderStep>('name')
  const [customerName, setCustomerNameLocal] = useState('')
  const [serviceMode, setServiceMode] = useState<ServiceMode>('takeaway')
  const [selectedSection, setSelectedSection] = useState<string | null>(null)
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
  const setPriceContext = useCart((state) => state.setPriceContext)
  const addToCart = useCart((state) => state.addItem)

  // Filter categories based on time (bar context - hides panini before 11:00, sushi outside window)
  const filteredCategories = useMemo(() => {
    return filterCategoriesByTime(categories, 'bar')
  }, [categories])

  // Filter categories for the selected section
  // For "toast" section, merge all toast categories into one sorted list
  const sectionCategories = useMemo(() => {
    if (!selectedSection) return filteredCategories

    const sectionCats = filteredCategories.filter(cat => {
      const sectionId = categoryToSectionMap[cat.name]
      return sectionId === selectedSection
    })

    // Special handling for "toast" section: merge all items and sort by number
    if (selectedSection === 'toast' && sectionCats.length >= 1) {
      const allToastItems = sectionCats.flatMap(cat => cat.items || [])
      allToastItems.sort((a, b) => {
        const numA = parseInt(a.name.match(/\d+/)?.[0] || '0')
        const numB = parseInt(b.name.match(/\d+/)?.[0] || '0')
        return numA - numB
      })
      return [{
        ...sectionCats[0],
        id: 'toast-merged',
        name: 'Panini',
        nameEn: 'Sandwiches',
        nameFr: 'Sandwichs',
        nameEs: 'Sándwiches',
        nameHe: 'כריכות',
        items: allToastItems
      }]
    }

    return sectionCats
  }, [filteredCategories, selectedSection])

  useEffect(() => {
    async function loadData() {
      try {
        // Load counter/takeaway table
        const table = await getTableByQr('takeaway')
        setTableIdInCart(table.id)
        setPriceContext('takeaway-counter')

        // Load menu
        const menuData = await getMenu()
        setCategories(menuData)
        if (menuData.length > 0) {
          // Set active category to first filtered category
          const filtered = filterCategoriesByTime(menuData, 'bar')
          if (filtered.length > 0) {
            setActiveCategory(filtered[0].id)
          }
        }
      } catch (err) {
        setError(tc('error'))
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [setTableIdInCart, setPriceContext])

  const scrollToCategory = (categoryId: string) => {
    setActiveCategory(categoryId)
    categoryRefs.current[categoryId]?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  // Get the correct consume mode based on service selection
  const currentConsumeMode = serviceMode === 'dine-in' ? ConsumeMode.DINE_IN : ConsumeMode.TAKEAWAY
  const currentPriceContext = serviceMode === 'dine-in' ? 'dine-in' : 'takeaway-counter'

  const handleAddItem = (item: MenuItem) => {
    if (item.modifierGroups && item.modifierGroups.length > 0) {
      setSelectedItem(item)
    } else {
      addToCart(item, 1, [], undefined, currentConsumeMode)
    }
  }

  const handleAddWithModifiers = (
    quantity: number,
    modifiers: Modifier[],
    notes?: string,
    consumeMode?: ConsumeMode
  ) => {
    if (selectedItem) {
      addToCart(selectedItem, quantity, modifiers, notes, currentConsumeMode)
    }
  }

  const handleOrderSuccess = () => {
    setOrderSuccess(true)
    // Reset after order
    setTimeout(() => {
      setOrderSuccess(false)
      setStep('name')
      setCustomerNameLocal('')
      setServiceMode('takeaway')
    }, 5000)
  }

  const handleContinueToChoice = () => {
    if (customerName.trim()) {
      setCustomerNameInCart(customerName.trim())
      setStep('choice')
    }
  }

  const handleSelectServiceMode = (mode: ServiceMode) => {
    setServiceMode(mode)
    // Update price context based on mode
    if (mode === 'dine-in') {
      setPriceContext('dine-in')
    } else {
      setPriceContext('takeaway-counter')
    }
    setStep('sections')
  }

  const handleSelectSection = (sectionId: string) => {
    setSelectedSection(sectionId)
    // Set active category to first category in section
    const sectionCats = filteredCategories.filter(cat => {
      const catSectionId = categoryToSectionMap[cat.name]
      return catSectionId === sectionId
    })
    if (sectionCats.length > 0) {
      setActiveCategory(sectionCats[0].id)
    }
    setStep('menu')
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
        <AppHeader
          brand={tc('brand')}
          title={th('takeawayCounter')}
          description={th('takeawayCounterDesc')}
          icon={<ShoppingBag className="w-6 h-6" />}
          className="bg-emerald-500"
          descriptionClassName="text-emerald-100"
          rightSlot={<LanguageSelectorCompact />}
        />

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
                  if (e.key === 'Enter') handleContinueToChoice()
                }}
                placeholder={t('namePlaceholder')}
                autoFocus
                className="w-full px-4 py-4 text-lg border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none transition"
              />

              <button
                onClick={handleContinueToChoice}
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

  // Step 2: Choice - Takeaway or Dine-in
  if (step === 'choice') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <AppHeader
          brand={tc('brand')}
          title={th('takeawayCounter')}
          description={th('takeawayCounterDesc')}
          icon={<ShoppingBag className="w-6 h-6" />}
          className="bg-emerald-500"
          descriptionClassName="text-emerald-100"
          onBack={() => setStep('name')}
          backAriaLabel={tc('back')}
          rightSlot={<LanguageSelectorCompact />}
        />

        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
              {t('serviceQuestion')}
            </h2>

            <button
              onClick={() => handleSelectServiceMode('takeaway')}
              className="w-full flex items-center gap-4 p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-orange-500 hover:bg-orange-50 transition"
            >
              <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center">
                <ShoppingBag className="w-7 h-7 text-orange-600" />
              </div>
              <div className="text-left">
                <span className="block font-semibold text-lg text-gray-900">
                  {t('takeaway')}
                </span>
                <span className="text-sm text-gray-500">
                  {t('takeawayDesc')}
                </span>
              </div>
            </button>

            <button
              onClick={() => handleSelectServiceMode('dine-in')}
              className="w-full flex items-center gap-4 p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-primary-500 hover:bg-primary-50 transition"
            >
              <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center">
                <UtensilsCrossed className="w-7 h-7 text-primary-600" />
              </div>
              <div className="text-left">
                <span className="block font-semibold text-lg text-gray-900">
                  {t('dineIn')}
                </span>
                <span className="text-sm text-gray-500">
                  {t('dineInDesc')}
                </span>
              </div>
            </button>
          </div>
        </main>
      </div>
    )
  }

  // Step 3: Sections
  if (step === 'sections') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <AppHeader
          brand={tc('brand')}
          title={th('takeawayCounter')}
          description={th('takeawayCounterDesc')}
          icon={<ShoppingBag className="w-6 h-6" />}
          className="bg-emerald-500"
          descriptionClassName="text-emerald-100"
          onBack={() => setStep('choice')}
          backAriaLabel={tc('back')}
          rightSlot={(
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full">
                <User className="w-4 h-4" />
                <span className="text-sm font-medium">{customerName}</span>
              </div>
              <LanguageSelectorCompact />
            </div>
          )}
        />

        <main className="flex-1 p-4">
          <MenuSections
            onSelectSection={handleSelectSection}
          />
        </main>

        <CartButton onClick={() => setIsCartOpen(true)} />

        <BancoCartDrawer
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          onOrderSuccess={handleOrderSuccess}
          customerName={customerName}
        />
      </div>
    )
  }

  // Step 4: Menu
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <AppHeader
        brand={tc('brand')}
        title={th('takeawayCounter')}
        description={th('takeawayCounterDesc')}
        icon={<ShoppingBag className="w-6 h-6" />}
        className="bg-emerald-500"
        descriptionClassName="text-emerald-100"
        onBack={() => setStep('sections')}
        backAriaLabel={tc('back')}
        rightSlot={(
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full">
              <User className="w-4 h-4" />
              <span className="text-sm font-medium">{customerName}</span>
            </div>
            <LanguageSelectorCompact />
          </div>
        )}
      />

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
                  onAdd={handleAddItem}
                  priceContext={currentPriceContext}
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
