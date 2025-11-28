'use client'

import { Clock, ChefHat, Check, X, UtensilsCrossed, ShoppingBag, Phone, User, Banknote, CreditCard } from 'lucide-react'
import { formatTime, cn } from '@/lib/utils'
import type { Order, OrderStatus } from '@shared/types'
import { ConsumeMode, OrderType, PaymentMethod } from '@shared/types'

interface OrderCardProps {
  order: Order
  onStatusChange: (orderId: string, status: OrderStatus) => void
}

const statusConfig = {
  PENDING: {
    label: 'In attesa',
    color: 'bg-yellow-100 border-yellow-400',
    icon: Clock,
  },
  PREPARING: {
    label: 'In preparazione',
    color: 'bg-blue-100 border-blue-400',
    icon: ChefHat,
  },
  READY: {
    label: 'Pronto',
    color: 'bg-green-100 border-green-400',
    icon: Check,
  },
  SERVED: {
    label: 'Servito',
    color: 'bg-gray-100 border-gray-400',
    icon: Check,
  },
  CANCELLED: {
    label: 'Annullato',
    color: 'bg-red-100 border-red-400',
    icon: X,
  },
}

export function OrderCard({ order, onStatusChange }: OrderCardProps) {
  const config = statusConfig[order.status]
  const StatusIcon = config.icon
  const isTakeaway = order.orderType === OrderType.TAKEAWAY

  const nextStatus: Record<string, OrderStatus | null> = {
    PENDING: 'PREPARING',
    PREPARING: 'READY',
    READY: 'SERVED',
    SERVED: null,
    CANCELLED: null,
  }

  const nextStatusLabel: Record<string, string> = {
    PENDING: 'Inizia preparazione',
    PREPARING: 'Segna come pronto',
    READY: isTakeaway ? 'Ritirato' : 'Segna come servito',
  }

  const handleNextStatus = () => {
    const next = nextStatus[order.status]
    if (next) {
      onStatusChange(order.id, next)
    }
  }

  return (
    <div
      className={cn(
        'rounded-xl border-2 overflow-hidden transition-all',
        isTakeaway ? 'border-orange-400' : config.color,
        isTakeaway && 'ring-2 ring-orange-200'
      )}
    >
      {/* Takeaway Banner */}
      {isTakeaway && (
        <div className="bg-orange-500 text-white px-4 py-2 flex items-center gap-2">
          <ShoppingBag className="w-4 h-4" />
          <span className="font-semibold text-sm">TAKE AWAY</span>
          {order.paymentMethod && (
            <span className="ml-auto flex items-center gap-1 text-xs bg-orange-600 px-2 py-0.5 rounded">
              {order.paymentMethod === PaymentMethod.CASH ? (
                <><Banknote className="w-3 h-3" /> In cassa</>
              ) : (
                <><CreditCard className="w-3 h-3" /> Carta</>
              )}
            </span>
          )}
        </div>
      )}

      {/* Header */}
      <div className={cn(
        "flex items-center justify-between p-4",
        isTakeaway ? 'bg-orange-50' : 'bg-white/50'
      )}>
        <div className="flex items-center gap-3">
          {isTakeaway ? (
            <div className="flex flex-col">
              {order.customerName && (
                <span className="text-lg font-bold flex items-center gap-1">
                  <User className="w-4 h-4" />
                  {order.customerName}
                </span>
              )}
              {order.customerPhone && (
                <span className="text-sm text-gray-600 flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {order.customerPhone}
                </span>
              )}
            </div>
          ) : (
            <span className="text-2xl font-bold">
              #{order.table?.number || '?'}
            </span>
          )}
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <StatusIcon className="w-4 h-4" />
            <span>{config.label}</span>
          </div>
        </div>
        <span className="text-sm text-gray-500">
          {formatTime(new Date(order.createdAt))}
        </span>
      </div>

      {/* Items */}
      <div className="p-4 bg-white space-y-3">
        {order.items.map((item) => (
          <div key={item.id} className="flex gap-3">
            <span className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-700">
              {item.quantity}
            </span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-900">
                  {item.menuItem?.name}
                </p>
                {item.consumeMode === ConsumeMode.TAKEAWAY && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                    <ShoppingBag className="w-3 h-3" />
                    Asporto
                  </span>
                )}
              </div>
              {item.modifiers && item.modifiers.length > 0 && (
                <p className="text-sm text-gray-500">
                  {item.modifiers.map((m) => m.modifier?.name).join(', ')}
                </p>
              )}
              {item.notes && (
                <p className="text-sm text-orange-600 italic">
                  "{item.notes}"
                </p>
              )}
            </div>
          </div>
        ))}

        {order.notes && (
          <div className="pt-3 border-t">
            <p className="text-sm text-gray-500">
              <span className="font-medium">Note:</span> {order.notes}
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      {nextStatus[order.status] && (
        <div className="p-4 bg-white border-t">
          <button
            onClick={handleNextStatus}
            className={cn(
              'w-full py-3 rounded-lg font-semibold transition',
              order.status === 'PENDING'
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : order.status === 'PREPARING'
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-gray-500 text-white hover:bg-gray-600'
            )}
          >
            {nextStatusLabel[order.status]}
          </button>
        </div>
      )}
    </div>
  )
}
