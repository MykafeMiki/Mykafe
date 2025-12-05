-- Enable Row Level Security (RLS) on all tables
-- This script enables RLS and creates policies that allow service_role to bypass RLS
-- Since the app uses Edge Functions with service_role_key, this provides extra security

-- Enable RLS on all tables
ALTER TABLE "Table" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Category" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MenuItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ModifierGroup" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Modifier" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Ingredient" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MenuItemIngredient" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderItemModifier" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PartySession" ENABLE ROW LEVEL SECURITY;

-- Create policies to allow service_role full access (Edge Functions use service_role)
-- Table
CREATE POLICY "service_role_all_Table" ON "Table" FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Category
CREATE POLICY "service_role_all_Category" ON "Category" FOR ALL TO service_role USING (true) WITH CHECK (true);

-- MenuItem
CREATE POLICY "service_role_all_MenuItem" ON "MenuItem" FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ModifierGroup
CREATE POLICY "service_role_all_ModifierGroup" ON "ModifierGroup" FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Modifier
CREATE POLICY "service_role_all_Modifier" ON "Modifier" FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Ingredient
CREATE POLICY "service_role_all_Ingredient" ON "Ingredient" FOR ALL TO service_role USING (true) WITH CHECK (true);

-- MenuItemIngredient
CREATE POLICY "service_role_all_MenuItemIngredient" ON "MenuItemIngredient" FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Order
CREATE POLICY "service_role_all_Order" ON "Order" FOR ALL TO service_role USING (true) WITH CHECK (true);

-- OrderItem
CREATE POLICY "service_role_all_OrderItem" ON "OrderItem" FOR ALL TO service_role USING (true) WITH CHECK (true);

-- OrderItemModifier
CREATE POLICY "service_role_all_OrderItemModifier" ON "OrderItemModifier" FOR ALL TO service_role USING (true) WITH CHECK (true);

-- PartySession
CREATE POLICY "service_role_all_PartySession" ON "PartySession" FOR ALL TO service_role USING (true) WITH CHECK (true);
