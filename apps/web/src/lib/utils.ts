import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { MenuItem } from "@shared/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function getActiveLocale(): string {
  if (typeof document === "undefined") return "it-IT";
  const localeCookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith("locale="))
    ?.split("=")[1];
  return localeCookie || "it-IT";
}

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat(getActiveLocale(), {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat(getActiveLocale(), {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

// Tipi di contesto prezzo
export type PriceContext = "dine-in" | "takeaway-counter" | "takeaway-remote";

/**
 * Ottiene il prezzo appropriato per un articolo in base al contesto
 * - dine-in: prezzo base (price)
 * - takeaway-counter: priceTakeaway, fallback a price
 * - takeaway-remote: priceTakeawayRemote, fallback a priceTakeaway, fallback a price
 */
export function getItemPrice(item: MenuItem, context: PriceContext): number {
  switch (context) {
    case "dine-in":
      return item.price;
    case "takeaway-counter":
      return item.priceTakeaway ?? item.price;
    case "takeaway-remote":
      return item.priceTakeawayRemote ?? item.priceTakeaway ?? item.price;
    default:
      return item.price;
  }
}
