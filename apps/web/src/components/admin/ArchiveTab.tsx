'use client'

import { useState, useEffect } from 'react'
import { Archive, ArrowLeft, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { getOrderArchives, getOrderArchive } from '@/lib/api'
import type { OrderArchiveSummary, OrderArchiveDetail } from '@/lib/api'

export interface ArchiveTabProps {
  t: ReturnType<typeof useTranslations<'admin'>>
}

const formatCurrency = (cents: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(cents / 100)

const formatDateTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' }) : '—'

export function ArchiveTab({ t }: ArchiveTabProps) {
  const [archives, setArchives] = useState<OrderArchiveSummary[]>([])
  const [detail, setDetail] = useState<OrderArchiveDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getOrderArchives()
      .then(setArchives)
      .catch((err) => console.error('Failed to load archives:', err))
      .finally(() => setLoading(false))
  }, [])

  const openArchive = async (id: string) => {
    setLoading(true)
    try {
      setDetail(await getOrderArchive(id))
    } catch (err) {
      console.error('Failed to load archive:', err)
    }
    setLoading(false)
  }

  const reasonLabel = (reason: OrderArchiveSummary['reason']) =>
    reason === 'MANUAL_RESET' ? t('archiveManual') : t('archiveAuto')

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (detail) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setDetail(null)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('archiveBack')}
        </button>

        <div className="bg-white rounded-lg p-4 shadow">
          <div className="font-bold">
            {formatDateTime(detail.archivedAt)} · {reasonLabel(detail.reason)}
          </div>
          <div className="grid grid-cols-3 gap-4 mt-3 text-center">
            <div>
              <div className="text-xl font-bold text-green-600">{formatCurrency(detail.totalCash)}</div>
              <div className="text-sm text-gray-500">{t('archiveCash')}</div>
            </div>
            <div>
              <div className="text-xl font-bold text-blue-600">{formatCurrency(detail.totalCard)}</div>
              <div className="text-sm text-gray-500">{t('archiveCard')}</div>
            </div>
            <div>
              <div className="text-xl font-bold text-orange-600">{formatCurrency(detail.totalUnpaid)}</div>
              <div className="text-sm text-gray-500">{t('archiveUnpaid')}</div>
            </div>
          </div>
        </div>

        {detail.orders.map((order) => (
          <div key={order.id} className="bg-white rounded-lg p-4 shadow">
            <div className="flex items-center justify-between">
              <div className="font-medium">
                {order.table && !order.table.isCounter
                  ? `${t('archiveTable')} ${order.table.number}`
                  : t('archiveTakeaway')}
                {order.customerName ? ` · ${order.customerName}` : ''}
              </div>
              <div className="font-bold">{formatCurrency(order.totalAmount)}</div>
            </div>
            <div className="text-sm text-gray-500">
              {formatDateTime(order.createdAt)} ·{' '}
              {order.status === 'CANCELLED'
                ? t('archiveCancelled')
                : order.isPaid
                  ? `${t('archivePaid')} (${order.paymentMethod === 'CARD' ? t('archiveCard') : t('archiveCash')})`
                  : t('archiveUnpaid')}
            </div>
            <ul className="mt-2 text-sm text-gray-700">
              {order.items.map((item) => (
                <li key={item.id}>
                  {item.quantity}× {item.menuItem?.name ?? '?'}
                  {item.modifiers?.length
                    ? ` (${item.modifiers.map((m) => m.modifier?.name).filter(Boolean).join(', ')})`
                    : ''}
                  {item.notes ? ` — ${item.notes}` : ''}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <Archive className="w-6 h-6" />
        {t('archiveTitle')}
      </h2>
      <p className="text-sm text-gray-500">{t('archiveNote')}</p>

      {archives.length === 0 ? (
        <div className="text-center text-gray-500 py-12">{t('archiveEmpty')}</div>
      ) : (
        archives.map((a) => (
          <button
            key={a.id}
            onClick={() => openArchive(a.id)}
            className="w-full text-left bg-white rounded-lg p-4 shadow hover:bg-gray-50 transition"
          >
            <div className="flex items-center justify-between">
              <div className="font-medium">{formatDateTime(a.archivedAt)}</div>
              <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                {reasonLabel(a.reason)}
              </span>
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {a.orderCount} {t('archiveOrders')} · {t('archiveCash')} {formatCurrency(a.totalCash)} ·{' '}
              {t('archiveCard')} {formatCurrency(a.totalCard)}
              {a.totalUnpaid > 0 ? ` · ${t('archiveUnpaid')} ${formatCurrency(a.totalUnpaid)}` : ''}
            </div>
          </button>
        ))
      )}
    </div>
  )
}
