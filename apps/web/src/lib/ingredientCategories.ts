// Destinazioni d'uso degli ingredienti: in quali categorie del menu ciascuno e' ammesso.
// Una riga di IngredientCategory = ingrediente ammesso in quella categoria.

export interface IngredientCategoryRow {
  ingredientId: string
  categoryId: string
}

export type IngredientCategoryMap = Map<string, Set<string>>

export function buildIngredientCategoryMap(rows: IngredientCategoryRow[]): IngredientCategoryMap {
  const map: IngredientCategoryMap = new Map()
  for (const row of rows) {
    let set = map.get(row.ingredientId)
    if (!set) {
      set = new Set()
      map.set(row.ingredientId, set)
    }
    set.add(row.categoryId)
  }
  return map
}

// Un ingrediente senza nessuna categoria spuntata non e' ammesso da nessuna parte.
export function isIngredientAllowedInCategory(
  map: IngredientCategoryMap,
  ingredientId: string,
  categoryId: string
): boolean {
  return map.get(ingredientId)?.has(categoryId) ?? false
}

// Le aggiunte non collegate a un ingrediente non hanno destinazioni da rispettare.
export function isModifierAllowedInCategory(
  map: IngredientCategoryMap,
  modifier: { ingredientId?: string | null },
  categoryId: string
): boolean {
  return !modifier.ingredientId || isIngredientAllowedInCategory(map, modifier.ingredientId, categoryId)
}

// Due ingredienti sono "compatibili" se condividono almeno una categoria:
// serve a proporre come sostituto solo ingredienti usati negli stessi piatti.
export function shareCategory(
  a: { categoryIds?: string[] },
  b: { categoryIds?: string[] }
): boolean {
  const setA = new Set(a.categoryIds || [])
  return (b.categoryIds || []).some(id => setA.has(id))
}
