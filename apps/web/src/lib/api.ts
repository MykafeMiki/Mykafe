const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

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
      ...(token && { Authorization: `Bearer ${token}` }),
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
  fetchApi<{ token: string }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  })

export const verifyToken = () =>
  fetchApiAuth<{ valid: boolean }>('/api/auth/verify')

// Menu
export const getMenu = () => fetchApi<Category[]>('/api/menu')
export const getMenuItem = (id: string) => fetchApi<MenuItem>(`/api/menu/items/${id}`)

// Admin Menu
export const createCategory = (data: { name: string; description?: string; imageUrl?: string; sortOrder?: number }) =>
  fetchApi<Category>('/api/menu/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const updateCategory = (id: string, data: { name?: string; description?: string; imageUrl?: string; sortOrder?: number; active?: boolean }) =>
  fetchApi<Category>(`/api/menu/categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })

export const createMenuItem = (data: { name: string; description?: string; price: number; categoryId: string; imageUrl?: string; sortOrder?: number }) =>
  fetchApi<MenuItem>('/api/menu/items', {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const updateMenuItem = (id: string, data: { name?: string; description?: string; price?: number; imageUrl?: string; sortOrder?: number; available?: boolean }) =>
  fetchApi<MenuItem>(`/api/menu/items/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })

export const updateItemAvailability = (id: string, available: boolean) =>
  fetchApi<MenuItem>(`/api/menu/items/${id}/availability`, {
    method: 'PATCH',
    body: JSON.stringify({ available }),
  })

// Tables
export const getTables = () => fetchApi<Table[]>('/api/tables')
export const getTableByQr = (qrCode: string) => fetchApi<Table>(`/api/tables/qr/${qrCode}`)
export const getTable = (id: string) => fetchApi<Table>(`/api/tables/${id}`)

// Orders
export const getActiveOrders = () => fetchApi<Order[]>('/api/orders/active')
export const createOrder = (data: CreateOrderRequest) =>
  fetchApi<Order>('/api/orders', {
    method: 'POST',
    body: JSON.stringify(data),
  })
export const updateOrderStatus = (id: string, status: string) =>
  fetchApi<Order>(`/api/orders/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
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

  const res = await fetch(`${API_URL}/api/upload/items`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
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

  const res = await fetch(`${API_URL}/api/upload/categories`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })

  if (!res.ok) {
    throw new Error(`Upload Error: ${res.status}`)
  }

  return res.json()
}

export const deleteImage = async (url: string): Promise<void> => {
  const token = getAuthToken()
  const res = await fetch(`${API_URL}/api/upload`, {
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

// Types
import type { Category, MenuItem, Table, Order } from '@shared/types'
import type { CreateOrderRequest } from '@shared/types'
