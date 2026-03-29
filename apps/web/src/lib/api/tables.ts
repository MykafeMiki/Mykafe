import { fetchApi, fetchApiAuth } from './core'
import type { Table } from '@shared/types'
import { getTableSessionByTable, closeTableSession } from './table-sessions'

// ============ TABLE BASICS ============

export const getTables = () => fetchApi<Table[]>('/tables')
export const getTableByQr = (qrCode: string) => fetchApi<Table>(`/tables/qr/${qrCode}`)
export const getTable = (id: string) => fetchApi<Table>(`/tables/${id}`)

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

// Reset table (clear customers, close active session, set to AVAILABLE)
export const resetTable = async (tableId: string): Promise<void> => {
  const table = await getTable(tableId)
  const session = await getTableSessionByTable(table.number).catch(() => null)
  await Promise.all([
    clearTableCustomers(tableId),
    session?.isActive ? closeTableSession(session.code) : Promise.resolve(),
  ])
  await updateTableStatus(tableId, 'AVAILABLE')
}
