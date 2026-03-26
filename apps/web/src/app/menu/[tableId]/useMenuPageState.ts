'use client'

/**
 * useMenuPageState
 *
 * All state, effects, memos, and handlers for the table menu page.
 * Extracted from page.tsx to keep the rendering layer thin.
 */

import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { useCart } from '@/lib/cart'
import {
  getMenu,
  getTableByQr,
  getTableSessionByTable,
  createTableSession,
  getTableCustomers,
  addCustomerToTable,
  type TableSession,
  type TableCustomer,
} from '@/lib/api'
import { filterCategoriesByTime, type MenuContext } from '@/lib/menuTimers'
import type { Category, MenuItem, Modifier } from '@shared/types'
import { ConsumeMode } from '@shared/types'
import { categoryToSectionMap } from '@/components/menu/MenuSections'

export type PageStep =
  | 'enter-name'
  | 'choice'
  | 'merge-input'
  | 'join-group'
  | 'blocked'
  | 'sections'
  | 'menu'

export function useMenuPageState() {
  const t = useTranslations('tableMenu')
  const tc = useTranslations('common')
  const locale = useLocale()
  const params = useParams()
  const tableId = params.tableId as string

  // ── Navigation ───────────────────────────────────────────────────────────
  const [step, setStep] = useState<PageStep>('enter-name')
  const [selectedSection, setSelectedSection] = useState<string | null>(null)

  // ── Menu data ─────────────────────────────────────────────────────────────
  const [categories, setCategories] = useState<Category[]>([])
  const [activeCategory, setActiveCategory] = useState<string>('')
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)

  // ── Table info ────────────────────────────────────────────────────────────
  const [tableNumber, setTableNumber] = useState<number | null>(null)
  const [tableDbId, setTableDbId] = useState<string | null>(null)
  const [isCounterTable, setIsCounterTable] = useState(false)

  // ── UI state ──────────────────────────────────────────────────────────────
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(false)
  const [estimatedWait, setEstimatedWait] = useState<number | undefined>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ── Customer / session ───────────────────────────────────────────────────
  const [customerName, setCustomerName] = useState('')
  const [existingCustomers, setExistingCustomers] = useState<TableCustomer[]>([])
  const [isSelectingExisting, setIsSelectingExisting] = useState(false)
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [tableSession, setTableSession] = useState<TableSession | null>(null)
  const [mergeInput, setMergeInput] = useState('')
  const [mergeError, setMergeError] = useState<string | null>(null)
  const [creatingSession, setCreatingSession] = useState(false)

  // ── Cart actions ──────────────────────────────────────────────────────────
  const setTableIdInCart = useCart((state) => state.setTableId)
  const setTableSessionInCart = useCart((state) => state.setTableSessionId)
  const setCustomerNameInCart = useCart((state) => state.setCustomerName)
  const checkAndClearStale = useCart((state) => state.checkAndClearStale)
  const addToCart = useCart((state) => state.addItem)

  // ── Derived ───────────────────────────────────────────────────────────────
  const menuContext: MenuContext = isCounterTable ? 'bar' : 'table'

  const filteredCategories = useMemo(
    () => filterCategoriesByTime(categories, menuContext),
    [categories, menuContext]
  )

  const sectionCategories = useMemo(() => {
    if (!selectedSection) return filteredCategories

    const sectionCats = filteredCategories.filter(
      (cat) => categoryToSectionMap[cat.name] === selectedSection
    )

    // Merge all toast/panini categories into a single sorted list
    if (selectedSection === 'toast' && sectionCats.length >= 1) {
      const allPaniniItems = sectionCats.flatMap((cat) => cat.items || [])
      allPaniniItems.sort((a, b) => {
        const numA = parseInt(a.name.match(/\d+/)?.[0] ?? '')
        const numB = parseInt(b.name.match(/\d+/)?.[0] ?? '')
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB
        if (!isNaN(numA)) return -1
        if (!isNaN(numB)) return 1
        return a.name.localeCompare(b.name)
      })
      return [{ ...sectionCats[0], id: 'panini-merged', name: 'Panini', nameEn: 'Sandwiches', nameFr: 'Sandwichs', nameEs: 'Sándwiches', nameHe: 'כריכות', items: allPaniniItems }]
    }

    return sectionCats
  }, [filteredCategories, selectedSection])

  // ── Load data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    checkAndClearStale()

    async function loadData() {
      if (!tableId) return
      try {
        const table = await getTableByQr(tableId)
        setTableNumber(table.number)
        setTableDbId(table.id)
        setTableIdInCart(table.id)
        setIsCounterTable(table.isCounter || false)

        const context: MenuContext = table.isCounter ? 'bar' : 'table'
        const [menuData, customers, existingSession] = await Promise.all([
          getMenu(),
          getTableCustomers(table.id).catch(() => [] as TableCustomer[]),
          table.isCounter
            ? Promise.resolve(null)
            : getTableSessionByTable(table.number).catch(() => null),
        ])

        setExistingCustomers(customers || [])
        if (existingSession) setTableSession(existingSession)

        setCategories(menuData)
        if (menuData.length > 0) {
          const filtered = filterCategoriesByTime(menuData, context)
          if (filtered.length > 0) setActiveCategory(filtered[0].id)
        }

        setStep(table.isCounter ? 'menu' : 'enter-name')
      } catch (err) {
        setError(tc('error'))
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [tableId, setTableIdInCart, setTableSessionInCart, checkAndClearStale, tc])

  // ── Android / iOS back-button guard ──────────────────────────────────────
  // Keeps a "ghost" history entry so the hardware back button navigates steps
  // instead of exiting the app.
  useEffect(() => {
    const pushGuard = () => window.history.pushState({ mykafe: 'guard' }, '', location.href)

    const handlePopState = () => {
      setStep((prev) => {
        if (prev === 'menu') return 'sections'
        if (prev === 'sections') return 'choice'
        if (prev === 'choice') return 'enter-name'
        if (prev === 'merge-input') return 'choice'
        if (prev === 'join-group') return 'enter-name'
        return prev
      })
      pushGuard()
    }

    pushGuard()
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // ── Handlers ──────────────────────────────────────────────────────────────
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
    if (selectedItem) addToCart(selectedItem, quantity, modifiers, notes, consumeMode)
  }

  const handleOrderSuccess = (waitMinutes?: number) => {
    setEstimatedWait(waitMinutes)
    setOrderSuccess(true)
    setTimeout(() => { setOrderSuccess(false); setEstimatedWait(undefined) }, 5000)
  }

  const handleSubmitName = async () => {
    if (!customerName.trim() || !tableDbId) return
    setLoadingCustomers(true)
    try {
      await addCustomerToTable(tableDbId, customerName.trim())
      setCustomerNameInCart(customerName.trim())
      setStep(tableSession ? 'join-group' : 'choice')
    } catch (err) {
      console.error('Failed to register customer:', err)
      setCustomerNameInCart(customerName.trim())
      setStep(tableSession ? 'join-group' : 'choice')
    } finally {
      setLoadingCustomers(false)
    }
  }

  const handleSelectExistingCustomer = (customer: TableCustomer) => {
    setCustomerName(customer.name)
    setCustomerNameInCart(customer.name)
    setIsSelectingExisting(false)
    setStep(tableSession ? 'join-group' : 'choice')
  }

  const handleConfirmMerge = async () => {
    if (!tableDbId || !tableNumber) return

    const numbers = mergeInput
      .split(',')
      .map((n) => parseInt(n.trim()))
      .filter((n) => !isNaN(n) && n !== tableNumber)

    if (numbers.length === 0) { setMergeError(t('invalidTableNumbers')); return }

    setCreatingSession(true)
    setMergeError(null)
    try {
      const session = await createTableSession({ hostTableId: tableDbId, linkedTableNumbers: numbers })
      setTableSession(session)
      setTableSessionInCart(session.id)
      setSelectedSection(null)
      setStep('menu')
    } catch (err) {
      console.error('Failed to create session:', err)
      setMergeError(tc('error'))
    } finally {
      setCreatingSession(false)
    }
  }

  const handleJoinGroup = () => {
    if (tableSession) setTableSessionInCart(tableSession.id)
    setSelectedSection(null)
    setStep('menu')
  }

  const handleSelectSection = (sectionId: string) => {
    setSelectedSection(sectionId)
    const first = filteredCategories.find((cat) => categoryToSectionMap[cat.name] === sectionId)
    if (first) setActiveCategory(first.id)
    setStep('menu')
  }

  return {
    // Navigation
    step, setStep,
    // Menu
    sectionCategories, filteredCategories, activeCategory, setActiveCategory,
    selectedItem, setSelectedItem: () => setSelectedItem(null),
    // Table
    tableNumber, isCounterTable,
    // UI
    isCartOpen, setIsCartOpen, orderSuccess, estimatedWait,
    loading, error,
    // Customer / session
    customerName, setCustomerName,
    existingCustomers,
    isSelectingExisting, setIsSelectingExisting,
    loadingCustomers,
    tableSession,
    mergeInput, setMergeInput,
    mergeError, creatingSession,
    // Handlers
    handleAddItem,
    handleAddWithModifiers,
    handleOrderSuccess,
    handleSubmitName,
    handleSelectExistingCustomer,
    handleSingleTable: () => { setSelectedSection(null); setStep('sections') },
    handleMergeTables: () => setStep('merge-input'),
    handleConfirmMerge,
    handleJoinGroup,
    handleNotInGroup: () => setStep('blocked'),
    handleSelectSection,
    handleBackToSections: () => { setSelectedSection(null); setStep('sections') },
    // i18n
    locale,
  }
}
