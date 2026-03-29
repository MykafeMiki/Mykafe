'use client'

import { useState } from 'react'
import { Plus, Users, RefreshCw, Loader2, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { getTableCustomers, resetTable, type TableCustomer } from '@/lib/api'
import type { Table } from '@shared/types'

export interface TablesTabProps {
  tables: Table[]
  t: ReturnType<typeof useTranslations<'admin'>>
  onUpdate: () => void
}

export function TablesTab({ tables, t, onUpdate }: TablesTabProps) {
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [customers, setCustomers] = useState<TableCustomer[]>([])
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [resetting, setResetting] = useState<string | null>(null)

  const statusColors: Record<string, string> = {
    AVAILABLE: 'bg-green-100 text-green-700',
    OCCUPIED: 'bg-red-100 text-red-700',
    RESERVED: 'bg-yellow-100 text-yellow-700',
  }

  const statusLabels: Record<string, string> = {
    AVAILABLE: t('free'),
    OCCUPIED: t('occupied'),
    RESERVED: t('reserved'),
  }

  const handleViewCustomers = async (table: Table) => {
    setSelectedTable(table)
    setLoadingCustomers(true)
    try {
      const data = await getTableCustomers(table.id)
      setCustomers(data || [])
    } catch (err) {
      console.error('Failed to load customers:', err)
      setCustomers([])
    } finally {
      setLoadingCustomers(false)
    }
  }

  const handleResetTable = async (tableId: string) => {
    if (!confirm(t('confirmResetTable'))) return

    setResetting(tableId)
    try {
      await resetTable(tableId)
      onUpdate()
      if (selectedTable?.id === tableId) {
        setSelectedTable(null)
        setCustomers([])
      }
    } catch (err) {
      console.error('Failed to reset table:', err)
      alert(t('resetTableError'))
    } finally {
      setResetting(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">{t('tablesManagement')}</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition">
          <Plus className="w-5 h-5" />
          {t('addTable')}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {tables.map((table) => (
          <div
            key={table.id}
            className="bg-white rounded-xl p-4 shadow-sm border text-center relative"
          >
            <div className="text-3xl font-bold text-gray-900 mb-2">
              {table.number}
            </div>
            <div className="text-sm text-gray-500 mb-3">
              {table.seats} {t('seats')}
            </div>
            <span
              className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusColors[table.status]
                }`}
            >
              {statusLabels[table.status]}
            </span>

            {/* Action buttons */}
            <div className="mt-3 flex gap-2 justify-center">
              <button
                onClick={() => handleViewCustomers(table)}
                className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition"
                title={t('viewCustomers')}
              >
                <Users className="w-4 h-4" />
              </button>
              {table.status === 'OCCUPIED' && (
                <button
                  onClick={() => handleResetTable(table.id)}
                  disabled={resetting === table.id}
                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                  title={t('resetTable')}
                >
                  {resetting === table.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Customers Modal */}
      {selectedTable && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-bold text-lg">
                {t('table')} {selectedTable.number} - {t('customers')}
              </h3>
              <button
                onClick={() => setSelectedTable(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {loadingCustomers ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : customers.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  {t('noCustomers')}
                </p>
              ) : (
                <div className="space-y-2">
                  {customers.map((customer) => (
                    <div
                      key={customer.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                        <Users className="w-4 h-4 text-primary-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{customer.name}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(customer.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {customer.isHost && (
                        <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-full">
                          Host
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {customers.length > 0 && (
              <div className="p-4 border-t">
                <button
                  onClick={() => handleResetTable(selectedTable.id)}
                  disabled={resetting === selectedTable.id}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50"
                >
                  {resetting === selectedTable.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  {t('resetTable')} ({customers.length} {t('customers')})
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
