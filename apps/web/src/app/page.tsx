'use client'

import Link from 'next/link'
import {
  UtensilsCrossed,
  ShoppingBag,
  Truck,
  ChefHat,
  CreditCard,
  Settings,
  QrCode
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { LanguageSelectorCompact } from '@/components/LanguageSelector'

export default function HomePage() {
  const t = useTranslations('home')

  const menuItems = [
    {
      href: '/menu/tavolo1',
      icon: UtensilsCrossed,
      label: t('table'),
      description: t('tableDesc'),
      color: 'bg-blue-500 hover:bg-blue-600',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600'
    },
    {
      href: '/banco',
      icon: ShoppingBag,
      label: t('takeawayCounter'),
      description: t('takeawayCounterDesc'),
      color: 'bg-emerald-500 hover:bg-emerald-600',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600'
    },
    {
      href: '/ordina',
      icon: Truck,
      label: t('takeawayHome'),
      description: t('takeawayHomeDesc'),
      color: 'bg-orange-500 hover:bg-orange-600',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600'
    },
    {
      href: '/kitchen',
      icon: ChefHat,
      label: t('kitchen'),
      description: t('kitchenDesc'),
      color: 'bg-red-500 hover:bg-red-600',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600'
    },
    {
      href: '/cassa',
      icon: CreditCard,
      label: t('cashier'),
      description: t('cashierDesc'),
      color: 'bg-purple-500 hover:bg-purple-600',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600'
    },
    {
      href: '/admin',
      icon: Settings,
      label: t('admin'),
      description: t('adminDesc'),
      color: 'bg-gray-700 hover:bg-gray-800',
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-600'
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">MyKafe</h1>
            <p className="text-gray-500 mt-1">{t('subtitle')}</p>
          </div>
          <LanguageSelectorCompact />
        </div>
      </header>

      {/* Main Menu Grid */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden border border-gray-100"
            >
              <div className="p-6">
                <div className={`w-14 h-14 ${item.iconBg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <item.icon className={`w-7 h-7 ${item.iconColor}`} />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">
                  {item.label}
                </h2>
                <p className="text-gray-500 text-sm">
                  {item.description}
                </p>
              </div>
              <div className={`h-1.5 ${item.color} opacity-80`} />
            </Link>
          ))}
        </div>

        {/* QR Code Info */}
        <div className="mt-8 bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <QrCode className="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">{t('qrTitle')}</h3>
              <p className="text-gray-500 text-sm mt-1">
                {t('qrDescription')}
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto px-4 py-6 text-center text-gray-400 text-sm">
        MyKafe &copy; {new Date().getFullYear()}
      </footer>
    </div>
  )
}
