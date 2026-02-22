-- ============================================================
-- MIGRAZIONE: Indici di Performance per MyKafe
-- Data: 12 Gennaio 2026
-- ============================================================

-- TABELLA: Order
-- Indice per query cucina (ordini attivi ordinati per tempo)
CREATE INDEX IF NOT EXISTS idx_order_status_created
  ON "Order" (status, "createdAt" ASC);

-- Indice per query ordini per tavolo
CREATE INDEX IF NOT EXISTS idx_order_table_status
  ON "Order" ("tableId", status);

-- Indice per query cassa (ordini non pagati)
CREATE INDEX IF NOT EXISTS idx_order_unpaid
  ON "Order" ("isPaid", status)
  WHERE "isPaid" = false;

-- Indice per storico pagamenti
CREATE INDEX IF NOT EXISTS idx_order_paid_at
  ON "Order" ("paidAt" DESC)
  WHERE "isPaid" = true;

-- Indice per sessioni tavoli uniti
CREATE INDEX IF NOT EXISTS idx_order_table_session
  ON "Order" ("tableSessionId")
  WHERE "tableSessionId" IS NOT NULL;

-- TABELLA: MenuItem
CREATE INDEX IF NOT EXISTS idx_menuitem_category_available
  ON "MenuItem" ("categoryId", available, "sortOrder" ASC);

-- TABELLA: OrderItem
CREATE INDEX IF NOT EXISTS idx_orderitem_order
  ON "OrderItem" ("orderId");

CREATE INDEX IF NOT EXISTS idx_orderitem_menuitem
  ON "OrderItem" ("menuItemId");

-- TABELLA: OrderItemModifier
CREATE INDEX IF NOT EXISTS idx_orderitemmodifier_orderitem
  ON "OrderItemModifier" ("orderItemId");

-- TABELLA: Table
CREATE INDEX IF NOT EXISTS idx_table_status
  ON "Table" (status);

-- TABELLA: Category
CREATE INDEX IF NOT EXISTS idx_category_active_sort
  ON "Category" (active, "sortOrder" ASC);

-- TABELLA: Modifier
CREATE INDEX IF NOT EXISTS idx_modifier_group_available
  ON "Modifier" ("modifierGroupId", available);

-- TABELLA: Ingredient
CREATE INDEX IF NOT EXISTS idx_ingredient_stock_type
  ON "Ingredient" ("inStock", "menuType");

-- TABELLA: TableSession
CREATE INDEX IF NOT EXISTS idx_tablesession_active
  ON "TableSession" ("isActive")
  WHERE "isActive" = true;

-- TABELLA: TableCustomer
CREATE INDEX IF NOT EXISTS idx_tablecustomer_active
  ON "TableCustomer" ("tableId", "isActive")
  WHERE "isActive" = true;

-- TABELLA: MenuItemIngredient
CREATE INDEX IF NOT EXISTS idx_menuitemingredient_menuitem
  ON "MenuItemIngredient" ("menuItemId");

CREATE INDEX IF NOT EXISTS idx_menuitemingredient_ingredient
  ON "MenuItemIngredient" ("ingredientId");

-- Aggiorna statistiche
ANALYZE "Order";
ANALYZE "MenuItem";
ANALYZE "OrderItem";
ANALYZE "OrderItemModifier";
ANALYZE "Table";
ANALYZE "Category";
ANALYZE "Modifier";
ANALYZE "Ingredient";
ANALYZE "TableSession";
ANALYZE "TableCustomer";
ANALYZE "MenuItemIngredient";
