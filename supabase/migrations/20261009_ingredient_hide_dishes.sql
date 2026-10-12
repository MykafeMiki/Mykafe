-- ============================================
-- Ingrediente che nasconde i piatti dal menu
-- ============================================
-- Con "hideDishes" attivo tutti i piatti che contengono l'ingrediente spariscono
-- dal menu clienti, finche' il flag non viene tolto. E' indipendente da
-- "inStock": un ingrediente esaurito resta nel menu (barrato, con sostituto),
-- questo invece toglie proprio i piatti. I piatti NON vengono disattivati:
-- tornano da soli quando si ripristina, senza toccare quelli che l'admin aveva
-- disattivato a mano.
--
-- I piatti con l'ingrediente associato (MenuItemIngredient) si nascondono
-- leggendo il flag. IngredientHiddenItem tiene i piatti che lo citano solo nella
-- descrizione, pre-calcolati quando si attiva il flag (stessa idea di
-- "MenuItemUnavailableIngredient"); le righe si cancellano al ripristino.

ALTER TABLE "Ingredient" ADD COLUMN IF NOT EXISTS "hideDishes" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "IngredientHiddenItem" (
  "id" TEXT NOT NULL,
  "menuItemId" TEXT NOT NULL,
  "ingredientId" TEXT NOT NULL,
  "matchedText" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "IngredientHiddenItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "IngredientHiddenItem_menuItemId_fkey"
    FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE,
  CONSTRAINT "IngredientHiddenItem_ingredientId_fkey"
    FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "IngredientHiddenItem_menuItemId_ingredientId_key"
  ON "IngredientHiddenItem"("menuItemId", "ingredientId");
CREATE INDEX IF NOT EXISTS "IngredientHiddenItem_ingredientId_idx"
  ON "IngredientHiddenItem"("ingredientId");

-- Lettura pubblica (il menu clienti usa la anon key), scrittura solo con la
-- secret key delle edge function.
ALTER TABLE "IngredientHiddenItem" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read" ON "IngredientHiddenItem";
CREATE POLICY "Allow public read" ON "IngredientHiddenItem"
  FOR SELECT TO anon, authenticated USING (true);
