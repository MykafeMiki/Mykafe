export interface Table {
  id: string
  number: number
  isCounter: boolean
}

export interface MenuItem {
  id: string
  name: string
  price: number
}

export interface Modifier {
  id: string
  name: string
  price: number
}

export interface OrderItemModifier {
  id: string
  modifier: Modifier
}

export interface OrderItem {
  id: string
  quantity: number
  notes?: string
  consumeMode: 'DINE_IN' | 'TAKEAWAY'
  menuItem: MenuItem
  modifiers: OrderItemModifier[]
}

export interface Order {
  id: string
  tableId: string
  table: Table
  items: OrderItem[]
  status: string
  orderType: 'DINE_IN' | 'TAKEAWAY'
  paymentMethod?: 'CASH' | 'CARD'
  subtotal: number
  surcharge: number
  totalAmount: number
  customerName?: string
  notes?: string
  createdAt: string
}
