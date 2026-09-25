'use client'

/**
 * useMenuPageState
 *
 * All state, effects, memos, and handlers for the table menu page.
 * Extracted from page.tsx to keep the rendering layer thin.
 */

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
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

export type PageStep =
  | 'enter-name'
  | 'choice'
  | 'merge-input'
  | 'join-group'
  | 'blocked'
  | 'menu'

export function useMenuPageState(qrCodeOverride?: string, kioskGuard = false) {
  const t = useTranslations('tableMenu')
  const tc = useTranslations('common')
  const locale = useLocale()
  const params = useParams()
  // qrCodeOverride e' usato dalla pagina /kiosk: li' il tavolo non arriva
  // dallo slug della route ma dall'assegnazione admin del dispositivo.
  const tableId = qrCodeOverride ?? (params.tableId as string)

  // ── Navigation ───────────────────────────────────────────────────────────
  const [step, setStep] = useState<PageStep>('enter-name')

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
  const setPriceContext = useCart((state) => state.setPriceContext)
  const addToCart = useCart((state) => state.addItem)

  // ── Derived ───────────────────────────────────────────────────────────────
  const menuContext: MenuContext = isCounterTable ? 'bar' : 'table'

  const filteredCategories = useMemo(
    () => filterCategoriesByTime(categories, menuContext),
    [categories, menuContext]
  )

  // ── Load data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    checkAndClearStale()

    // Il listino e' persistito nel carrello: senza riassegnarlo, chi ha appena
    // ordinato da /ordina si porterebbe dietro i prezzi asporto al tavolo.
    setPriceContext('dine-in')

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
  }, [tableId, setTableIdInCart, setTableSessionInCart, checkAndClearStale, setPriceContext, tc])

  // ── Back navigation ──────────────────────────────────────────────────────
  // In kiosk (iPad) ogni "indietro" che riporta verso l'inizio del flusso passa
  // dal codice staff: un cliente non puo' azzerare il tavolo. Il passo
  // merge-input -> choice e' interno al flusso e resta libero.
  const stepRef = useRef<PageStep>(step)
  stepRef.current = step
  const [pendingBack, setPendingBack] = useState<PageStep | null>(null)

  const goBack = useCallback(
    (target: PageStep) => {
      if (kioskGuard && stepRef.current !== 'merge-input') setPendingBack(target)
      else setStep(target)
    },
    [kioskGuard]
  )

  const confirmBack = () => {
    if (pendingBack) setStep(pendingBack)
    setPendingBack(null)
  }
  const cancelBack = () => setPendingBack(null)

  // ── Android / iOS back-button guard ──────────────────────────────────────
  // Keeps a "ghost" history entry so the hardware back button navigates steps
  // instead of exiting the app.
  useEffect(() => {
    const pushGuard = () => window.history.pushState({ mykafe: 'guard' }, '', location.href)

    const handlePopState = () => {
      const prev = stepRef.current
      const target: PageStep | null =
        prev === 'menu' ? 'choice'
        : prev === 'choice' ? 'enter-name'
        : prev === 'merge-input' ? 'choice'
        : prev === 'join-group' ? 'enter-name'
        : null
      if (target) goBack(target)
      pushGuard()
    }

    pushGuard()
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [goBack])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleAddItem = (item: MenuItem) => {
    setSelectedItem(item)
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
    setStep('menu')
  }

  return {
    // Navigation
    step, setStep,
    goBack, pendingBack, confirmBack, cancelBack,
    // Menu
    filteredCategories, activeCategory, setActiveCategory,
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
    handleSingleTable: () => setStep('menu'),
    handleMergeTables: () => setStep('merge-input'),
    handleConfirmMerge,
    handleJoinGroup,
    handleNotInGroup: () => setStep('blocked'),
    // i18n
    locale,
  }
}
