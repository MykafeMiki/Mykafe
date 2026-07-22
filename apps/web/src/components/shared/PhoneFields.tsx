"use client";

import type { KeyboardEvent } from "react";
import { Phone } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  CUSTOM_PREFIX,
  EUROPE_PREFIXES,
  OTHER_PREFIXES,
  type PhoneInputState,
} from "@/lib/phone";

interface PhoneFieldsProps {
  value: PhoneInputState;
  onChange: (value: PhoneInputState) => void;
  onEnter?: (e: KeyboardEvent<HTMLInputElement>) => void;
}

/**
 * Prefisso internazionale + numero + conferma delle prime cifre.
 * Usato sia nel flusso asporto online che al banco: la validazione sta in
 * lib/phone.ts, qui c'e' solo la resa grafica.
 */
export function PhoneFields({ value, onChange, onEnter }: PhoneFieldsProps) {
  const t = useTranslations("cart");

  const set = (patch: Partial<PhoneInputState>) => onChange({ ...value, ...patch });

  const inputClass =
    "w-full px-3 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent";

  return (
    <div className="space-y-2">
      <div>
        <div className="flex gap-2">
          <select
            value={value.prefix}
            onChange={(e) => set({ prefix: e.target.value })}
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
              value={value.number}
              onChange={(e) => set({ number: e.target.value })}
              onKeyDown={onEnter}
              placeholder={t("phonePlaceholder")}
              className={`${inputClass} pl-10`}
            />
          </div>
        </div>
        {value.prefix === CUSTOM_PREFIX && (
          <input
            type="tel"
            inputMode="numeric"
            value={value.customPrefix}
            onChange={(e) => set({ customPrefix: e.target.value })}
            onKeyDown={onEnter}
            aria-label={t("phonePrefixLabel")}
            placeholder={t("phonePrefixCustomPlaceholder")}
            className={`${inputClass} mt-2 w-32`}
          />
        )}
        <p className="text-xs text-gray-500 mt-1 ml-1">{t("phoneHelper")}</p>
      </div>

      <div>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="tel"
            inputMode="numeric"
            value={value.confirm}
            onChange={(e) => set({ confirm: e.target.value })}
            onKeyDown={onEnter}
            placeholder={t("phoneConfirmPlaceholder")}
            className={`${inputClass} pl-10`}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1 ml-1">{t("phoneConfirmHelper")}</p>
      </div>
    </div>
  );
}
