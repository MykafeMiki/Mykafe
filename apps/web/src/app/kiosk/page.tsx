'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { supabase } from '@/lib/api/core'
import { registerKioskDevice, type KioskDevice } from '@/lib/api'
import { MenuPageContent } from '@/components/menu/MenuPageContent'
import { useKioskLockdown } from '@/lib/useKioskLockdown'

const DEVICE_ID_STORAGE_KEY = 'mykafe_kiosk_device_id'

function getOrCreateDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_STORAGE_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(DEVICE_ID_STORAGE_KEY, id)
  }
  return id
}

// Pagina fissa da aprire in kiosk mode su un iPad. Non conosce il tavolo in
// anticipo: si registra da sola con un deviceId persistito in localStorage e
// aspetta che l'admin gli assegni un tavolo dal pannello Admin > iPad.
export default function KioskPage() {
  const t = useTranslations('kiosk')
  const tc = useTranslations('common')
  useKioskLockdown()
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const [device, setDevice] = useState<KioskDevice | null>(null)
  const [error, setError] = useState(false)

  const register = useCallback(async (id: string) => {
    try {
      const result = await registerKioskDevice(id)
      setDevice(result)
      setError(false)
    } catch (err) {
      console.error('Kiosk registration failed:', err)
      setError(true)
    }
  }, [])

  useEffect(() => {
    const id = getOrCreateDeviceId()
    setDeviceId(id)
    register(id)
  }, [register])

  // Si accorge in tempo reale quando l'admin riassegna il tavolo: rilegge
  // dalla API (serve anche il tavolo, non solo la riga KioskDevice) invece
  // di fidarsi del payload realtime.
  useEffect(() => {
    if (!deviceId) return

    const channel = supabase
      .channel(`kiosk-device-${deviceId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'KioskDevice',
          filter: `deviceId=eq.${deviceId}`,
        },
        () => register(deviceId)
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [deviceId, register])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-500 mb-4">{t('error')}</p>
          <button
            onClick={() => deviceId && register(deviceId)}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg"
          >
            {tc('retry')}
          </button>
        </div>
      </div>
    )
  }

  if (!device) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-500">{t('registering')}</div>
      </div>
    )
  }

  if (!device.table) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <h1 className="text-xl font-bold text-gray-900 mb-2">{t('waitingTitle')}</h1>
          <p className="text-gray-500 mb-6">{t('waitingBody')}</p>
          <p className="text-xs text-gray-400">
            {t('deviceId')}: <span className="font-mono">{deviceId?.slice(0, 8)}</span>
          </p>
        </div>
      </div>
    )
  }

  // key forza il remount completo del flusso menu quando il tavolo assegnato
  // cambia: azzera step, carrello e sessione invece di lasciare in giro
  // stato del tavolo precedente.
  return <MenuPageContent qrCodeOverride={device.table.qrCode} key={device.table.id} />
}
