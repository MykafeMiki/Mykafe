-- ============================================================
-- MIGRAZIONE: Indici Performance Menu
-- Data: 14 Gennaio 2026
-- ============================================================

-- Index for Category active + sortOrder (main menu query)
CREATE INDEX IF NOT EXISTS idx_category_active_sort_partial
ON "Category" (active, "sortOrder")
WHERE active = true;

-- Index for MenuItem available + sortOrder + categoryId
CREATE INDEX IF NOT EXISTS idx_menuitem_available_category
ON "MenuItem" (available, "categoryId", "sortOrder")
WHERE available = true;

-- Index for Modifier available + modifierGroupId
CREATE INDEX IF NOT EXISTS idx_modifier_available_group
ON "Modifier" (available, "modifierGroupId")
WHERE available = true;

-- Index for Ingredient inStock (for out-of-stock filtering)
CREATE INDEX IF NOT EXISTS idx_ingredient_instock_false
ON "Ingredient" ("inStock")
WHERE "inStock" = false;

-- Index for ModifierGroup menuItemId
CREATE INDEX IF NOT EXISTS idx_modifiergroup_menuitem
ON "ModifierGroup" ("menuItemId");

-- Index for MenuItemIngredient for ingredient availability check
CREATE INDEX IF NOT EXISTS idx_menuitemingredient_lookup
ON "MenuItemIngredient" ("menuItemId", "ingredientId", "isPrimary");

-- Composite index for faster category+items join
CREATE INDEX IF NOT EXISTS idx_menuitem_category_sort_avail
ON "MenuItem" ("categoryId", "sortOrder", available);

-- Analyze tables to update statistics
ANALYZE "Category";
ANALYZE "MenuItem";
ANALYZE "ModifierGroup";
ANALYZE "Modifier";
ANALYZE "Ingredient";
ANALYZE "MenuItemIngredient";
