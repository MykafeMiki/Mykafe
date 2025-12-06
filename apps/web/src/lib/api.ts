const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://biefwzrprjqusjynqwus.supabase.co/functions/v1'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpZWZ3enJwcmpxdXNqeW5xd3VzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxMDgzMTgsImV4cCI6MjA3OTY4NDMxOH0.CfLbUJa3znC9zNYXdYa0zrFzZM4ASvgw9Ousq27ZqCw'

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
    throw new Error(`API Error: ${res.status}`)
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

export const updateMenuItem = (id: string, data: { name?: string; description?: string; price?: number; imageUrl?: string; sortOrder?: number; available?: boolean }) =>
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

// Types
import type { Category, MenuItem, Table, Order, Ingredient, PartySession, PartyBillResponse, ModifierGroup, Modifier } from '@shared/types'
import type { CreateOrderRequest } from '@shared/types'
