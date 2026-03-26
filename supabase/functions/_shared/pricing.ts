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
