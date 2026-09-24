'use client'

import { useEffect, useState } from 'react'
import { Loader2, Tablet, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import {
  getKioskDevices,
  setKioskDeviceTable,
  renameKioskDevice,
  forgetKioskDevice,
  type KioskDevice,
} from '@/lib/api'
import type { Table } from '@shared/types'

export interface KioskTabProps {
  tables: Table[]
  t: ReturnType<typeof useTranslations<'admin'>>
}

export function KioskTab({ tables, t }: KioskTabProps) {
  const [devices, setDevices] = useState<KioskDevice[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)

  const loadDevices = async () => {
    try {
      const data = await getKioskDevices()
      setDevices(data || [])
    } catch (err) {
      console.error('Failed to load kiosk devices:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDevices()
  }, [])

  const handleAssign = async (deviceId: string, tableId: string) => {
    setSavingId(deviceId)
    try {
      const updated = await setKioskDeviceTable(deviceId, tableId || null)
      setDevices((prev) => prev.map((d) => (d.deviceId === deviceId ? updated : d)))
    } catch (err) {
      console.error('Failed to assign table:', err)
      alert(t('kioskSaveError'))
    } finally {
      setSavingId(null)
    }
  }

  const handleRename = async (deviceId: string, label: string) => {
    setSavingId(deviceId)
    try {
      const updated = await renameKioskDevice(deviceId, label)
      setDevices((prev) => prev.map((d) => (d.deviceId === deviceId ? updated : d)))
    } catch (err) {
      console.error('Failed to rename device:', err)
      alert(t('kioskSaveError'))
    } finally {
      setSavingId(null)
    }
  }

  const handleForget = async (deviceId: string) => {
    if (!confirm(t('kioskConfirmForget'))) return

    setSavingId(deviceId)
    try {
      await forgetKioskDevice(deviceId)
      setDevices((prev) => prev.filter((d) => d.deviceId !== deviceId))
    } catch (err) {
      console.error('Failed to remove device:', err)
      alert(t('kioskForgetError'))
    } finally {
      setSavingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">{t('kioskManagement')}</h2>

      {devices.length === 0 ? (
        <p className="text-center text-gray-500 py-8">{t('kioskNoDevices')}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {devices.map((device) => (
            <div key={device.deviceId} className="bg-white rounded-xl p-4 shadow-sm border space-y-3">
              <div className="flex items-center gap-2">
                <Tablet className="w-5 h-5 text-gray-400 shrink-0" />
                <input
                  type="text"
                  defaultValue={device.label || ''}
                  placeholder={t('kioskDeviceLabel')}
                  onBlur={(e) => {
                    if (e.target.value !== (device.label || '')) {
                      handleRename(device.deviceId, e.target.value)
                    }
                  }}
                  className="flex-1 min-w-0 font-medium text-gray-900 border-b border-transparent hover:border-gray-200 focus:border-primary-500 outline-none"
                />
                <button
                  onClick={() => handleForget(device.deviceId)}
                  disabled={savingId === device.deviceId}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                  title={t('kioskForget')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-gray-400 font-mono">{device.deviceId.slice(0, 8)}</p>

              <div className="flex items-center gap-2">
                <select
                  value={device.tableId || ''}
                  onChange={(e) => handleAssign(device.deviceId, e.target.value)}
                  disabled={savingId === device.deviceId}
                  className="flex-1 border rounded-lg px-3 py-2 text-sm disabled:opacity-50"
                >
                  <option value="">{t('kioskUnassigned')}</option>
                  {tables.map((table) => (
                    <option key={table.id} value={table.id}>
                      {t('table')} {table.number}
                    </option>
                  ))}
                </select>
                {savingId === device.deviceId && (
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400 shrink-0" />
                )}
              </div>

              <p className="text-xs text-gray-400">
                {t('kioskUpdatedAt')}: {new Date(device.updatedAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
