-- OPTIMIZATION: Database indexes for menu performance
-- File: Run this migration on your Supabase database
-- 
-- npx prisma migrate dev --name add_menu_indexes
-- OR run directly in Supabase SQL Editor

-- Index for Category active + sortOrder (main menu query)
CREATE INDEX IF NOT EXISTS idx_category_active_sort 
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
CREATE INDEX IF NOT EXISTS idx_ingredient_instock 
ON "Ingredient" ("inStock") 
WHERE "inStock" = false;

-- Index for ModifierGroup menuItemId
CREATE INDEX IF NOT EXISTS idx_modifiergroup_menuitem 
ON "ModifierGroup" ("menuItemId");

-- Index for MenuItemIngredient for ingredient availability check
CREATE INDEX IF NOT EXISTS idx_menuitemingredient_lookup 
ON "MenuItemIngredient" ("menuItemId", "ingredientId", "isPrimary");

-- Composite index for faster category+items join
CREATE INDEX IF NOT EXISTS idx_menuitem_category_sort 
ON "MenuItem" ("categoryId", "sortOrder", available);

-- Analyze tables to update statistics
ANALYZE "Category";
ANALYZE "MenuItem";
ANALYZE "ModifierGroup";
ANALYZE "Modifier";
ANALYZE "Ingredient";
ANALYZE "MenuItemIngredient";

-- Optional: If you have many items, consider partial indexes
-- This index only includes items with modifiers (reduces index size)
-- CREATE INDEX IF NOT EXISTS idx_menuitem_with_modifiers 
-- ON "MenuItem" (id) 
-- WHERE id IN (SELECT DISTINCT "menuItemId" FROM "ModifierGroup");
