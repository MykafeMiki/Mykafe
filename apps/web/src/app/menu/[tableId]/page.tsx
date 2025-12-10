'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { CheckCircle, Users, User, Link2, UserCircle } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import { CategoryNav } from '@/components/menu/CategoryNav'
import { MenuItemCard } from '@/components/menu/MenuItemCard'
import { ItemModal } from '@/components/menu/ItemModal'
import { MenuSections, menuSections, categoryToSectionMap, getSectionName } from '@/components/menu/MenuSections'
import { CartButton } from '@/components/cart/CartButton'
import { CartDrawer } from '@/components/cart/CartDrawer'
import { LanguageSelectorCompact } from '@/components/LanguageSelector'
import { useCart } from '@/lib/cart'
import { getMenu, getTableByQr, getTableSessionByTable, createTableSession, type TableSession } from '@/lib/api'
import { filterCategoriesByTime, type MenuContext } from '@/lib/menuTimers'
import { getTranslatedName, getTranslatedDescription } from '@/lib/translations'
import type { Category, MenuItem, Modifier, Table } from '@shared/types'
import { ConsumeMode } from '@shared/types'

type PageStep = 'enter-name' | 'choice' | 'merge-input' | 'join-group' | 'sections' | 'menu'

export default function MenuPage() {
  const t = useTranslations('tableMenu')
  const tc = useTranslations('common')
  const locale = useLocale()
  const params = useParams()
  const tableId = params.tableId as string

  const [step, setStep] = useState<PageStep>('enter-name')
  const [selectedSection, setSelectedSection] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [activeCategory, setActiveCategory] = useState<string>('')
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [tableNumber, setTableNumber] = useState<number | null>(null)
  const [tableDbId, setTableDbId] = useState<string | null>(null)
  const [isCounterTable, setIsCounterTable] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(false)
  const [estimatedWait, setEstimatedWait] = useState<number | undefined>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Customer name state
  const [customerName, setCustomerName] = useState('')

  // Table session state
  const [tableSession, setTableSession] = useState<TableSession | null>(null)
  const [mergeInput, setMergeInput] = useState('')
  const [mergeError, setMergeError] = useState<string | null>(null)
  const [creatingSession, setCreatingSession] = useState(false)

  const categoryRefs = useRef<Record<string, HTMLElement | null>>({})
  const setTableIdInCart = useCart((state) => state.setTableId)
  const setTableSessionInCart = useCart((state) => state.setTableSessionId)
  const setCustomerNameInCart = useCart((state) => state.setCustomerName)
  const checkAndClearStale = useCart((state) => state.checkAndClearStale)
  const addToCart = useCart((state) => state.addItem)

  // Determine menu context: counter/bar QR uses 'bar' context, regular tables use 'table'
  const menuContext: MenuContext = isCounterTable ? 'bar' : 'table'

  // Filter categories based on time and context
  // Bar/Counter: hides panini before 11:00, respects sushi timer
  // Table: same behavior as bar (follows same rules)
  const filteredCategories = useMemo(() => {
    return filterCategoriesByTime(categories, menuContext)
  }, [categories, menuContext])

  // Filter categories for the selected section
  const sectionCategories = useMemo(() => {
    if (!selectedSection) return filteredCategories
    return filteredCategories.filter(cat => {
      const sectionId = categoryToSectionMap[cat.name]
      return sectionId === selectedSection
    })
  }, [filteredCategories, selectedSection])

  useEffect(() => {
    // Clear stale cart data (>1 hour old)
    checkAndClearStale()

    async function loadData() {
      if (!tableId) return

      try {
        // Load table info
        const table = await getTableByQr(tableId)
        setTableNumber(table.number)
        setTableDbId(table.id)
        setTableIdInCart(table.id)
        setIsCounterTable(table.isCounter || false)

        // Determine initial step based on table state
        if (table.isCounter) {
          // Counter tables go directly to sections
          setStep('sections')
        } else {
          // Regular tables - ask for name first, then go to sections
          setStep('enter-name')
        }

        // Check if there's an active table session (merged tables)
        try {
          const existingSession = await getTableSessionByTable(table.number)
          if (existingSession) {
            setTableSession(existingSession)
          }
        } catch {
          // No session found, that's ok
        }

        // Determine context based on table type
        const context: MenuContext = table.isCounter ? 'bar' : 'table'

        // Load menu
        const menuData = await getMenu()
        setCategories(menuData)
        if (menuData.length > 0) {
          const filtered = filterCategoriesByTime(menuData, context)
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
  }, [tableId, setTableIdInCart, setTableSessionInCart, checkAndClearStale, tc])

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
      addToCart(item, 1, [])
    }
  }

  const handleAddWithModifiers = (
    quantity: number,
    modifiers: Modifier[],
    notes?: string,
    consumeMode?: ConsumeMode
  ) => {
    if (selectedItem) {
      addToCart(selectedItem, quantity, modifiers, notes, consumeMode)
    }
  }

  const handleOrderSuccess = (waitMinutes?: number) => {
    setEstimatedWait(waitMinutes)
    setOrderSuccess(true)
    setTimeout(() => {
      setOrderSuccess(false)
      setEstimatedWait(undefined)
    }, 5000)
  }

  // Handle name submission for new customer
  const handleSubmitName = () => {
    if (!customerName.trim()) return
    // Save name to cart store so it's included in orders
    setCustomerNameInCart(customerName.trim())
    // After entering name, ask about table sharing
    setStep('choice')
  }

  const handleSingleTable = () => {
    setStep('sections')
  }

  const handleMergeTables = () => {
    setStep('merge-input')
  }

  const handleConfirmMerge = async () => {
    if (!tableDbId || !tableNumber) return

    // Parse input: accept comma-separated numbers
    const numbers = mergeInput
      .split(',')
      .map(n => parseInt(n.trim()))
      .filter(n => !isNaN(n) && n !== tableNumber) // Exclude current table and invalid numbers

    if (numbers.length === 0) {
      setMergeError(t('invalidTableNumbers'))
      return
    }

    setCreatingSession(true)
    setMergeError(null)

    try {
      const session = await createTableSession({
        hostTableId: tableDbId,
        linkedTableNumbers: numbers
      })
      setTableSession(session)
      setTableSessionInCart(session.id)
      setStep('sections')
    } catch (err) {
      console.error('Failed to create session:', err)
      setMergeError(tc('error'))
    } finally {
      setCreatingSession(false)
    }
  }

  const handleJoinGroup = () => {
    // User confirms they're part of the group
    if (tableSession) {
      setTableSessionInCart(tableSession.id)
    }
    setStep('sections')
  }

  const handleNotInGroup = () => {
    // User is not part of the group - clear session and go to sections without it
    setTableSession(null)
    setTableSessionInCart(null)
    setStep('sections')
  }

  // Handle section selection
  const handleSelectSection = (sectionId: string) => {
    setSelectedSection(sectionId)
    // Set active category to first category in section
    const firstCategoryInSection = filteredCategories.find(cat =>
      categoryToSectionMap[cat.name] === sectionId
    )
    if (firstCategoryInSection) {
      setActiveCategory(firstCategoryInSection.id)
    }
    setStep('menu')
  }

  // Handle back to sections
  const handleBackToSections = () => {
    setSelectedSection(null)
    setStep('sections')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-500">{t('loadingMenu')}</div>
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

  // Step 0: Enter name - First step for empty tables
  if (step === 'enter-name') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-primary-500 text-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">MyKafe</h1>
              {tableNumber && (
                <p className="text-primary-100">{t('table')} {tableNumber}</p>
              )}
            </div>
            <LanguageSelectorCompact />
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserCircle className="w-10 h-10 text-primary-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                {t('welcome')}
              </h2>
              <p className="text-gray-600 mt-2">
                {t('enterYourName')}
              </p>
            </div>

            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder={t('namePlaceholder')}
              className="w-full px-4 py-4 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:outline-none text-lg text-center"
              autoFocus
            />

            <button
              onClick={handleSubmitName}
              disabled={!customerName.trim()}
              className={`w-full mt-6 py-4 rounded-xl font-semibold text-lg transition ${
                customerName.trim()
                  ? 'bg-primary-500 text-white hover:bg-primary-600'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {tc('continue')}
            </button>
          </div>
        </main>
      </div>
    )
  }

  // Step 1: Choice - Single table or merge tables
  if (step === 'choice') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-primary-500 text-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">MyKafe</h1>
              {tableNumber && (
                <p className="text-primary-100">{t('table')} {tableNumber}</p>
              )}
            </div>
            <LanguageSelectorCompact />
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
              {t('singleTable')}
            </h2>

            <button
              onClick={handleSingleTable}
              className="w-full flex items-center gap-4 p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-primary-500 hover:bg-primary-50 transition"
            >
              <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center">
                <User className="w-7 h-7 text-primary-600" />
              </div>
              <div className="text-left">
                <span className="block font-semibold text-lg text-gray-900">
                  {tc('yes')}
                </span>
                <span className="text-sm text-gray-500">
                  {t('singleTableDesc')}
                </span>
              </div>
            </button>

            <button
              onClick={handleMergeTables}
              className="w-full flex items-center gap-4 p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-orange-500 hover:bg-orange-50 transition"
            >
              <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center">
                <Users className="w-7 h-7 text-orange-600" />
              </div>
              <div className="text-left">
                <span className="block font-semibold text-lg text-gray-900">
                  {t('mergeTables')}
                </span>
                <span className="text-sm text-gray-500">
                  {t('mergeTablesDesc')}
                </span>
              </div>
            </button>
          </div>
        </main>
      </div>
    )
  }

  // Step 2: Merge input - Enter table numbers to merge
  if (step === 'merge-input') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-primary-500 text-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">MyKafe</h1>
              {tableNumber && (
                <p className="text-primary-100">{t('table')} {tableNumber}</p>
              )}
            </div>
            <LanguageSelectorCompact />
          </div>
        </header>

        <main className="flex-1 p-6 max-w-md mx-auto w-full">
          <button
            onClick={() => setStep('choice')}
            className="text-primary-500 mb-4 text-sm font-medium"
          >
            &larr; {tc('back')}
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <Link2 className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {t('mergeTables')}
              </h2>
              <p className="text-gray-500 text-sm">
                {t('table')} {tableNumber}
              </p>
            </div>
          </div>

          <p className="text-gray-600 mb-4">
            {t('enterTableNumbers')}
          </p>

          <input
            type="text"
            value={mergeInput}
            onChange={(e) => setMergeInput(e.target.value)}
            placeholder={t('tableNumbersPlaceholder')}
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:outline-none text-lg"
          />

          {mergeError && (
            <p className="text-red-500 text-sm mt-2">{mergeError}</p>
          )}

          <button
            onClick={handleConfirmMerge}
            disabled={!mergeInput.trim() || creatingSession}
            className={`w-full mt-6 py-4 rounded-xl font-semibold text-lg transition ${
              mergeInput.trim() && !creatingSession
                ? 'bg-primary-500 text-white hover:bg-primary-600'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {creatingSession ? tc('loading') : t('confirmMerge')}
          </button>
        </main>
      </div>
    )
  }

  // Step 3: Join existing group - ask if they're part of the group
  if (step === 'join-group' && tableSession) {
    // Get all table numbers in the group
    const allGroupTables = [tableSession.linkedTables[0], ...tableSession.linkedTables.slice(1)]
      .filter(n => n !== tableNumber) // Exclude current table from display

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-primary-500 text-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">MyKafe</h1>
              {tableNumber && (
                <p className="text-primary-100">{t('table')} {tableNumber}</p>
              )}
            </div>
            <LanguageSelectorCompact />
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md space-y-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-orange-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                {t('groupExists')}
              </h2>
              <p className="text-gray-600 mt-2">
                {t('groupExistsDesc', { tables: tableSession.linkedTables.join(', ') })}
              </p>
            </div>

            <button
              onClick={handleJoinGroup}
              className="w-full flex items-center gap-4 p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-primary-500 hover:bg-primary-50 transition"
            >
              <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center">
                <Users className="w-7 h-7 text-primary-600" />
              </div>
              <div className="text-left">
                <span className="block font-semibold text-lg text-gray-900">
                  {tc('yes')}
                </span>
                <span className="text-sm text-gray-500">
                  {t('joinGroupDesc')}
                </span>
              </div>
            </button>

            <button
              onClick={handleNotInGroup}
              className="w-full flex items-center gap-4 p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition"
            >
              <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
                <User className="w-7 h-7 text-gray-600" />
              </div>
              <div className="text-left">
                <span className="block font-semibold text-lg text-gray-900">
                  {tc('no')}
                </span>
                <span className="text-sm text-gray-500">
                  {t('notInGroupDesc')}
                </span>
              </div>
            </button>
          </div>
        </main>
      </div>
    )
  }

  // Step 4: Sections view
  if (step === 'sections') {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        {/* Header */}
        <header className="bg-primary-500 text-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-display font-semibold italic">MyKafe</h1>
              {tableNumber !== null && tableNumber > 0 && (
                <p className="text-primary-100">{t('table')} {tableNumber}</p>
              )}
            </div>
            <LanguageSelectorCompact />
          </div>
        </header>

        {/* Sections Grid */}
        <MenuSections onSelectSection={handleSelectSection} />

        {/* Cart Button */}
        <CartButton onClick={() => setIsCartOpen(true)} />

        {/* Cart Drawer */}
        <CartDrawer
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          onOrderSuccess={handleOrderSuccess}
        />

        {/* Order Success Toast */}
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

  // Step 5: Menu view (filtered by section)
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-primary-500 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBackToSections}
              className="p-2 -ml-2 hover:bg-primary-600 rounded-lg transition"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-display font-semibold italic">
                {selectedSection && getSectionName(
                  menuSections.find(s => s.id === selectedSection)!,
                  locale
                )}
              </h1>
              {tableNumber !== null && tableNumber > 0 && (
                <p className="text-primary-100 text-sm">
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
        {/* Session indicator */}
        {tableSession && (
          <div className="mt-2 flex items-center gap-2 text-sm text-primary-100">
            <Link2 className="w-4 h-4" />
            <span>{t('sessionActive')}: {t('tables')} {tableNumber}, {tableSession.linkedTables.join(', ')}</span>
          </div>
        )}
      </header>

      {/* Category Navigation (only categories in selected section) */}
      <CategoryNav
        categories={sectionCategories}
        activeCategory={activeCategory}
        onSelect={scrollToCategory}
      />

      {/* Menu Items */}
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
                />
              ))}
            </div>
          </section>
        ))}
      </main>

      {/* Cart Button */}
      <CartButton onClick={() => setIsCartOpen(true)} />

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onOrderSuccess={handleOrderSuccess}
      />

      {/* Item Modal */}
      {selectedItem && (
        <ItemModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onAdd={handleAddWithModifiers}
        />
      )}

      {/* Order Success Toast */}
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
