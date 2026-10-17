// Sostituto da mostrare nel menu per un ingrediente esaurito.
// La mappa salvata in AppSettings ('ingredient_substitutes') ricorda i nomi del
// sostituto com'erano quando e' stato scelto: qui si leggono dall'ingrediente
// attuale, cosi' una rinomina o una traduzione corretta arrivano subito al menu,
// e un sostituto esaurito o eliminato non viene promesso ai clienti.
// Funzioni pure: le usano sia il menu clienti (lib/api/menu.ts) sia /api/menu.

import type { SubstituteIngredient } from '@/lib/ingredientSubstitutes'

export interface LiveIngredient {
  id: string
  name: string
  nameEn?: string | null
  nameFr?: string | null
  nameEs?: string | null
  nameHe?: string | null
  inStock: boolean
}

export function buildLiveIngredientMap(rows: LiveIngredient[]): Map<string, LiveIngredient> {
  return new Map(rows.filter(row => row?.id).map(row => [row.id, row]))
}

export function resolveSubstitute(
  saved: Partial<SubstituteIngredient> | null | undefined,
  live: Map<string, LiveIngredient> | null,
  isAllowed: (ingredientId: string) => boolean
): SubstituteIngredient | undefined {
  if (!saved?.id || !isAllowed(saved.id)) return undefined
  // Lettura degli ingredienti fallita: restano i nomi salvati, come prima
  if (!live) return saved.name ? { ...saved, id: saved.id, name: saved.name } : undefined
  const ing = live.get(saved.id)
  // Eliminato, o esaurito anche lui: si toglie l'ingrediente senza sostituirlo
  if (!ing || !ing.inStock) return undefined
  return {
    id: ing.id,
    name: ing.name,
    nameEn: ing.nameEn || undefined,
    nameFr: ing.nameFr || undefined,
    nameEs: ing.nameEs || undefined,
    nameHe: ing.nameHe || undefined,
  }
}
