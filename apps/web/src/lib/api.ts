import { createClient } from '@supabase/supabase-js'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://biefwzrprjqusjynqwus.supabase.co/functions/v1'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://biefwzrprjqusjynqwus.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpZWZ3enJwcmpxdXNqeW5xd3VzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxMDgzMTgsImV4cCI6MjA3OTY4NDMxOH0.CfLbUJa3znC9zNYXdYa0zrFzZM4ASvgw9Ousq27ZqCw'

// Client Supabase per query dirette (bypassa Edge Functions = ~100ms invece di ~400ms)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Token management
let authToken: string | null = null

export function setAuthToken(token: string | null) {
  authToken = token
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('admin_token', token)
    } else {
      localStorage.removeItem('admin_token')
    }
  }
}

export function getAuthToken(): string | null {
  if (authToken) return authToken
  if (typeof window !== 'undefined') {
    authToken = localStorage.getItem('admin_token')
  }
  return authToken
}

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      ...options?.headers,
    },
  })

  if (!res.ok) {
    const errorBody = await res.text()
    console.error('API Error Response:', errorBody)
    throw new Error(`API Error: ${res.status} - ${errorBody}`)
  }

  return res.json()
}

async function fetchApiAuth<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = getAuthToken()
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token || SUPABASE_ANON_KEY}`,
      ...options?.headers,
    },
  })

  if (!res.ok) {
    if (res.status === 401) {
      setAuthToken(null)
    }
    throw new Error(`API Error: ${res.status}`)
  }

  return res.json()
}

// Auth
export const adminLogin = (password: string) =>
  fetchApi<{ token: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  })

export const verifyToken = () =>
  fetchApiAuth<{ valid: boolean }>('/auth/verify')

// Menu
export const getMenu = () => fetchApi<Category[]>('/menu')
export const getMenuItem = (id: string) => fetchApi<MenuItem>(`/menu/items/${id}`)

// ============ MENU CACHING (Query Diretta Supabase) ============

interface CachedMenu {
  data: Category[]
  timestamp: number
}

const MENU_CACHE_KEY = 'mykafe_menu_cache_v2' // v2: invalidate old corrupt caches
const MENU_CACHE_TTL = 60 * 1000 // 1 minuto (più breve perché query è veloce)

// Validate cache data - ensure categories have items
function isValidMenuCache(data: Category[]): boolean {
  if (!data || data.length < 5) return false // Should have at least 5 categories
  // Check that at least some categories have items
  const categoriesWithItems = data.filter(c => c.items && c.items.length > 0)
  return categoriesWithItems.length >= 3
}

// Get menu with local caching - QUERY DIRETTA (~100ms invece di ~400ms)
export const getMenuCached = async (): Promise<Category[]> => {
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(MENU_CACHE_KEY)
      if (cached) {
        const { data, timestamp }: CachedMenu = JSON.parse(cached)
        const age = Date.now() - timestamp

        // Validate cache data - if invalid, fetch fresh
        if (!isValidMenuCache(data)) {
          console.log('Menu cache invalid, fetching fresh data')
          localStorage.removeItem(MENU_CACHE_KEY)
          return fetchMenuDirect()
        }

        // If cache is fresh, return immediately and revalidate in background
        if (age < MENU_CACHE_TTL) {
          revalidateMenu().catch(console.error)
          return data
        }
      }
    } catch {
      // Cache read failed, clear and fetch fresh
      localStorage.removeItem(MENU_CACHE_KEY)
    }
  }

  return fetchMenuDirect()
}

// Query diretta a Supabase (bypassa Edge Function)
async function fetchMenuDirect(): Promise<Category[]> {
  // Query parallele per massima velocità
  const [categoriesResult, outOfStockResult] = await Promise.all([
    // Menu principale
    supabase
      .from('Category')
      .select(`
        id, name, nameEn, nameFr, nameEs, nameHe,
        description, descriptionEn, descriptionFr, descriptionEs, descriptionHe,
        imageUrl, sortOrder, active,
        items:MenuItem(
          id, name, nameEn, nameFr, nameEs, nameHe,
          description, descriptionEn, descriptionFr, descriptionEs, descriptionHe,
          price, priceTakeaway, priceTakeawayRemote,
          imageUrl, available, sortOrder, categoryId,
          modifierGroups:ModifierGroup(
            id, name, nameEn, nameFr, nameEs, nameHe,
            required, multiSelect, minSelect, maxSelect, menuItemId,
            modifiers:Modifier(
              id, name, nameEn, nameFr, nameEs, nameHe,
              price, available, modifierGroupId, ingredientId
            )
          ),
          ingredients:MenuItemIngredient(
            isPrimary,
            ingredient:Ingredient(id, name, nameEn, nameFr, nameEs, nameHe, inStock)
          )
        )
      `)
      .eq('active', true)
      .order('sortOrder', { ascending: true }),

    // Ingredienti non disponibili con match pre-calcolati
    supabase
      .from('Ingredient')
      .select(`
        id, name, nameEn, nameFr, nameEs, nameHe,
        menuItemMatches:MenuItemUnavailableIngredient(menuItemId)
      `)
      .eq('inStock', false)
  ])

  if (categoriesResult.error) {
    console.error('Menu fetch error:', categoriesResult.error)
    throw categoriesResult.error
  }

  const categories = categoriesResult.data || []

  // Mappa: menuItemId -> ingredienti non disponibili (da description matching)
  const itemUnavailableMap = new Map<string, { id: string, name: string, nameEn?: string, nameFr?: string, nameEs?: string, nameHe?: string }[]>()
  const outOfStockIds = new Set<string>()

  for (const ing of outOfStockResult.data || []) {
    outOfStockIds.add(ing.id)
    for (const match of ing.menuItemMatches || []) {
      if (!itemUnavailableMap.has(match.menuItemId)) {
        itemUnavailableMap.set(match.menuItemId, [])
      }
      itemUnavailableMap.get(match.menuItemId)!.push({
        id: ing.id,
        name: ing.name,
        nameEn: ing.nameEn,
        nameFr: ing.nameFr,
        nameEs: ing.nameEs,
        nameHe: ing.nameHe
      })
    }
  }

  // Filtra items e modifiers
  const filtered = categories.map(category => ({
    ...category,
    items: (category.items || [])
      .filter((item: { available: boolean, ingredients?: { isPrimary: boolean, ingredient: { inStock: boolean } }[] }) => {
        if (!item.available) return false
        // Check primary ingredients
        const primaryOutOfStock = item.ingredients?.some(
          (ing: { isPrimary: boolean, ingredient: { inStock: boolean } }) => ing.isPrimary && !ing.ingredient?.inStock
        )
        return !primaryOutOfStock
      })
      .sort((a: { sortOrder: number }, b: { sortOrder: number }) => a.sortOrder - b.sortOrder)
      .map((item: {
        id: string,
        modifierGroups?: { modifiers?: { available: boolean; ingredientId?: string }[] }[],
        ingredients?: { isPrimary: boolean, ingredient: { id: string, name: string, nameEn?: string, nameFr?: string, nameEs?: string, nameHe?: string, inStock: boolean } }[]
      }) => {
        // Ingredienti non disponibili da associazioni esplicite
        const explicitUnavailable = (item.ingredients || [])
          .filter(assoc => !assoc.isPrimary && assoc.ingredient && !assoc.ingredient.inStock)
          .map(assoc => ({
            id: assoc.ingredient.id,
            name: assoc.ingredient.name,
            nameEn: assoc.ingredient.nameEn,
            nameFr: assoc.ingredient.nameFr,
            nameEs: assoc.ingredient.nameEs,
            nameHe: assoc.ingredient.nameHe
          }))

        // Ingredienti non disponibili da description matching
        const descriptionMatches = itemUnavailableMap.get(item.id) || []

        // Merge e deduplica
        const seenIds = new Set<string>()
        const unavailableIngredients: { id: string, name: string, nameEn?: string, nameFr?: string, nameEs?: string, nameHe?: string }[] = []
        for (const ing of [...explicitUnavailable, ...descriptionMatches]) {
          if (!seenIds.has(ing.id)) {
            seenIds.add(ing.id)
            unavailableIngredients.push(ing)
          }
        }

        return {
          ...item,
          unavailableIngredients,
          ingredients: undefined, // Rimuovi raw ingredients dalla risposta
          modifierGroups: item.modifierGroups?.map(group => ({
            ...group,
            modifiers: group.modifiers?.filter(mod =>
              mod.available && (!mod.ingredientId || !outOfStockIds.has(mod.ingredientId))
            )
          }))
        }
      })
  }))

  // Salva in cache
  saveMenuCache(filtered)

  return filtered
}

function saveMenuCache(data: Category[]) {
  if (typeof window !== 'undefined') {
    try {
      const cache: CachedMenu = { data, timestamp: Date.now() }
      localStorage.setItem(MENU_CACHE_KEY, JSON.stringify(cache))
    } catch {
      // localStorage full or unavailable
    }
  }
}

async function revalidateMenu() {
  try {
    await fetchMenuDirect()
  } catch {
    // Background revalidation failed, ignore
  }
}

// Clear menu cache (call when admin updates menu)
export const clearMenuCache = async () => {
  // Clear local cache
  if (typeof window !== 'undefined') {
    localStorage.removeItem(MENU_CACHE_KEY)
  }

  // Trigger ISR revalidation (non-blocking)
  try {
    await fetch('/api/revalidate-menu', { method: 'POST' })
  } catch {
    // Revalidation failed, ignore - will refresh on next ISR cycle
  }
}

// GET MENU via Next.js ISR API Route (~20ms after first request)
// Use this for SSR/SSG pages
export const getMenuISR = async (): Promise<Category[]> => {
  const baseUrl = typeof window !== 'undefined'
    ? ''
    : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const res = await fetch(`${baseUrl}/api/menu`, {
    next: { revalidate: 60 }
  })

  if (!res.ok) {
    throw new Error('Failed to fetch menu')
  }

  return res.json()
}

// Preload menu on app start (non-blocking)
export const preloadMenu = () => {
  if (typeof window !== 'undefined') {
    if ('requestIdleCallback' in window) {
      (window as Window & { requestIdleCallback: (cb: () => void) => void })
        .requestIdleCallback(() => {
          getMenuCached().catch(console.error)
        })
    } else {
      setTimeout(() => {
        getMenuCached().catch(console.error)
      }, 100)
    }
  }
}

// Admin Menu
export const getAdminCategories = () => fetchApi<Category[]>('/menu/admin/categories')

export const createCategory = (data: { name: string; description?: string; imageUrl?: string; sortOrder?: number }) =>
  fetchApi<Category>('/menu/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const updateCategory = (id: string, data: { name?: string; description?: string; imageUrl?: string; sortOrder?: number; active?: boolean }) =>
  fetchApi<Category>(`/menu/categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })

export const createMenuItem = (data: { name: string; description?: string; price: number; categoryId: string; imageUrl?: string; sortOrder?: number }) =>
  fetchApi<MenuItem>('/menu/items', {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const updateMenuItem = (id: string, data: { name?: string; description?: string; price?: number; priceTakeaway?: number | null; priceTakeawayRemote?: number | null; imageUrl?: string; sortOrder?: number; available?: boolean }) =>
  fetchApi<MenuItem>(`/menu/items/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })

export const updateItemAvailability = (id: string, available: boolean) =>
  fetchApi<MenuItem>(`/menu/items/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ available }),
  })

// Tables
export const getTables = () => fetchApi<Table[]>('/tables')
export const getTableByQr = (qrCode: string) => fetchApi<Table>(`/tables/qr/${qrCode}`)
export const getTable = (id: string) => fetchApi<Table>(`/tables/${id}`)

// Orders
export const getActiveOrders = () => fetchApi<Order[]>('/orders/active')

export interface OrderResponse extends Order {
  estimatedWaitMinutes?: number
  queuePosition?: number
}

export const createOrder = (data: CreateOrderRequest) =>
  fetchApi<OrderResponse>('/orders', {
    method: 'POST',
    body: JSON.stringify(data),
  })
export const updateOrderStatus = (id: string, status: string) =>
  fetchApi<Order>(`/orders/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })

// Ingredients
export const getIngredients = () => fetchApi<Ingredient[]>('/ingredients')

export const createIngredient = (data: {
  name: string
  nameEn?: string
  nameFr?: string
  nameEs?: string
  nameHe?: string
  menuType?: string
}) =>
  fetchApiAuth<Ingredient>('/ingredients', {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const updateIngredient = (id: string, data: {
  name?: string
  nameEn?: string
  nameFr?: string
  nameEs?: string
  nameHe?: string
  inStock?: boolean
  menuType?: string
}) =>
  fetchApiAuth<Ingredient>(`/ingredients/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })

export const setIngredientStock = (id: string, inStock: boolean) =>
  fetchApiAuth<Ingredient>(`/ingredients/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ inStock }),
  })

// Menu Item Ingredients
export const setMenuItemIngredients = (menuItemId: string, ingredients: { id: string; isPrimary: boolean }[]) =>
  fetchApiAuth<{ success: boolean }>(`/menu/items/${menuItemId}/ingredients`, {
    method: 'PUT',
    body: JSON.stringify({ ingredients }),
  })

export const getMenuItemIngredients = (menuItemId: string) =>
  fetchApiAuth<{ ingredientId: string; isPrimary: boolean }[]>(`/menu/items/${menuItemId}/ingredients`)

// Party Sessions (deprecated)
export const createParty = (data: { tableId: string; name?: string }) =>
  fetchApi<PartySession>('/party', {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const getPartyByCode = (code: string) =>
  fetchApi<PartySession>(`/party/${code}`)

export const joinParty = (code: string, tableId: string) =>
  fetchApi<PartySession>(`/party/${code}/join`, {
    method: 'POST',
    body: JSON.stringify({ tableId }),
  })

export const getPartyBill = (code: string) =>
  fetchApi<PartyBillResponse>(`/party/${code}/bill`)

export const closeParty = (code: string) =>
  fetchApiAuth<PartySession>(`/party/${code}/close`, {
    method: 'PATCH',
  })

// Table Sessions (merged tables)
export interface TableSession {
  id: string
  code: string
  hostTableId: string
  linkedTables: number[]
  isActive: boolean
  createdAt: string
  closedAt?: string
  hostCustomerName?: string | null
}

export const createTableSession = (data: { hostTableId: string; linkedTableNumbers: number[] }) =>
  fetchApi<TableSession>('/table-sessions', {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const getTableSessionByTable = (tableNumber: number) =>
  fetchApi<TableSession | null>(`/table-sessions/by-table/${tableNumber}`)

export const getTableSessionByCode = (code: string) =>
  fetchApi<TableSession>(`/table-sessions/${code}`)

export const closeTableSession = (code: string) =>
  fetchApi<TableSession>(`/table-sessions/${code}/close`, {
    method: 'PATCH',
  })

// Menu Admin - Modifier Groups
export const addModifierGroup = (menuItemId: string, data: {
  name: string
  required?: boolean
  multiSelect?: boolean
  minSelect?: number
  maxSelect?: number
  modifiers?: { name: string; price?: number; ingredientId?: string }[]
}) =>
  fetchApiAuth<ModifierGroup>(`/menu/items/${menuItemId}/modifier-groups`, {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const addModifier = (modifierGroupId: string, data: {
  name: string
  price?: number
  ingredientId?: string
}) =>
  fetchApiAuth<Modifier>(`/menu/modifier-groups/${modifierGroupId}/modifiers`, {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const updateModifier = (id: string, data: {
  name?: string
  price?: number
  available?: boolean
  ingredientId?: string
}) =>
  fetchApiAuth<Modifier>(`/menu/modifiers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })

export const deleteModifier = (id: string) =>
  fetchApiAuth<{ success: boolean }>(`/menu/modifiers/${id}`, {
    method: 'DELETE',
  })

export const deleteModifierGroup = (id: string) =>
  fetchApiAuth<{ success: boolean }>(`/menu/modifier-groups/${id}`, {
    method: 'DELETE',
  })

// Upload
export interface UploadResult {
  url: string
  path: string
}

export const uploadItemImage = async (file: File): Promise<UploadResult> => {
  const token = getAuthToken()
  const formData = new FormData()
  formData.append('image', file)

  const res = await fetch(`${API_URL}/upload/items`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  })

  if (!res.ok) {
    throw new Error(`Upload Error: ${res.status}`)
  }

  return res.json()
}

export const uploadCategoryImage = async (file: File): Promise<UploadResult> => {
  const token = getAuthToken()
  const formData = new FormData()
  formData.append('image', file)

  const res = await fetch(`${API_URL}/upload/categories`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  })

  if (!res.ok) {
    throw new Error(`Upload Error: ${res.status}`)
  }

  return res.json()
}

export const uploadSectionImage = async (sectionId: string, file: File): Promise<UploadResult> => {
  const token = getAuthToken()
  const formData = new FormData()
  formData.append('image', file)

  const res = await fetch(`${API_URL}/upload/sections/${sectionId}`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  })

  if (!res.ok) {
    throw new Error(`Upload Error: ${res.status}`)
  }

  return res.json()
}

export const deleteImage = async (url: string): Promise<void> => {
  const token = getAuthToken()
  const res = await fetch(`${API_URL}/upload`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({ url }),
  })

  if (!res.ok) {
    throw new Error(`Delete Error: ${res.status}`)
  }
}

// ============ REPORTS ============

export interface TopProduct {
  menuItemId: string
  name: string
  totalQuantity: number
  totalRevenue: number
}

export interface TopProductsReport {
  period: string
  startDate: string
  endDate: string
  products: TopProduct[]
}

export interface HourlyData {
  hour: number
  orderCount: number
  revenue: number
}

export interface PeakHoursReport {
  period: string
  startDate: string
  endDate: string
  hourlyData: HourlyData[]
  peakHours: number[]
  totalOrders: number
  totalRevenue: number
}

export interface SummaryReport {
  period: string
  startDate: string
  endDate: string
  totalOrders: number
  completedOrders: number
  totalRevenue: number
  totalItems: number
  ordersByType: {
    DINE_IN: number
    TAKEAWAY: number
    COUNTER: number
  }
  averageOrderValue: number
}

export const getTopProducts = async (period: 'week' | 'month' = 'week'): Promise<TopProductsReport> => {
  return fetchApi<TopProductsReport>(`/reports/top-products?period=${period}`)
}

export const getPeakHours = async (period: 'week' | 'month' = 'week'): Promise<PeakHoursReport> => {
  return fetchApi<PeakHoursReport>(`/reports/peak-hours?period=${period}`)
}

export const getSummaryReport = async (period: 'week' | 'month' = 'week'): Promise<SummaryReport> => {
  return fetchApi<SummaryReport>(`/reports/summary?period=${period}`)
}

// ============ CASHIER ============

export interface TableWithOrders {
  table: Table
  orders: Order[]
  totalAmount: number
  orderCount: number
}

export interface CashierTablesResponse {
  tables: TableWithOrders[]
  takeawayOrders: Order[]
}

export interface TableOrdersResponse {
  orders: Order[]
  totalAmount: number
}

export interface PayTableResponse {
  paidOrders: number
  totalPaid: number
  orders: Order[]
}

export interface CashierHistoryResponse {
  orders: Order[]
  summary: {
    totalOrders: number
    totalCash: number
    totalCard: number
    grandTotal: number
  }
}

export const getCashierTables = () => fetchApi<CashierTablesResponse>('/cashier/tables')

export const getTableOrders = (tableId: string) =>
  fetchApi<TableOrdersResponse>(`/cashier/table/${tableId}`)

export const payOrder = (orderId: string, paymentMethod: 'CASH' | 'CARD') =>
  fetchApi<Order>(`/cashier/pay/${orderId}`, {
    method: 'PATCH',
    body: JSON.stringify({ paymentMethod }),
  })

export const payTable = (tableId: string, paymentMethod: 'CASH' | 'CARD') =>
  fetchApi<PayTableResponse>(`/cashier/pay-table/${tableId}`, {
    method: 'POST',
    body: JSON.stringify({ paymentMethod }),
  })

export const getCashierHistory = () => fetchApi<CashierHistoryResponse>('/cashier/history')

// ============ TABLE CUSTOMERS ============

export interface TableCustomer {
  id: string
  tableId: string
  name: string
  isHost: boolean
  isActive: boolean
  createdAt: string
  leftAt?: string
}

export interface TableWithCustomers extends Table {
  customers: TableCustomer[]
}

// Get table by QR with customers
export const getTableByQrWithCustomers = (qrCode: string) =>
  fetchApi<TableWithCustomers>(`/tables/qr/${qrCode}`)

// Add customer to table
export const addCustomerToTable = (tableId: string, name: string) =>
  fetchApi<TableCustomer>(`/tables/${tableId}/customers`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  })

// Get customers at table
export const getTableCustomers = (tableId: string) =>
  fetchApi<TableCustomer[]>(`/tables/${tableId}/customers`)

// Get host customer at table
export const getTableHost = (tableId: string) =>
  fetchApi<TableCustomer>(`/tables/${tableId}/host`)

// Clear all customers from table (admin/cashier)
export const clearTableCustomers = (tableId: string) =>
  fetchApiAuth<{ success: boolean }>(`/tables/${tableId}/customers`, {
    method: 'DELETE',
  })

// Update table status
export const updateTableStatus = (tableId: string, status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED') =>
  fetchApi<Table>(`/tables/${tableId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })

// Reset table (clear customers and set to AVAILABLE)
export const resetTable = async (tableId: string): Promise<void> => {
  await clearTableCustomers(tableId)
  await updateTableStatus(tableId, 'AVAILABLE')
}

// Types
import type { Category, MenuItem, Table, Order, Ingredient, PartySession, PartyBillResponse, ModifierGroup, Modifier } from '@shared/types'
import type { CreateOrderRequest } from '@shared/types'
