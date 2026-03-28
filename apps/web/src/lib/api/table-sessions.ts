import { fetchApi } from './core'

// ============ TABLE SESSIONS (merged tables) ============

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
