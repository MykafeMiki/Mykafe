'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, RefreshCw, ArrowLeft, Clock } from 'lucide-react'
import { useTranslations } from 'next-intl'
import {
  getCashierTables,
  getTableOrders,
  payTable,
  payOrder,
  getCashierHistory,
  type TableWithOrders,
  type CashierHistoryResponse,
} from '@/lib/api'
import { TablesView } from './TablesView'
import { TableDetailView } from './TableDetailView'
import { HistoryView } from './HistoryView'

type View = 'tables' | 'table-detail' | 'history'

export interface CassaContentProps {
  t: ReturnType<typeof useTranslations<'cassa'>>
}

export function CassaContent({ t }: CassaContentProps) {
  const [view, setView] = useState<View>('tables')
  const [tables, setTables] = useState<TableWithOrders[]>([])
  const [takeawayOrders, setTakeawayOrders] = useState<any[]>([])
  const [selectedTable, setSelectedTable] = useState<TableWithOrders | null>(null)
  const [history, setHistory] = useState<CashierHistoryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getCashierTables()
      setTables(data.tables)
      setTakeawayOrders(data.takeawayOrders)
    } catch (err) {
      console.error('Failed to load cashier data:', err)
    }
    setLoading(false)
  }, [])

  const loadHistory = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getCashierHistory()
      setHistory(data)
    } catch (err) {
      console.error('Failed to load history:', err)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [loadData])

  const handlePayTable = async (tableId: string, method: 'CASH' | 'CARD') => {
    setPaymentLoading(true)
    try {
      await payTable(tableId, method)
      setSuccessMessage(t('paidSuccess') + ' - ' + t('tableFreed'))
      setTimeout(() => setSuccessMessage(null), 3000)
      setView('tables')
      setSelectedTable(null)
      loadData()
    } catch (err) {
      console.error('Failed to pay table:', err)
    }
    setPaymentLoading(false)
  }

  const handlePaySingleOrder = async (orderId: string, method: 'CASH' | 'CARD') => {
    setPaymentLoading(true)
    try {
      await payOrder(orderId, method)
      setSuccessMessage(t('paidSuccess'))
      setTimeout(() => setSuccessMessage(null), 3000)
      if (selectedTable) {
        const data = await getTableOrders(selectedTable.table.id)
        if (data.orders.length === 0) {
          setView('tables')
          setSelectedTable(null)
        } else {
          setSelectedTable({
            ...selectedTable,
            orders: data.orders,
            totalAmount: data.totalAmount,
            orderCount: data.orders.length
          })
        }
      }
      loadData()
    } catch (err) {
      console.error('Failed to pay order:', err)
    }
    setPaymentLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-purple-600 text-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t('title')}</h1>
            <p className="text-purple-200">{t('subtitle')}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (view === 'history') {
                  setView('tables')
                  loadData()
                } else {
                  setView('history')
                  loadHistory()
                }
              }}
              className="px-4 py-2 bg-purple-500 rounded-lg hover:bg-purple-400 transition flex items-center gap-2"
            >
              {view === 'history' ? <ArrowLeft className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
              {view === 'history' ? t('back') : t('history')}
            </button>
            <button
              onClick={() => view === 'history' ? loadHistory() : loadData()}
              className="p-2 bg-purple-500 rounded-lg hover:bg-purple-400 transition"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {successMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50">
          {successMessage}
        </div>
      )}

      <main className="p-4 max-w-6xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : view === 'history' ? (
          <HistoryView history={history} t={t} />
        ) : view === 'table-detail' && selectedTable ? (
          <TableDetailView
            selectedTable={selectedTable}
            paymentLoading={paymentLoading}
            onBack={() => {
              setView('tables')
              setSelectedTable(null)
            }}
            onPayTable={handlePayTable}
            onPaySingleOrder={handlePaySingleOrder}
            t={t}
          />
        ) : (
          <TablesView
            tables={tables}
            takeawayOrders={takeawayOrders}
            onSelectTable={(tableData) => {
              setSelectedTable(tableData)
              setView('table-detail')
            }}
            onPayOrder={handlePaySingleOrder}
            paymentLoading={paymentLoading}
            t={t}
          />
        )}
      </main>
    </div>
  )
}
