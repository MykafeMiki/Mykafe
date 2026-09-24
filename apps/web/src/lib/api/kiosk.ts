import { fetchApi, fetchApiAuth } from './core'
import type { Table } from '@shared/types'

export interface KioskDevice {
  deviceId: string
  label: string | null
  tableId: string | null
  createdAt: string
  updatedAt: string
  table: Table | null
}

// Self-registers this iPad (idempotent: returns the existing row if already registered)
export const registerKioskDevice = (deviceId: string, label?: string) =>
  fetchApi<KioskDevice>('/kiosk/register', {
    method: 'POST',
    body: JSON.stringify({ deviceId, label }),
  })

export const getKioskDevice = (deviceId: string) =>
  fetchApi<KioskDevice>(`/kiosk/${deviceId}`)

export const getKioskDevices = () =>
  fetchApiAuth<KioskDevice[]>('/kiosk')

export const setKioskDeviceTable = (deviceId: string, tableId: string | null) =>
  fetchApiAuth<KioskDevice>(`/kiosk/${deviceId}`, {
    method: 'PATCH',
    body: JSON.stringify({ tableId }),
  })

export const renameKioskDevice = (deviceId: string, label: string) =>
  fetchApiAuth<KioskDevice>(`/kiosk/${deviceId}`, {
    method: 'PATCH',
    body: JSON.stringify({ label }),
  })

export const forgetKioskDevice = (deviceId: string) =>
  fetchApiAuth<{ success: boolean }>(`/kiosk/${deviceId}`, {
    method: 'DELETE',
  })
