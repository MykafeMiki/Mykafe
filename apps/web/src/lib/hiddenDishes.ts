// Piatti nascosti dal menu perche' contengono un ingrediente con "hideDishes" attivo.
// Due fonti: i piatti associati all'ingrediente (MenuItemIngredient) e quelli che
// lo citano solo nella descrizione (IngredientHiddenItem, pre-calcolati dall'edge function).

export interface HidingIngredientRow {
  menuItems?: { menuItemId: string }[] | null
  hiddenItems?: { menuItemId: string }[] | null
}

// Select da usare per leggere gli ingredienti che nascondono piatti.
export const HIDING_INGREDIENTS_SELECT = `
  id,
  menuItems:MenuItemIngredient(menuItemId),
  hiddenItems:IngredientHiddenItem(menuItemId)
`

export function buildHiddenItemIds(rows: HidingIngredientRow[] | null | undefined): Set<string> {
  const hidden = new Set<string>()
  for (const row of rows || []) {
    for (const m of row.menuItems || []) hidden.add(m.menuItemId)
    for (const m of row.hiddenItems || []) hidden.add(m.menuItemId)
  }
  return hidden
}
