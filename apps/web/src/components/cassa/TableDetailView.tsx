'use client'

import { Banknote, CreditCard, Loader2, ArrowLeft, User } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { TableWithOrders } from '@/lib/api'

export interface TableDetailViewProps {
  selectedTable: TableWithOrders
  paymentLoading: boolean
  onBack: () => void
  onPayTable: (tableId: string, method: 'CASH' | 'CARD') => void
  onPaySingleOrder: (orderId: string, method: 'CASH' | 'CARD') => void
  t: ReturnType<typeof useTranslations<'cassa'>>
}

export function TableDetailView({
  selectedTable,
  paymentLoading,
  onBack,
  onPayTable,
  onPaySingleOrder,
  t,
}: TableDetailViewProps) {
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(cents / 100)
  }

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('back')}
      </button>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 bg-purple-600 text-white">
          <h2 className="text-xl font-bold">{t('table')} {selectedTable.table.number}</h2>
          <p className="text-purple-200">{selectedTable.orderCount} {selectedTable.orderCount === 1 ? t('order') : t('orders')}</p>
        </div>

        {/* Orders List */}
        <div className="divide-y">
          {selectedTable.orders.map((order) => (
            <div key={order.id} className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="text-sm text-gray-500">
                    {new Date(order.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  {order.customerName && (
                    <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                      <User className="w-3 h-3" />
                      {order.customerName}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg">{formatCurrency(order.totalAmount)}</div>
                  {order.surcharge > 0 && (
                    <div className="text-xs text-gray-500">
                      {t('surcharge')}: {formatCurrency(order.surcharge)}
                    </div>
                  )}
                </div>
              </div>

              {/* Items */}
              <div className="text-sm text-gray-600 mb-3">
                {order.items?.map((item, idx) => (
                  <div key={idx}>
                    {item.quantity}x {item.menuItem?.name}
                  </div>
                ))}
              </div>

              {/* Pay buttons for single order */}
              <div className="flex gap-2">
                <button
                  onClick={() => onPaySingleOrder(order.id, 'CASH')}
                  disabled={paymentLoading}
                  className="flex-1 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Banknote className="w-4 h-4" />
                  {t('cash')}
                </button>
                <button
                  onClick={() => onPaySingleOrder(order.id, 'CARD')}
                  disabled={paymentLoading}
                  className="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <CreditCard className="w-4 h-4" />
                  {t('card')}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Pay All */}
        {selectedTable.orders.length > 1 && (
          <div className="p-4 bg-gray-50 border-t">
            <div className="flex justify-between items-center mb-4">
              <span className="font-bold text-lg">{t('total')}</span>
              <span className="font-bold text-2xl text-purple-600">{formatCurrency(selectedTable.totalAmount)}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onPayTable(selectedTable.table.id, 'CASH')}
                disabled={paymentLoading}
                className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2 disabled:opacity-50 font-medium"
              >
                {paymentLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Banknote className="w-5 h-5" />}
                {t('payAll')} - {t('cash')}
              </button>
              <button
                onClick={() => onPayTable(selectedTable.table.id, 'CARD')}
                disabled={paymentLoading}
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50 font-medium"
              >
                {paymentLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
                {t('payAll')} - {t('card')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
