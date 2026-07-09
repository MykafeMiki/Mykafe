import { fetchApiAuth } from './core'
import type { Table, Order } from '@shared/types'

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

export const getCashierTables = () => fetchApiAuth<CashierTablesResponse>('/cashier/tables')

export const getTableOrders = (tableId: string) =>
  fetchApiAuth<TableOrdersResponse>(`/cashier/table/${tableId}`)

export const payOrder = (orderId: string, paymentMethod: 'CASH' | 'CARD') =>
  fetchApiAuth<Order>(`/cashier/pay/${orderId}`, {
    method: 'PATCH',
    body: JSON.stringify({ paymentMethod }),
  })

export const payTable = (tableId: string, paymentMethod: 'CASH' | 'CARD') =>
  fetchApiAuth<PayTableResponse>(`/cashier/pay-table/${tableId}`, {
    method: 'POST',
    body: JSON.stringify({ paymentMethod }),
  })

export const getCashierHistory = () => fetchApiAuth<CashierHistoryResponse>('/cashier/history')
