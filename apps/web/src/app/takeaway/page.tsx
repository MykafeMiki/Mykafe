'use client'

import { useState, useEffect, useRef } from 'react'
import { CheckCircle, ShoppingBag, Banknote, CreditCard } from 'lucide-react'
import { CategoryNav } from '@/components/menu/CategoryNav'
import { MenuItemCard } from '@/components/menu/MenuItemCard'
import { ItemModal } from '@/components/menu/ItemModal'
import { CartButton } from '@/components/cart/CartButton'
import { TakeawayCartDrawer } from '@/components/cart/TakeawayCartDrawer'
import { useCart } from '@/lib/cart'
import { getMenu, getTableByQr } from '@/lib/api'
import type { Category, MenuItem, Modifier } from '@shared/types'
import { ConsumeMode, PaymentMethod } from '@shared/types'
import { cn } from '@/lib/utils'

export default function TakeawayPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [activeCategory, setActiveCategory] = useState<string>('')
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null)

  const categoryRefs = useRef<Record<string, HTMLElement | null>>({})
  const setTableIdInCart = useCart((state) => state.setTableId)
  const addToCart = useCart((state) => state.addItem)

  useEffect(() => {
    async function loadData() {
      try {
        // Load takeaway table
        const table = await getTableByQr('takeaway')
        setTableIdInCart(table.id)

        // Load menu
        const menuData = await getMenu()
        setCategories(menuData)
        if (menuData.length > 0) {
          setActiveCategory(menuData[0].id)
        }
      } catch (err) {
        setError('Errore nel caricamento del menu')
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
    setTimeout(() => setOrderSuccess(false), 5000)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Caricamento...</div>
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
            Riprova
          </button>
        </div>
      </div>
    )
  }

  // Schermata selezione metodo di pagamento
  if (!paymentMethod) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header */}
        <header className="bg-orange-500 text-white p-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-6 h-6" />
            <h1 className="text-xl font-bold">MyKafe - Take Away</h1>
          </div>
          <p className="text-orange-100 text-sm mt-1">
            Ordina online e ritira in negozio
          </p>
        </header>

        {/* Payment Selection */}
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
              Come vuoi pagare?
            </h2>
            <p className="text-gray-500 text-center mb-8">
              Seleziona il metodo di pagamento per continuare
            </p>

            <div className="space-y-4">
              <button
                onClick={() => setPaymentMethod(PaymentMethod.CASH)}
                className="w-full flex items-center gap-4 p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 transition"
              >
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
                  <Banknote className="w-7 h-7 text-green-600" />
                </div>
                <div className="text-left">
                  <span className="block font-semibold text-lg text-gray-900">
                    Alla consegna in cassa
                  </span>
                  <span className="text-sm text-gray-500">
                    Paga quando ritiri l'ordine
                  </span>
                </div>
              </button>

              <button
                onClick={() => setPaymentMethod(PaymentMethod.CARD)}
                className="w-full flex items-center gap-4 p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition"
              >
                <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
                  <CreditCard className="w-7 h-7 text-blue-600" />
                </div>
                <div className="text-left">
                  <span className="block font-semibold text-lg text-gray-900">
                    Carta
                  </span>
                  <span className="text-sm text-gray-500">
                    Paga subito online
                  </span>
                </div>
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Menu dopo selezione pagamento
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-orange-500 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-6 h-6" />
            <h1 className="text-xl font-bold">MyKafe - Take Away</h1>
          </div>
          <button
            onClick={() => setPaymentMethod(null)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium',
              paymentMethod === PaymentMethod.CASH
                ? 'bg-green-600 text-white'
                : 'bg-blue-600 text-white'
            )}
          >
            {paymentMethod === PaymentMethod.CASH ? (
              <><Banknote className="w-4 h-4" /> In cassa</>
            ) : (
              <><CreditCard className="w-4 h-4" /> Carta</>
            )}
          </button>
        </div>
        <p className="text-orange-100 text-sm mt-1">
          Ordina online e ritira in negozio
        </p>
      </header>

      {/* Category Navigation */}
      <CategoryNav
        categories={categories}
        activeCategory={activeCategory}
        onSelect={scrollToCategory}
      />

      {/* Menu Items */}
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
                  priceMultiplier={paymentMethod === PaymentMethod.CARD ? 1.03 : 1}
                />
              ))}
            </div>
          </section>
        ))}
      </main>

      {/* Cart Button */}
      <CartButton onClick={() => setIsCartOpen(true)} paymentMethod={paymentMethod} />

      {/* Takeaway Cart Drawer */}
      <TakeawayCartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onOrderSuccess={handleOrderSuccess}
        paymentMethod={paymentMethod}
      />

      {/* Item Modal */}
      {selectedItem && (
        <ItemModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onAdd={handleAddWithModifiers}
          defaultConsumeMode={ConsumeMode.TAKEAWAY}
          priceMultiplier={paymentMethod === PaymentMethod.CARD ? 1.03 : 1}
          hideConsumeModeSelector={true}
        />
      )}

      {/* Order Success Toast */}
      {orderSuccess && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-accent-500 text-white p-4 rounded-xl shadow-lg flex items-center gap-3 animate-in slide-in-from-top">
          <CheckCircle className="w-6 h-6" />
          <div>
            <p className="font-semibold">Ordine inviato!</p>
            <p className="text-sm text-accent-100">
              Ti avviseremo quando sarà pronto per il ritiro
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
