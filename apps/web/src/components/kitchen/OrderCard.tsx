"use client";

import {
  Clock,
  ChefHat,
  Check,
  X,
  ShoppingBag,
  Phone,
  User,
  Banknote,
  CreditCard,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { formatTime, cn } from "@/lib/utils";
import type { Order } from "@shared/types";
import { ConsumeMode, OrderType, PaymentMethod, OrderStatus } from "@shared/types";
import { TranslatedNote } from "./TranslatedNote";

interface OrderCardProps {
  order: Order;
  onStatusChange: (orderId: string, status: OrderStatus) => void;
}

export function OrderCard({ order, onStatusChange }: OrderCardProps) {
  const t = useTranslations("kitchen");
  const isTakeaway = order.orderType === OrderType.TAKEAWAY;

  const statusConfig = {
    PENDING: {
      label: t("pending"),
      color: "bg-yellow-100 border-yellow-400",
      icon: Clock,
    },
    PREPARING: {
      label: t("preparing"),
      color: "bg-blue-100 border-blue-400",
      icon: ChefHat,
    },
    READY: {
      label: t("ready"),
      color: "bg-green-100 border-green-400",
      icon: Check,
    },
    SERVED: {
      label: t("served"),
      color: "bg-gray-100 border-gray-400",
      icon: Check,
    },
    CANCELLED: {
      label: t("cancelled"),
      color: "bg-red-100 border-red-400",
      icon: X,
    },
  };

  const config = statusConfig[order.status];
  const StatusIcon = config.icon;

  const nextStatus: Record<string, OrderStatus | null> = {
    PENDING: OrderStatus.PREPARING,
    PREPARING: OrderStatus.READY,
    READY: OrderStatus.SERVED,
    SERVED: null,
    CANCELLED: null,
  };

  const nextStatusLabel: Record<string, string> = {
    PENDING: t("startPreparing"),
    PREPARING: t("markReady"),
    READY: isTakeaway ? t("pickedUp") : t("markServed"),
  };

  const handleNextStatus = () => {
    const next = nextStatus[order.status];
    if (next) {
      onStatusChange(order.id, next);
    }
  };

  return (
    <div
      className={cn(
        "rounded-xl border-2 overflow-hidden transition-all",
        isTakeaway ? "border-orange-400" : config.color,
        isTakeaway && "ring-2 ring-orange-200"
      )}
    >
      {isTakeaway && (
        <div className="bg-orange-500 text-white px-4 py-2 flex items-center gap-2">
          <ShoppingBag className="w-4 h-4" />
          <span className="font-semibold text-sm">{t("takeawayOrder").toUpperCase()}</span>
          {order.paymentMethod && (
            <span className="ml-auto flex items-center gap-1 text-xs bg-orange-600 px-2 py-0.5 rounded">
              {order.paymentMethod === PaymentMethod.CASH ? (
                <>
                  <Banknote className="w-3 h-3" /> {t("cashAtCounter")}
                </>
              ) : (
                <>
                  <CreditCard className="w-3 h-3" /> {t("cardPayment")}
                </>
              )}
            </span>
          )}
        </div>
      )}

      <div
        className={cn(
          "flex items-center justify-between p-4",
          isTakeaway ? "bg-orange-50" : "bg-white/50"
        )}
      >
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
            <div className="flex flex-col">
              <span className="text-2xl font-bold">#{order.table?.number || "?"}</span>
              {order.customerName && (
                <span className="text-sm text-gray-600 flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {order.customerName}
                </span>
              )}
            </div>
          )}
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <StatusIcon className="w-4 h-4" />
            <span>{config.label}</span>
          </div>
        </div>
        <span className="text-sm text-gray-500">{formatTime(new Date(order.createdAt))}</span>
      </div>

      <div className="p-4 bg-white space-y-3">
        {order.items.map((item) => (
          <div key={item.id} className="flex gap-3">
            <span className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-700">
              {item.quantity}
            </span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-900">{item.menuItem?.name}</p>
                {item.consumeMode === ConsumeMode.TAKEAWAY && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                    <ShoppingBag className="w-3 h-3" />
                    {t("takeaway")}
                  </span>
                )}
              </div>
              {item.modifiers && item.modifiers.length > 0 && (
                <p className="text-sm text-gray-500">
                  {item.modifiers.map((m) => m.modifier?.name).join(", ")}
                </p>
              )}
              {item.notes && <TranslatedNote note={item.notes} />}
            </div>
          </div>
        ))}

        {order.notes && (
          <div className="pt-3 border-t">
            <div className="text-sm text-gray-500">
              <span className="font-medium">{t("orderNotes")}:</span>
              <TranslatedNote note={order.notes} className="mt-1" />
            </div>
          </div>
        )}
      </div>

      {nextStatus[order.status] && (
        <div className="p-4 bg-white border-t">
          <button
            onClick={handleNextStatus}
            className={cn(
              "w-full py-3 rounded-lg font-semibold transition",
              order.status === "PENDING"
                ? "bg-blue-500 text-white hover:bg-blue-600"
                : order.status === "PREPARING"
                  ? "bg-green-500 text-white hover:bg-green-600"
                  : "bg-gray-500 text-white hover:bg-gray-600"
            )}
          >
            {nextStatusLabel[order.status]}
          </button>
        </div>
      )}
    </div>
  );
}
