'use client'

import { useState, useRef, useEffect } from 'react'
import { Globe } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { locales, localeNames, type Locale } from '@/i18n/config'

export function LanguageSelector() {
  const t = useTranslations('language')
  const [isOpen, setIsOpen] = useState(false)
  const [currentLocale, setCurrentLocale] = useState<Locale>('it')
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Get current locale from cookie
    const cookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('locale='))
    if (cookie) {
      const locale = cookie.split('=')[1] as Locale
      if (locales.includes(locale)) {
        setCurrentLocale(locale)
      }
    }
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLocaleChange = (locale: Locale) => {
    document.cookie = `locale=${locale};path=/;max-age=31536000`
    setCurrentLocale(locale)
    setIsOpen(false)
    window.location.reload()
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition text-sm font-medium"
        aria-label={t('select')}
      >
        <Globe className="w-4 h-4" />
        <span className="hidden sm:inline">{localeNames[currentLocale]}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-lg border overflow-hidden z-50 min-w-[140px]">
          {locales.map((locale) => (
            <button
              key={locale}
              onClick={() => handleLocaleChange(locale)}
              className={`w-full px-4 py-3 text-left text-sm hover:bg-gray-50 transition flex items-center justify-between ${
                locale === currentLocale ? 'bg-primary-50 text-primary-600 font-medium' : 'text-gray-700'
              }`}
            >
              <span>{localeNames[locale]}</span>
              {locale === currentLocale && (
                <span className="w-2 h-2 bg-primary-500 rounded-full" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Compact version for headers with dark background
export function LanguageSelectorCompact({ className = '' }: { className?: string }) {
  const [currentLocale, setCurrentLocale] = useState<Locale>('it')
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const cookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('locale='))
    if (cookie) {
      const locale = cookie.split('=')[1] as Locale
      if (locales.includes(locale)) {
        setCurrentLocale(locale)
      }
    }
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLocaleChange = (locale: Locale) => {
    document.cookie = `locale=${locale};path=/;max-age=31536000`
    setCurrentLocale(locale)
    setIsOpen(false)
    window.location.reload()
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg hover:bg-white/10 transition"
        aria-label="Change language"
      >
        <Globe className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-lg border overflow-hidden z-50 min-w-[140px]">
          {locales.map((locale) => (
            <button
              key={locale}
              onClick={() => handleLocaleChange(locale)}
              className={`w-full px-4 py-3 text-left text-sm hover:bg-gray-50 transition flex items-center justify-between ${
                locale === currentLocale ? 'bg-primary-50 text-primary-600 font-medium' : 'text-gray-700'
              }`}
            >
              <span>{localeNames[locale]}</span>
              {locale === currentLocale && (
                <span className="w-2 h-2 bg-primary-500 rounded-full" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
