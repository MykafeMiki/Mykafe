-- Tabella per match description pre-calcolati
-- Quando un ingrediente va out-of-stock, calcoliamo una volta quali piatti lo contengono
-- Il menu endpoint fa un semplice JOIN invece del loop O(items × ingredients)

CREATE TABLE IF NOT EXISTS "MenuItemUnavailableIngredient" (
  "id" TEXT NOT NULL,
  "menuItemId" TEXT NOT NULL,
  "ingredientId" TEXT NOT NULL,
  "matchedText" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MenuItemUnavailableIngredient_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MenuItemUnavailableIngredient_menuItemId_fkey"
    FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE,
  CONSTRAINT "MenuItemUnavailableIngredient_ingredientId_fkey"
    FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "MenuItemUnavailableIngredient_menuItemId_ingredientId_key"
  ON "MenuItemUnavailableIngredient"("menuItemId", "ingredientId");
CREATE INDEX IF NOT EXISTS "MenuItemUnavailableIngredient_ingredientId_idx"
  ON "MenuItemUnavailableIngredient"("ingredientId");
CREATE INDEX IF NOT EXISTS "MenuItemUnavailableIngredient_menuItemId_idx"
  ON "MenuItemUnavailableIngredient"("menuItemId");
