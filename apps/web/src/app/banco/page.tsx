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
import { MenuStep } from '@/components/banco/MenuStep'

type OrderStep = 'name' | 'choice' | 'menu'
type ServiceMode = 'takeaway' | 'dine-in'

export default function BancoPage() {
  const t = useTranslations('banco')
  const tc = useTranslations('common')

  const [step, setStep] = useState<OrderStep>('name')
  const [customerName, setCustomerName] = useState('')
  const [serviceMode, setServiceMode] = useState<ServiceMode>('takeaway')
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
  const clearCart = useCart((state) => state.clearCart)

  const filteredCategories = useMemo(() => {
    return filterCategoriesByTime(categories, 'bar')
  }, [categories])

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

  // Il carrello e' persistito in localStorage e il banco e' un dispositivo
  // condiviso: senza questo, il cliente successivo eredita gli articoli del
  // precedente. Si riparte da zero a ogni ingresso nel flusso.
  useEffect(() => {
    clearCart()
  }, [clearCart])

  // Consume mode and price context depend on serviceMode
  const currentConsumeMode = serviceMode === 'dine-in' ? ConsumeMode.DINE_IN : ConsumeMode.TAKEAWAY
  const currentPriceContext = serviceMode === 'dine-in' ? 'dine-in' : 'takeaway-counter'

  const handleAddItem = (item: MenuItem) => {
    setSelectedItem(item)
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

  return (
    <MenuStep
      customerName={customerName}
      categories={filteredCategories}
      activeCategory={activeCategory}
      selectedItem={selectedItem}
      isCartOpen={isCartOpen}
      orderSuccess={orderSuccess}
      currentPriceContext={currentPriceContext}
      currentConsumeMode={currentConsumeMode}
      onGoBack={() => setStep('choice')}
      onCategorySelect={setActiveCategory}
      onAddItem={handleAddItem}
      onAddWithModifiers={handleAddWithModifiers}
      onSelectItemClose={() => setSelectedItem(null)}
      onCartOpen={setIsCartOpen}
      onOrderSuccess={handleOrderSuccess}
    />
  )
}
