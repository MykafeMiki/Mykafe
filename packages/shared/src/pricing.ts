/**
 * Pricing utilities – fonte unica di verità per il calcolo del sovrapprezzo carta.
 * Importare da qui in tutti i componenti frontend e nel backend Express.
 *
 * NOTA: le Supabase Edge Functions (Deno) usano _shared/pricing.ts (file separato
 * per compatibilità con l'import map Deno).
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

/**
 * Applica un moltiplicatore di prezzo generico con arrotondamento ai 10 centesimi superiori.
 * Usato da componenti che ricevono priceMultiplier come prop (es. ItemModal, MenuItemCard).
 * @param priceCents  Prezzo base in centesimi
 * @param multiplier  Moltiplicatore (es. 1.03 per +3%). Se ≤ 1 restituisce priceCents invariato.
 * @returns Prezzo finale in centesimi
 */
export function applyPriceMultiplier(priceCents: number, multiplier: number): number {
  if (multiplier <= 1) return priceCents
  return roundUpToTenCents(Math.round(priceCents * multiplier))
}
