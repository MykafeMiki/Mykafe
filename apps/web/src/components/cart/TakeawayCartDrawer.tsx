"use client";

import { useState, type KeyboardEvent } from "react";
import { X, Minus, Plus, Trash2, Loader2, User, Phone } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCart } from "@/lib/cart";
import { formatPrice, getItemPrice as getContextPrice } from "@/lib/utils";
import { createOrder } from "@/lib/api";
import { PaymentMethod, OrderType, ConsumeMode, applyCardSurcharge } from "@shared/types";
import {
  getTimerConfig,
  getAvailableDates as getDates,
  getAvailableTimeSlots,
} from "@/lib/menuTimers";

interface TakeawayCartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderSuccess: () => void;
  paymentMethod: PaymentMethod;
}

// Prefissi internazionali selezionabili nel form asporto.
// Sigle ISO invece dei nomi dei paesi: l'app e' multilingua e i nomi tradotti
// andrebbero mantenuti in cinque file, mentre "PL +48" si legge uguale ovunque.
// Italia in cima perche' e' il caso normale, poi ordine alfabetico di sigla.
const EUROPE_PREFIXES = [
  { code: "+39", label: "IT +39" },
  { code: "+376", label: "AD +376" },
  { code: "+355", label: "AL +355" },
  { code: "+43", label: "AT +43" },
  { code: "+32", label: "BE +32" },
  { code: "+359", label: "BG +359" },
  { code: "+387", label: "BA +387" },
  { code: "+375", label: "BY +375" },
  { code: "+41", label: "CH +41" },
  { code: "+357", label: "CY +357" },
  { code: "+420", label: "CZ +420" },
  { code: "+49", label: "DE +49" },
  { code: "+45", label: "DK +45" },
  { code: "+372", label: "EE +372" },
  { code: "+34", label: "ES +34" },
  { code: "+358", label: "FI +358" },
  { code: "+33", label: "FR +33" },
  { code: "+44", label: "GB +44" },
  { code: "+30", label: "GR +30" },
  { code: "+385", label: "HR +385" },
  { code: "+36", label: "HU +36" },
  { code: "+353", label: "IE +353" },
  { code: "+354", label: "IS +354" },
  { code: "+423", label: "LI +423" },
  { code: "+370", label: "LT +370" },
  { code: "+352", label: "LU +352" },
  { code: "+371", label: "LV +371" },
  { code: "+377", label: "MC +377" },
  { code: "+373", label: "MD +373" },
  { code: "+382", label: "ME +382" },
  { code: "+389", label: "MK +389" },
  { code: "+356", label: "MT +356" },
  { code: "+31", label: "NL +31" },
  { code: "+47", label: "NO +47" },
  { code: "+48", label: "PL +48" },
  { code: "+351", label: "PT +351" },
  { code: "+40", label: "RO +40" },
  { code: "+381", label: "RS +381" },
  { code: "+7", label: "RU +7" },
  { code: "+46", label: "SE +46" },
  { code: "+386", label: "SI +386" },
  { code: "+421", label: "SK +421" },
  { code: "+378", label: "SM +378" },
  { code: "+90", label: "TR +90" },
  { code: "+380", label: "UA +380" },
  { code: "+383", label: "XK +383" },
];

// Paesi extra-europei gia' presenti prima: tenuti per non perdere clienti abituali
const OTHER_PREFIXES = [
  { code: "+1", label: "US/CA +1" },
  { code: "+20", label: "EG +20" },
  { code: "+86", label: "CN +86" },
  { code: "+212", label: "MA +212" },
  { code: "+972", label: "IL +972" },
];

// Valore sentinella della voce "Altro": non e' un prefisso, attiva il campo libero
const CUSTOM_PREFIX = "custom";

// Normalizza un prefisso digitato a mano: via tutto tranne le cifre, poi "+".
// I prefissi internazionali esistenti vanno da 1 a 4 cifre (es. +1, +39, +1876).
function normalizeCustomPrefix(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 1 || digits.length > 4) return null;
  return `+${digits}`;
}

// Prefisso preselezionato in base alla lingua scelta dal cliente
const PREFIX_BY_LOCALE: Record<string, string> = {
  it: "+39",
  en: "+44",
  fr: "+33",
  es: "+34",
  he: "+972",
};

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

export function TakeawayCartDrawer({
  isOpen,
  onClose,
  onOrderSuccess,
  paymentMethod,
}: TakeawayCartDrawerProps) {
  const t = useTranslations("cart");
  const locale = useLocale();
  const { items, tableId, priceContext, updateQuantity, removeItem, clearCart } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [phonePrefix, setPhonePrefix] = useState(PREFIX_BY_LOCALE[locale] ?? "+39");
  const [customPrefix, setCustomPrefix] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [phoneConfirm, setPhoneConfirm] = useState("");

  const isCard = paymentMethod === PaymentMethod.CARD;

  // Calcola il totale con i prezzi già maggiorati per carta
  const total = items.reduce((sum, item) => {
    const basePrice = getContextPrice(item.menuItem, priceContext);
    const modifiersPrice = item.selectedModifiers.reduce((s, m) => s + m.price, 0);
    return sum + calculateItemPrice(basePrice, modifiersPrice, item.quantity, isCard);
  }, 0);

  // Date and Time state
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");

  // Calcola le date disponibili (oggi e domani) usando la config
  const getAvailableDates = () => {
    const dates = getDates(2); // Get next 2 available days
    return dates.map((date) => {
      const today = new Date();
      const isToday = date.toDateString() === today.toDateString();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const isTomorrow = date.toDateString() === tomorrow.toDateString();

      let label = date.toLocaleDateString(locale);
      if (isToday) label = t("today");
      if (isTomorrow) label = t("tomorrow");

      return {
        value: date.toISOString().split("T")[0],
        label: label,
      };
    });
  };

  // Generate time slots based on config
  const getTimeSlots = () => {
    if (!scheduledDate) return [];

    const config = getTimerConfig().takeaway;
    const date = new Date(scheduledDate);

    return getAvailableTimeSlots(date, config.openingHour, config.closingHour);
  };

  const handleSubmitOrder = async () => {
    if (!tableId || items.length === 0) return;

    if (!customerName.trim()) {
      setError(t("enterName"));
      return;
    }

    if (!customerPhone.trim()) {
      setError(t("enterPhone"));
      return;
    }

    // Con "Altro" il prefisso arriva dal campo libero e va validato
    const effectivePrefix =
      phonePrefix === CUSTOM_PREFIX ? normalizeCustomPrefix(customPrefix) : phonePrefix;

    if (!effectivePrefix) {
      setError(t("enterPhonePrefix"));
      return;
    }

    // La conferma si verifica sulla sola parte locale del numero: il prefisso
    // internazionale arriva dal menu a tendina, il cliente non lo ridigita.
    const typedPhone = customerPhone.trim();
    let cleanPhone = typedPhone.replace(/\D/g, "");

    // Se il cliente ha riscritto il prefisso nel campo numero, va tolto per non
    // duplicarlo. Ci si fida solo del "+" esplicito: un cellulare italiano puo'
    // iniziare per 39 (es. 3931234567) e toglierlo alla cieca lo mutilerebbe.
    const prefixDigits = effectivePrefix.replace(/\D/g, "");
    if (typedPhone.startsWith("+") && cleanPhone.startsWith(prefixDigits)) {
      cleanPhone = cleanPhone.slice(prefixDigits.length);
    }

    // Zero iniziale scritto per abitudine (es. 0333...): non fa parte del numero
    cleanPhone = cleanPhone.replace(/^0+/, "");

    const cleanConfirm = phoneConfirm.replace(/\D/g, "");

    if (!cleanPhone) {
      setError(t("enterPhone"));
      return;
    }

    if (!cleanConfirm || cleanConfirm.length < 3) {
      setError(t("enterPhoneConfirm"));
      return;
    }

    if (!cleanPhone.startsWith(cleanConfirm)) {
      setError(t("phoneNoMatch"));
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
        customerPhone: `${effectivePrefix} ${cleanPhone}`,
        notes: t("pickupNote", { date: scheduledDate, time: scheduledTime }), // Store in notes for now if backend doesn't support it directly
      });

      clearCart();
      setCustomerName("");
      setCustomerPhone("");
      setPhoneConfirm("");
      setPhonePrefix(PREFIX_BY_LOCALE[locale] ?? "+39");
      setCustomPrefix("");
      setScheduledDate("");
      setScheduledTime("");
      onOrderSuccess();
      onClose();
    } catch (err) {
      setError(t("orderError"));
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEnterSubmit = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isSubmitting) {
      e.preventDefault();
      handleSubmitOrder();
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

              {/* Customer Info */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">{t("yourData")}</h3>
                <div className="space-y-2">
                  <div className="space-y-2">
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        onKeyDown={handleEnterSubmit}
                        placeholder={t("namePlaceholder")}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <div className="flex gap-2">
                        <select
                          value={phonePrefix}
                          onChange={(e) => setPhonePrefix(e.target.value)}
                          aria-label={t("phonePrefixLabel")}
                          className="shrink-0 px-3 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                        >
                          <optgroup label={t("phonePrefixGroupEurope")}>
                            {EUROPE_PREFIXES.map((p) => (
                              <option key={p.code} value={p.code}>
                                {p.label}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label={t("phonePrefixGroupOther")}>
                            {OTHER_PREFIXES.map((p) => (
                              <option key={p.code} value={p.code}>
                                {p.label}
                              </option>
                            ))}
                            <option value={CUSTOM_PREFIX}>{t("phonePrefixOther")}</option>
                          </optgroup>
                        </select>
                        <div className="relative flex-1">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            type="tel"
                            inputMode="numeric"
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            onKeyDown={handleEnterSubmit}
                            placeholder={t("phonePlaceholder")}
                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                      {phonePrefix === CUSTOM_PREFIX && (
                        <input
                          type="tel"
                          inputMode="numeric"
                          value={customPrefix}
                          onChange={(e) => setCustomPrefix(e.target.value)}
                          onKeyDown={handleEnterSubmit}
                          aria-label={t("phonePrefixLabel")}
                          placeholder={t("phonePrefixCustomPlaceholder")}
                          className="mt-2 w-32 px-3 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                      )}
                      <p className="text-xs text-gray-500 mt-1 ml-1">{t("phoneHelper")}</p>
                    </div>
                    <div>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="tel"
                          value={phoneConfirm}
                          onChange={(e) => setPhoneConfirm(e.target.value)}
                          onKeyDown={handleEnterSubmit}
                          placeholder={t("phoneConfirmPlaceholder")}
                          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1 ml-1">{t("phoneConfirmHelper")}</p>
                    </div>

                    {/* Date and Time Picker */}
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          {t("date")}
                        </label>
                        <select
                          value={scheduledDate}
                          onChange={(e) => setScheduledDate(e.target.value)}
                          className="w-full px-3 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                        >
                          <option value="">{t("selectDate")}</option>
                          {getAvailableDates().map((date) => (
                            <option key={date.value} value={date.value}>
                              {date.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          {t("time")}
                        </label>
                        <select
                          value={scheduledTime}
                          onChange={(e) => setScheduledTime(e.target.value)}
                          className="w-full px-3 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                        >
                          <option value="">{t("selectTime")}</option>
                          {getTimeSlots().map((time) => (
                            <option key={time} value={time}>
                              {time}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
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
