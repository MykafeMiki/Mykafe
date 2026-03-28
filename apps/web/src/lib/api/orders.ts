import { fetchApi } from './core'
import type { Order, CreateOrderRequest } from '@shared/types'

export interface OrderResponse extends Order {
  estimatedWaitMinutes?: number
  queuePosition?: number
}

export const getActiveOrders = () => fetchApi<Order[]>('/orders/active')

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
