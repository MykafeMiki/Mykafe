/**
 * Pricing utilities per Supabase Edge Functions (Deno).
 * Fonte unica di verità condivisa tra orders, party e qualsiasi altra
 * edge function che calcoli prezzi o sovrapprezzi.
 *
 * Logica identica a packages/shared/src/pricing.ts – tenerle in sync.
 */

/** Sovrapprezzo carta: +3% */
export const CARD_MULTIPLIER = 1.03

/**
 * Arrotonda un importo (in centesimi) ai 10 centesimi superiori.
 * Es: 153 → 160, 150 → 150, 101 → 110
 */
export function roundUpToTenCents(amountCents: number): number {
  return Math.ceil(amountCents / 10) * 10
}

/**
 * Calcola il prezzo di un singolo articolo con eventuale sovrapprezzo carta.
 * @param basePriceCents  Prezzo base in centesimi (già moltiplicato per quantità)
 * @param isCardPayment   true se il pagamento è con carta
 * @returns Prezzo finale in centesimi
 */
export function applyCardSurcharge(basePriceCents: number, isCardPayment: boolean): number {
  if (!isCardPayment) return basePriceCents
  return roundUpToTenCents(Math.round(basePriceCents * CARD_MULTIPLIER))
}

/** Listino applicato all'articolo. Identico a PriceContext in packages/shared. */
export type PriceContext = "dine-in" | "takeaway-counter" | "takeaway-remote" | "takeaway-card"

/** Il listino carta include gia' il sovrapprezzo: sull'ordine non va applicato di nuovo. */
export function isCardPriceList(context: PriceContext): boolean {
  return context === "takeaway-card"
}

/** Colonne prezzo di MenuItem lette per calcolare un ordine. */
export interface PricedMenuItem {
  price: number
  priceTakeaway?: number | null
  priceTakeawayRemote?: number | null
  priceTakeawayCard?: number | null
}

/**
 * Prezzo di un articolo nel listino richiesto, con gli stessi fallback del
 * carrello (getItemPrice in apps/web/src/lib/utils.ts – tenerle in sync).
 * Se il listino specifico non e' valorizzato si ricade sul prezzo base.
 */
export function getItemPrice(item: PricedMenuItem, context: PriceContext): number {
  switch (context) {
    case "takeaway-counter":
      return item.priceTakeaway ?? item.price
    case "takeaway-remote":
      return item.priceTakeawayRemote ?? item.priceTakeaway ?? item.price
    case "takeaway-card":
      // Listino carta esplicito; se manca, prezzo da remoto con il +3% di sempre.
      return (
        item.priceTakeawayCard ??
        applyCardSurcharge(item.priceTakeawayRemote ?? item.priceTakeaway ?? item.price, true)
      )
    case "dine-in":
    default:
      return item.price
  }
}
