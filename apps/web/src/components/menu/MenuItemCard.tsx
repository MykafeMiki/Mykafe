"use client";

import { Plus } from "lucide-react";
import { useLocale } from "next-intl";
import { formatPrice, getItemPrice, type PriceContext } from "@/lib/utils";
import { getTranslatedName } from "@/lib/translations";
import { getDisplayDescription } from "@/lib/menuDescription";
import type { MenuItem } from "@shared/types";
import { applyPriceMultiplier } from "@shared/types";

interface MenuItemCardProps {
  item: MenuItem;
  onAdd: (item: MenuItem) => void;
  priceMultiplier?: number; // es: 1.03 per +3%
  priceContext?: PriceContext; // contesto prezzo: dine-in, takeaway-counter, takeaway-remote
}

export function MenuItemCard({
  item,
  onAdd,
  priceMultiplier = 1,
  priceContext = "dine-in",
}: MenuItemCardProps) {
  const locale = useLocale();
  const basePrice = getItemPrice(item, priceContext);
  const displayPrice =
    applyPriceMultiplier(basePrice, priceMultiplier);

  const translatedName = getTranslatedName(item, locale);
  const displayDescription = getDisplayDescription(item, locale);

  return (
    <button
      onClick={() => onAdd(item)}
      className="w-full text-left flex gap-3 p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:border-primary-300 active:scale-[0.98] transition-transform"
      aria-label={`Aggiungi ${translatedName}`}
    >
      {item.imageUrl && (
        <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
          <img src={item.imageUrl} alt={translatedName} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 truncate">{translatedName}</h3>
        {displayDescription && (
          <p className="text-sm text-gray-500 line-clamp-2 mt-0.5">{displayDescription}</p>
        )}
        <div className="flex items-center justify-between mt-2">
          <span className="font-bold text-primary-600">{formatPrice(displayPrice)}</span>
          <div
            className="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center flex-shrink-0"
            aria-hidden="true"
          >
            <Plus className="w-5 h-5" />
          </div>
        </div>
      </div>
    </button>
  );
}
