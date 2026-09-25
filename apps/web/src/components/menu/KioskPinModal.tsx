'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

// Codice noto solo al personale: e' un freno per i clienti, non una
// protezione crittografica (il controllo e' lato client).
const KIOSK_STAFF_PIN = '2010'

interface KioskPinModalProps {
  onSuccess: () => void
  onCancel: () => void
}

export function KioskPinModal({ onSuccess, onCancel }: KioskPinModalProps) {
  const t = useTranslations('kiosk')
  const [value, setValue] = useState('')
  const [wrong, setWrong] = useState(false)

  const submit = (pin: string) => {
    if (pin === KIOSK_STAFF_PIN) {
      onSuccess()
    } else {
      setWrong(true)
      setValue('')
    }
  }

  const handleChange = (raw: string) => {
    const next = raw.replace(/\D/g, '').slice(0, KIOSK_STAFF_PIN.length)
    setWrong(false)
    setValue(next)
    if (next.length === KIOSK_STAFF_PIN.length) submit(next)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-xs rounded-2xl bg-white p-6 text-center shadow-xl">
        <h2 className="text-lg font-bold text-gray-900">{t('pinTitle')}</h2>
        <p className="mt-1 mb-4 text-sm text-gray-500">{t('pinBody')}</p>
        <input
          autoFocus
          type="password"
          inputMode="numeric"
          autoComplete="off"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-center text-2xl tracking-[0.5em]"
        />
        <p className="mt-2 h-5 text-sm text-red-500">{wrong ? t('pinWrong') : ''}</p>
        <button
          onClick={onCancel}
          className="mt-2 w-full rounded-lg bg-gray-100 px-4 py-2 text-gray-700"
        >
          {t('pinCancel')}
        </button>
      </div>
    </div>
  )
}
