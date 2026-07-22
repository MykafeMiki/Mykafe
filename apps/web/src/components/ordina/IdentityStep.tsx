'use client'

import { useState, type KeyboardEvent } from 'react'
import { ShoppingBag, User, ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { LanguageSelectorCompact } from '@/components/LanguageSelector'
import { PhoneFields } from '@/components/shared/PhoneFields'
import { resolvePhone, type PhoneError, type PhoneInputState } from '@/lib/phone'

export interface IdentityStepProps {
  customerName: string
  phone: PhoneInputState
  onNameChange: (name: string) => void
  onPhoneChange: (phone: PhoneInputState) => void
  /** Riceve il numero gia' normalizzato, es. "+39 3331234567" */
  onContinue: (resolvedPhone: string) => void
}

/**
 * Primo passo dell'ordine asporto: nome e telefono.
 * Sta in testa al flusso perche' il nome identifica l'ordine (finisce sulla
 * comanda al posto del numero di tavolo) e perche' raccoglierlo prima evita
 * che il cliente compili tutto e scopra solo alla fine che serve.
 */
export function IdentityStep({
  customerName,
  phone,
  onNameChange,
  onPhoneChange,
  onContinue,
}: IdentityStepProps) {
  const t = useTranslations('ordina')
  const tc = useTranslations('cart')
  const [error, setError] = useState<string | null>(null)

  const phoneErrorMessage = (err: PhoneError): string => {
    switch (err) {
      case 'prefix':
        return tc('enterPhonePrefix')
      case 'number':
        return tc('enterPhone')
      case 'confirmMissing':
        return tc('enterPhoneConfirm')
      case 'confirmMismatch':
        return tc('phoneNoMatch')
    }
  }

  const handleContinue = () => {
    if (!customerName.trim()) {
      setError(tc('enterName'))
      return
    }

    const result = resolvePhone(phone)
    if (!result.ok) {
      setError(phoneErrorMessage(result.error))
      return
    }

    setError(null)
    onContinue(result.value)
  }

  const handleEnter = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleContinue()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-orange-500 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-6 h-6" />
            <h1 className="text-xl font-bold">MyKafe - {t('title')}</h1>
          </div>
          <LanguageSelectorCompact />
        </div>
        <p className="text-orange-100 text-sm mt-1">{t('subtitle')}</p>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
            {t('identityQuestion')}
          </h2>
          <p className="text-gray-500 text-center mb-8">{t('identityHint')}</p>

          <div className="space-y-3">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={customerName}
                onChange={(e) => onNameChange(e.target.value)}
                onKeyDown={handleEnter}
                placeholder={tc('namePlaceholder')}
                autoFocus
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <PhoneFields value={phone} onChange={onPhoneChange} onEnter={handleEnter} />

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">
                {error}
              </p>
            )}

            <button
              onClick={handleContinue}
              className="w-full flex items-center justify-center gap-2 py-4 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition"
            >
              {t('continue')}
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
