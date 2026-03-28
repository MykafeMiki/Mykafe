'use client'

import { useTranslations } from 'next-intl'
import type { CashierHistoryResponse } from '@/lib/api'

export interface HistoryViewProps {
  history: CashierHistoryResponse | null
  t: ReturnType<typeof useTranslations<'cassa'>>
}

export function HistoryView({ history, t }: HistoryViewProps) {
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(cents / 100)
  }

  if (!history) return null

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 shadow">
          <div className="text-2xl font-bold text-purple-600">{history.summary.totalOrders}</div>
          <div className="text-sm text-gray-500">{t('orders')}</div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow">
          <div className="text-2xl font-bold text-green-600">{formatCurrency(history.summary.totalCash)}</div>
          <div className="text-sm text-gray-500">{t('totalCash')}</div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow">
          <div className="text-2xl font-bold text-blue-600">{formatCurrency(history.summary.totalCard)}</div>
          <div className="text-sm text-gray-500">{t('totalCard')}</div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow">
          <div className="text-2xl font-bold text-purple-600">{formatCurrency(history.summary.grandTotal)}</div>
          <div className="text-sm text-gray-500">{t('grandTotal')}</div>
        </div>
      </div>

      {/* Orders List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h3 className="font-bold">{t('todaySummary')}</h3>
        </div>
        <div className="divide-y">
          {history.orders.map((order) => (
            <div key={order.id} className="p-4 flex items-center justify-between">
              <div>
                <div className="font-medium">
                  {order.table?.isCounter ? t('takeawayOrders') : `${t('table')} ${order.table?.number}`}
                  {order.customerName && <span className="text-gray-500 ml-2">- {order.customerName}</span>}
                </div>
                <div className="text-sm text-gray-500">
                  {order.items?.reduce((sum, item) => sum + item.quantity, 0)} {t('items')}
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold">{formatCurrency(order.totalAmount)}</div>
                <div className={`text-xs ${order.paymentMethod === 'CASH' ? 'text-green-600' : 'text-blue-600'}`}>
                  {order.paymentMethod === 'CASH' ? t('cash') : t('card')}
                </div>
              </div>
            </div>
          ))}
          {history.orders.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              {t('noActiveOrders')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
