'use client'

import { Banknote, CreditCard, ShoppingBag } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { TableWithOrders } from '@/lib/api'
import type { Order } from '@shared/types'

export interface TablesViewProps {
  tables: TableWithOrders[]
  takeawayOrders: Order[]
  onSelectTable: (tableData: TableWithOrders) => void
  onPayOrder: (orderId: string, method: 'CASH' | 'CARD') => void
  paymentLoading: boolean
  t: ReturnType<typeof useTranslations<'cassa'>>
}

export function TablesView({
  tables,
  takeawayOrders,
  onSelectTable,
  onPayOrder,
  paymentLoading,
  t,
}: TablesViewProps) {
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(cents / 100)
  }

  return (
    <div className="space-y-6">
      {tables.length > 0 && (
        <div>
          <h2 className="text-lg font-bold mb-4">{t('tablesWithOrders')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {tables.map((tableData) => (
              <button
                key={tableData.table.id}
                onClick={() => onSelectTable(tableData)}
                className="bg-white rounded-xl shadow-sm p-4 text-left hover:shadow-md transition"
              >
                <div className="text-2xl font-bold text-purple-600 mb-1">
                  {t('table')} {tableData.table.number}
                </div>
                <div className="text-sm text-gray-500 mb-3">
                  {tableData.orderCount} {tableData.orderCount === 1 ? t('order') : t('orders')}
                </div>
                <div className="text-lg font-bold text-green-600">
                  {formatCurrency(tableData.totalAmount)}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {takeawayOrders.length > 0 && (
        <div>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            {t('takeawayOrders')}
          </h2>
          <div className="bg-white rounded-xl shadow-sm divide-y">
            {takeawayOrders.map((order) => (
              <div key={order.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium">
                    {order.customerName || `#${order.id.slice(-6)}`}
                  </div>
                  <div className="text-sm text-gray-500">
                    {order.items?.reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0)} {t('items')}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-lg font-bold text-green-600">
                    {formatCurrency(order.totalAmount)}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onPayOrder(order.id, 'CASH')}
                      disabled={paymentLoading}
                      className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:opacity-50"
                    >
                      <Banknote className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => onPayOrder(order.id, 'CARD')}
                      disabled={paymentLoading}
                      className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
                    >
                      <CreditCard className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tables.length === 0 && takeawayOrders.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <CreditCard className="w-16 h-16 text-purple-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t('noActiveOrders')}</h2>
          <p className="text-gray-500">{t('ordersWillAppear')}</p>
        </div>
      )}
    </div>
  )
}
