'use client'

import { useState, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { useCart } from '@/lib/cart'
import { getMenu, getTableByQr } from '@/lib/api'
import { filterCategoriesByTime } from '@/lib/menuTimers'
import type { Category, MenuItem, Modifier } from '@shared/types'
import { ConsumeMode } from '@shared/types'
import { NameStep } from '@/components/banco/NameStep'
import { ServiceChoiceStep } from '@/components/banco/ServiceChoiceStep'
import { SectionsStep } from '@/components/banco/SectionsStep'
import { MenuStep } from '@/components/banco/MenuStep'
import { categoryToSectionMap } from '@/components/menu/MenuSections'

type OrderStep = 'name' | 'choice' | 'sections' | 'menu'
type ServiceMode = 'takeaway' | 'dine-in'

export default function BancoPage() {
  const t = useTranslations('banco')
  const tc = useTranslations('common')

  const [step, setStep] = useState<OrderStep>('name')
  const [customerName, setCustomerName] = useState('')
  const [serviceMode, setServiceMode] = useState<ServiceMode>('takeaway')
  const [selectedSection, setSelectedSection] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [activeCategory, setActiveCategory] = useState<string>('')
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const setTableIdInCart = useCart((state) => state.setTableId)
  const setCustomerNameInCart = useCart((state) => state.setCustomerName)
  const setPriceContext = useCart((state) => state.setPriceContext)
  const addToCart = useCart((state) => state.addItem)

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

  // Consume mode and price context depend on serviceMode
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
    setTimeout(() => {
      setOrderSuccess(false)
      setStep('name')
      setCustomerName('')
      setServiceMode('takeaway')
    }, 5000)
  }

  const handleSelectServiceMode = (mode: ServiceMode) => {
    setServiceMode(mode)
    if (mode === 'dine-in') {
      setPriceContext('dine-in')
    } else {
      setPriceContext('takeaway-counter')
    }
    setStep('sections')
  }

  const handleSelectSection = (sectionId: string) => {
    setSelectedSection(sectionId)
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

  if (step === 'name') {
    return (
      <NameStep
        customerName={customerName}
        onCustomerNameChange={setCustomerName}
        onContinue={() => {
          if (customerName.trim()) {
            setCustomerNameInCart(customerName.trim())
            setStep('choice')
          }
        }}
      />
    )
  }

  if (step === 'choice') {
    return (
      <ServiceChoiceStep
        customerName={customerName}
        onGoBack={() => setStep('name')}
        onSelectTakeaway={() => handleSelectServiceMode('takeaway')}
        onSelectDineIn={() => handleSelectServiceMode('dine-in')}
      />
    )
  }

  if (step === 'sections') {
    return (
      <SectionsStep
        customerName={customerName}
        serviceMode={serviceMode}
        filteredCategories={filteredCategories}
        isCartOpen={isCartOpen}
        onGoBack={() => setStep('choice')}
        onSelectSection={handleSelectSection}
        onCartOpen={setIsCartOpen}
        onOrderSuccess={handleOrderSuccess}
      />
    )
  }

  return (
    <MenuStep
      customerName={customerName}
      sectionCategories={sectionCategories}
      activeCategory={activeCategory}
      selectedItem={selectedItem}
      isCartOpen={isCartOpen}
      orderSuccess={orderSuccess}
      currentPriceContext={currentPriceContext}
      currentConsumeMode={currentConsumeMode}
      onGoBack={() => setStep('sections')}
      onCategorySelect={setActiveCategory}
      onAddItem={handleAddItem}
      onAddWithModifiers={handleAddWithModifiers}
      onSelectItemClose={() => setSelectedItem(null)}
      onCartOpen={setIsCartOpen}
      onOrderSuccess={handleOrderSuccess}
    />
  )
}
