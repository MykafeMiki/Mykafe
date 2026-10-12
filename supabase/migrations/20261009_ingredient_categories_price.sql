-- ============================================
-- Destinazioni d'uso e prezzo per ingrediente
-- ============================================
-- Ogni ingrediente dichiara in quali categorie del menu si puo' usare
-- (panini, insalate, sushi, caffetteria...). La categoria "caffetteria" non
-- deve offrire "cetriolini", e il form "nuovo piatto" non deve proporre
-- "gelato alla crema" in un panino.
--
-- IngredientCategory: una riga = ingrediente ammesso in quella categoria.
-- Ingredient.price: prezzo (centesimi) inserito a mano dell'ingrediente come
-- aggiunta. NULL = nessun prezzo impostato, le aggiunte tengono il loro.

ALTER TABLE "Ingredient" ADD COLUMN IF NOT EXISTS "price" INTEGER;

CREATE TABLE IF NOT EXISTS "IngredientCategory" (
  "ingredientId" TEXT NOT NULL,
  "categoryId"   TEXT NOT NULL,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "IngredientCategory_pkey" PRIMARY KEY ("ingredientId", "categoryId"),
  CONSTRAINT "IngredientCategory_ingredientId_fkey"
    FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE CASCADE,
  CONSTRAINT "IngredientCategory_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IngredientCategory_categoryId_idx"
  ON "IngredientCategory"("categoryId");

-- Lettura pubblica (il menu clienti usa la anon key), scrittura solo con la
-- secret key delle edge function: stessa regola di "MenuItemIngredient".
ALTER TABLE "IngredientCategory" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read" ON "IngredientCategory";
CREATE POLICY "Allow public read" ON "IngredientCategory"
  FOR SELECT TO anon, authenticated USING (true);

-- Backfill: oggi ogni ingrediente e' usabile ovunque. Parte tutto spuntato, e
-- l'admin toglie le spunte dove non ha senso, cosi' il menu non cambia da solo.
INSERT INTO "IngredientCategory" ("ingredientId", "categoryId")
SELECT i."id", c."id"
FROM "Ingredient" i
CROSS JOIN "Category" c
ON CONFLICT DO NOTHING;
