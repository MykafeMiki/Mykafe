/**
 * PATCH: apps/web/src/app/menu/[tableId]/page.tsx
 * 
 * Problema originale: chiamate API sequenziali
 * 1. getTableByQr()
 * 2. getTableCustomers()
 * 3. getTableSessionByTable()
 * 4. getMenu()
 * 
 * Soluzione: parallelizzare dove possibile
 */

// SOSTITUISCI il blocco useEffect loadData() con questo:

useEffect(() => {
  // Clear stale cart data (>1 hour old)
  checkAndClearStale()

  async function loadData() {
    if (!tableId) return

    try {
      // STEP 1: Load table info first (required for other calls)
      const table = await getTableByQr(tableId)
      setTableNumber(table.number)
      setTableDbId(table.id)
      setTableIdInCart(table.id)
      setIsCounterTable(table.isCounter || false)

      // STEP 2: PARALLEL - Load menu, customers, and session simultaneously
      const context: MenuContext = table.isCounter ? 'bar' : 'table'
      
      const [menuData, customers, existingSession] = await Promise.all([
        // Menu - use cached version for speed
        getMenuCached(),
        
        // Customers - wrapped in try/catch to not fail if empty
        getTableCustomers(table.id).catch(() => [] as TableCustomer[]),
        
        // Session - only for non-counter tables
        table.isCounter 
          ? Promise.resolve(null) 
          : getTableSessionByTable(table.number).catch(() => null)
      ])

      // Set customers
      setExistingCustomers(customers || [])

      // Set session
      if (existingSession) {
        setTableSession(existingSession)
      }

      // Set menu
      setCategories(menuData)
      if (menuData.length > 0) {
        const filtered = filterCategoriesByTime(menuData, context)
        if (filtered.length > 0) {
          setActiveCategory(filtered[0].id)
        }
      }

      // Determine initial step based on table state
      if (table.isCounter) {
        setSelectedSection(null)
        setStep('menu')
      } else {
        setStep('enter-name')
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


/**
 * BONUS: Preload menu on app initialization
 * 
 * Add to apps/web/src/app/layout.tsx:
 */

// In layout.tsx, add this after imports:
// import { preloadMenu } from '@/lib/api'

// And call it in the RootLayout component:
// useEffect(() => { preloadMenu() }, [])

// Or in a client component wrapper:
/*
'use client'
import { useEffect } from 'react'
import { preloadMenu } from '@/lib/api'

export function MenuPreloader() {
  useEffect(() => {
    preloadMenu()
  }, [])
  return null
}
*/

// Then in layout.tsx:
// <MenuPreloader />
