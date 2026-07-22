"use client";

import { useState } from "react";
import { X, Minus, Plus, Trash2, Loader2, User, Phone, Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCart } from "@/lib/cart";
import { formatPrice, getItemPrice as getContextPrice } from "@/lib/utils";
import { createOrder } from "@/lib/api";
import { PaymentMethod, OrderType, ConsumeMode, applyCardSurcharge } from "@shared/types";

interface TakeawayCartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderSuccess: () => void;
  paymentMethod: PaymentMethod;
  /** Raccolti nel primo passo del flusso, non piu' qui dentro */
  customerName: string;
  /** Gia' normalizzato, es. "+39 3331234567" */
  customerPhone: string;
  /** Formato ISO "YYYY-MM-DD", scelto nel passo data/ora */
  scheduledDate: string;
  /** Formato "HH:MM", scelto nel passo data/ora */
  scheduledTime: string;
}

// Calcola il prezzo di un item con eventuale maggiorazione carta
function calculateItemPrice(
  basePrice: number,
  modifiersPrice: number,
  quantity: number,
  isCard: boolean
): number {
  const itemTotal = (basePrice + modifiersPrice) * quantity;
  return applyCardSurcharge(itemTotal, isCard);
}

/**
 * Carrello asporto: solo riepilogo e conferma.
 *
 * Nome, telefono, data e ora arrivano dai passi precedenti del flusso. Prima
 * venivano richiesti una seconda volta qui dentro, con uno stato separato che
 * sovrascriveva quello gia' scelto dal cliente.
 */
export function TakeawayCartDrawer({
  isOpen,
  onClose,
  onOrderSuccess,
  paymentMethod,
  customerName,
  customerPhone,
  scheduledDate,
  scheduledTime,
}: TakeawayCartDrawerProps) {
  const t = useTranslations("cart");
  const { items, tableId, priceContext, updateQuantity, removeItem, clearCart } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCard = paymentMethod === PaymentMethod.CARD;

  // Calcola il totale con i prezzi già maggiorati per carta
  const total = items.reduce((sum, item) => {
    const basePrice = getContextPrice(item.menuItem, priceContext);
    const modifiersPrice = item.selectedModifiers.reduce((s, m) => s + m.price, 0);
    return sum + calculateItemPrice(basePrice, modifiersPrice, item.quantity, isCard);
  }, 0);

  const handleSubmitOrder = async () => {
    if (!tableId || items.length === 0) return;

    // I dati sono gia' stati validati nei passi precedenti: qui si controlla
    // solo che siano arrivati, per non inviare un ordine monco se il flusso
    // venisse raggiunto in uno stato imprevisto.
    if (!customerName.trim() || !customerPhone.trim()) {
      setError(t("enterName"));
      return;
    }

    if (!scheduledDate || !scheduledTime) {
      setError(t("enterDateTime"));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await createOrder({
        tableId,
        items: items.map((item) => ({
          menuItemId: item.menuItem.id,
          quantity: item.quantity,
          notes: item.notes,
          modifierIds: item.selectedModifiers.map((m) => m.id),
          consumeMode: ConsumeMode.TAKEAWAY,
        })),
        orderType: OrderType.TAKEAWAY,
        paymentMethod,
        customerName: customerName.trim(),
        customerPhone,
        notes: t("pickupNote", { date: scheduledDate, time: scheduledTime }),
      });

      clearCart();
      onOrderSuccess();
      onClose();
    } catch (err) {
      setError(t("orderError"));
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative w-full max-w-lg max-h-[90vh] bg-white rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-orange-50">
          <h2 className="text-lg font-bold text-gray-900">{t("takeawayOrder")}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <p className="text-center text-gray-500 py-8">{t("empty")}</p>
          ) : (
            <div className="space-y-6">
              {/* Cart Items */}
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={index} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900">{item.menuItem.name}</h3>
                      {item.selectedModifiers.length > 0 && (
                        <p className="text-sm text-gray-500">
                          {item.selectedModifiers.map((m) => m.name).join(", ")}
                        </p>
                      )}
                      {item.notes && (
                        <p className="text-sm text-gray-400 italic">&quot;{item.notes}&quot;</p>
                      )}
                      <p className="font-semibold text-primary-600 mt-1">
                        {formatPrice(
                          calculateItemPrice(
                            getContextPrice(item.menuItem, priceContext),
                            item.selectedModifiers.reduce((s, m) => s + m.price, 0),
                            item.quantity,
                            isCard
                          )
                        )}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <button
                        onClick={() => removeItem(index)}
                        className="p-1 text-gray-400 hover:text-red-500 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="flex items-center gap-2 bg-white border rounded">
                        <button
                          onClick={() => updateQuantity(index, item.quantity - 1)}
                          className="p-2 hover:bg-gray-100 transition"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-6 text-center font-semibold">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(index, item.quantity + 1)}
                          className="p-2 hover:bg-gray-100 transition"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Riepilogo dei dati raccolti nei passi precedenti */}
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-900">{t("yourData")}</h3>
                <div className="rounded-lg bg-gray-50 p-3 space-y-2 text-sm text-gray-700">
                  <p className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="font-medium">{customerName}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                    <span>{customerPhone}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                    <span>
                      {scheduledDate} — {scheduledTime}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-4 border-t bg-gray-50">
            {error && <p className="text-red-500 text-sm mb-3 text-center">{error}</p>}

            <div className="flex items-center justify-between text-lg font-bold mb-4">
              <span>{t("total")}</span>
              <span>{formatPrice(total)}</span>
            </div>

            <button
              onClick={handleSubmitOrder}
              disabled={isSubmitting}
              className="w-full py-4 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t("sending")}
                </>
              ) : (
                `${t("orderButton")} - ${formatPrice(total)}`
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
