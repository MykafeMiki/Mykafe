'use client'

import { useState, useEffect, useCallback } from 'react'
import { CreditCard, Lock, Loader2, RefreshCw, ArrowLeft, Banknote, CreditCard as CardIcon, Check, Clock, User, ShoppingBag } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { formatPrice } from '@/lib/utils'
import {
  adminLogin,
  verifyToken,
  setAuthToken,
  getAuthToken,
  getCashierTables,
  getTableOrders,
  payTable,
  payOrder,
  getCashierHistory,
  type TableWithOrders,
  type CashierHistoryResponse,
} from '@/lib/api'
import type { Order } from '@shared/types'

type View = 'tables' | 'table-detail' | 'history'

export default function CassaPage() {
  const t = useTranslations('cassa')
  const tl = useTranslations('login')
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const token = getAuthToken()
      if (!token) {
        setIsAuthenticated(false)
        setAuthLoading(false)
        return
      }
      try {
        await verifyToken()
        setIsAuthenticated(true)
      } catch {
        setAuthToken(null)
        setIsAuthenticated(false)
      }
      setAuthLoading(false)
    }
    checkAuth()
  }, [])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">{tl('verifyingAccess')}</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <CassaLoginScreen onLogin={() => setIsAuthenticated(true)} t={tl} tc={t} />
  }

  return <CassaContent t={t} />
}

interface CassaContentProps {
  t: ReturnType<typeof useTranslations<'cassa'>>
}

function CassaContent({ t }: CassaContentProps) {
  const [view, setView] = useState<View>('tables')
  const [tables, setTables] = useState<TableWithOrders[]>([])
  const [takeawayOrders, setTakeawayOrders] = useState<Order[]>([])
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
    // Auto-refresh every 30 seconds
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
      // Refresh table orders
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

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(cents / 100)
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
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

      {/* Success Message */}
      {successMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50">
          <Check className="w-5 h-5" />
          {successMessage}
        </div>
      )}

      <main className="p-4 max-w-6xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : view === 'history' ? (
          // History View
          <div className="space-y-6">
            {history && (
              <>
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
              </>
            )}
          </div>
        ) : view === 'table-detail' && selectedTable ? (
          // Table Detail View
          <div className="space-y-4">
            <button
              onClick={() => {
                setView('tables')
                setSelectedTable(null)
              }}
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
                        onClick={() => handlePaySingleOrder(order.id, 'CASH')}
                        disabled={paymentLoading}
                        className="flex-1 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <Banknote className="w-4 h-4" />
                        {t('cash')}
                      </button>
                      <button
                        onClick={() => handlePaySingleOrder(order.id, 'CARD')}
                        disabled={paymentLoading}
                        className="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <CardIcon className="w-4 h-4" />
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
                      onClick={() => handlePayTable(selectedTable.table.id, 'CASH')}
                      disabled={paymentLoading}
                      className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2 disabled:opacity-50 font-medium"
                    >
                      {paymentLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Banknote className="w-5 h-5" />}
                      {t('payAll')} - {t('cash')}
                    </button>
                    <button
                      onClick={() => handlePayTable(selectedTable.table.id, 'CARD')}
                      disabled={paymentLoading}
                      className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50 font-medium"
                    >
                      {paymentLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CardIcon className="w-5 h-5" />}
                      {t('payAll')} - {t('card')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          // Tables List View
          <div className="space-y-6">
            {/* Tables with orders */}
            {tables.length > 0 && (
              <div>
                <h2 className="text-lg font-bold mb-4">{t('tablesWithOrders')}</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {tables.map((tableData) => (
                    <button
                      key={tableData.table.id}
                      onClick={() => {
                        setSelectedTable(tableData)
                        setView('table-detail')
                      }}
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

            {/* Takeaway/Counter orders */}
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
                          {order.items?.reduce((sum, item) => sum + item.quantity, 0)} {t('items')}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-lg font-bold text-green-600">
                          {formatCurrency(order.totalAmount)}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handlePaySingleOrder(order.id, 'CASH')}
                            disabled={paymentLoading}
                            className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:opacity-50"
                          >
                            <Banknote className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handlePaySingleOrder(order.id, 'CARD')}
                            disabled={paymentLoading}
                            className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
                          >
                            <CardIcon className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {tables.length === 0 && takeawayOrders.length === 0 && (
              <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                <CreditCard className="w-16 h-16 text-purple-300 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-gray-900 mb-2">{t('noActiveOrders')}</h2>
                <p className="text-gray-500">{t('ordersWillAppear')}</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

interface CassaLoginScreenProps {
  onLogin: () => void
  t: ReturnType<typeof useTranslations<'login'>>
  tc: ReturnType<typeof useTranslations<'cassa'>>
}

function CassaLoginScreen({ onLogin, t, tc }: CassaLoginScreenProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) return

    setLoading(true)
    setError('')

    try {
      const { token } = await adminLogin(password)
      setAuthToken(token)
      onLogin()
    } catch {
      setError(t('invalidPassword'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{tc('title')}</h1>
            <p className="text-gray-500 mt-1">{t('enterPassword')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('password')}
                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                autoFocus
              />
            </div>

            {error && (
              <div className="text-red-500 text-sm text-center">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="w-full py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              {loading ? t('loggingIn') : t('login')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
