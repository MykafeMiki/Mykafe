'use client'

import { ShoppingBag } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useCart } from '@/lib/cart'
import { formatPrice } from '@/lib/utils'
import { PaymentMethod } from '@shared/types'

interface CartButtonProps {
  onClick: () => void
  paymentMethod?: PaymentMethod | null
}

const CARD_MULTIPLIER = 1.03

// Arrotonda ai 10 centesimi per eccesso
function roundUpToTenCents(amount: number): number {
  return Math.ceil(amount / 10) * 10
}

export function CartButton({ onClick, paymentMethod }: CartButtonProps) {
  const t = useTranslations('cart')
  const itemCount = useCart((state) => state.getItemCount())
  const items = useCart((state) => state.items)
  const baseTotal = useCart((state) => state.getTotal())

  // Calcola il totale con eventuale maggiorazione carta
  const isCard = paymentMethod === PaymentMethod.CARD
  const total = isCard
    ? items.reduce((sum, item) => {
        const modifiersPrice = item.selectedModifiers.reduce((s, m) => s + m.price, 0)
        const itemTotal = (item.menuItem.price + modifiersPrice) * item.quantity
        return sum + roundUpToTenCents(Math.round(itemTotal * CARD_MULTIPLIER))
      }, 0)
    : baseTotal

  if (itemCount === 0) return null

  return (
    <button
      onClick={onClick}
      className="fixed bottom-4 left-4 right-4 z-40 bg-primary-500 text-white py-4 px-6 rounded-xl shadow-lg flex items-center justify-between hover:bg-primary-600 transition"
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <ShoppingBag className="w-6 h-6" />
          <span className="absolute -top-2 -right-2 w-5 h-5 bg-white text-primary-500 text-xs font-bold rounded-full flex items-center justify-center">
            {itemCount}
          </span>
        </div>
        <span className="font-semibold">{t('viewCart')}</span>
      </div>
      <span className="font-bold text-lg">{formatPrice(total)}</span>
    </button>
  )
}
