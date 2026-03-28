'use client'

import { useState, useEffect, useCallback } from 'react'
import { BarChart3, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { getTopProducts, getPeakHours, getSummaryReport } from '@/lib/api'
import type { TopProductsReport, PeakHoursReport, SummaryReport } from '@/lib/api'

export interface ReportsTabProps {
  t: ReturnType<typeof useTranslations<'admin'>>
  tc: ReturnType<typeof useTranslations<'common'>>
}

export function ReportsTab({ t, tc }: ReportsTabProps) {
  const [period, setPeriod] = useState<'week' | 'month'>('week')
  const [topProducts, setTopProducts] = useState<TopProductsReport | null>(null)
  const [peakHours, setPeakHours] = useState<PeakHoursReport | null>(null)
  const [summary, setSummary] = useState<SummaryReport | null>(null)
  const [loading, setLoading] = useState(true)

  const loadReports = useCallback(async () => {
    setLoading(true)
    try {
      const [productsData, hoursData, summaryData] = await Promise.all([
        getTopProducts(period),
        getPeakHours(period),
        getSummaryReport(period)
      ])
      setTopProducts(productsData)
      setPeakHours(hoursData)
      setSummary(summaryData)
    } catch (err) {
      console.error('Failed to load reports:', err)
    }
    setLoading(false)
  }, [period])

  useEffect(() => {
    loadReports()
  }, [loadReports])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount / 100)
  }

  const maxQuantity = topProducts?.products?.[0]?.totalQuantity || 1
  const maxOrders = Math.max(...(peakHours?.hourlyData?.map(h => h.orderCount) || [1]))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <BarChart3 className="w-6 h-6" />
          {t('reportsTitle')}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setPeriod('week')}
            className={`px-4 py-2 rounded-lg font-medium transition ${period === 'week'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
          >
            {t('periodWeek')}
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-4 py-2 rounded-lg font-medium transition ${period === 'month'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
          >
            {t('periodMonth')}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-4 shadow">
                <div className="text-2xl font-bold text-primary-600">{summary.totalOrders}</div>
                <div className="text-sm text-gray-500">{t('totalOrders')}</div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow">
                <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalRevenue)}</div>
                <div className="text-sm text-gray-500">{t('totalRevenue')}</div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow">
                <div className="text-2xl font-bold text-blue-600">{formatCurrency(summary.averageOrderValue)}</div>
                <div className="text-sm text-gray-500">{t('averageOrder')}</div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow">
                <div className="text-2xl font-bold text-purple-600">{summary.totalItems}</div>
                <div className="text-sm text-gray-500">{t('totalItems')}</div>
              </div>
            </div>
          )}

          {/* Order Types */}
          {summary && (
            <div className="bg-white rounded-lg p-4 shadow">
              <h3 className="font-bold mb-4">{t('orders')}</h3>
              <div className="flex gap-4">
                <div className="flex-1 text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-xl font-bold text-blue-600">{summary.ordersByType.DINE_IN}</div>
                  <div className="text-sm text-gray-500">{t('dineIn')}</div>
                </div>
                <div className="flex-1 text-center p-3 bg-orange-50 rounded-lg">
                  <div className="text-xl font-bold text-orange-600">{summary.ordersByType.TAKEAWAY}</div>
                  <div className="text-sm text-gray-500">{t('takeaway')}</div>
                </div>
                <div className="flex-1 text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-xl font-bold text-green-600">{summary.ordersByType.COUNTER}</div>
                  <div className="text-sm text-gray-500">{t('counter')}</div>
                </div>
              </div>
            </div>
          )}

          {/* Top Products Chart */}
          <div className="bg-white rounded-lg p-4 shadow">
            <h3 className="font-bold mb-4">{t('topProducts')}</h3>
            {topProducts?.products && topProducts.products.length > 0 ? (
              <div className="space-y-3">
                {topProducts.products.map((product, index) => (
                  <div key={product.menuItemId} className="flex items-center gap-3">
                    <div className="w-6 text-center font-bold text-gray-400">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="font-medium truncate">{product.name}</span>
                        <span className="text-sm text-gray-500">{product.totalQuantity} {t('quantity').toLowerCase()}</span>
                      </div>
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-500 rounded-full transition-all duration-500"
                          style={{ width: `${(product.totalQuantity / maxQuantity) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">{t('noData')}</p>
            )}
          </div>

          {/* Peak Hours Chart */}
          <div className="bg-white rounded-lg p-4 shadow">
            <h3 className="font-bold mb-4">{t('peakHours')}</h3>
            {peakHours?.hourlyData && (
              <div className="overflow-x-auto">
                <div className="flex items-end gap-1 min-w-[600px] h-40">
                  {peakHours.hourlyData
                    .filter(h => h.hour >= 8 && h.hour <= 23)
                    .map((hourData) => {
                      const isPeak = peakHours.peakHours.includes(hourData.hour)
                      const height = maxOrders > 0 ? (hourData.orderCount / maxOrders) * 100 : 0
                      return (
                        <div key={hourData.hour} className="flex-1 flex flex-col items-center">
                          <div
                            className={`w-full rounded-t transition-all duration-500 ${isPeak ? 'bg-primary-500' : 'bg-gray-300'
                              }`}
                            style={{ height: `${Math.max(height, 4)}%` }}
                            title={`${hourData.orderCount} ${t('orders').toLowerCase()}`}
                          />
                          <div className="text-xs text-gray-500 mt-1">{hourData.hour}</div>
                        </div>
                      )
                    })}
                </div>
                <div className="flex justify-center gap-4 mt-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-primary-500 rounded" />
                    <span>{t('peakHours')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-300 rounded" />
                    <span>{t('orders')}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
