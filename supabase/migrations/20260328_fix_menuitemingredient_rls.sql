-- Fix MenuItemIngredient RLS: Allow public read access
-- Previous migrations added RLS for Category and MenuItem but not MenuItemIngredient

-- Check if RLS is already enabled
-- If not, enable it
ALTER TABLE IF EXISTS "MenuItemIngredient" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read" ON "MenuItemIngredient";

-- Create new policy for public read access
CREATE POLICY "Allow public read"
ON "MenuItemIngredient"
FOR SELECT
TO anon, authenticated
USING (true);

-- Also ensure Ingredient table has read policy
ALTER TABLE IF EXISTS "Ingredient" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read" ON "Ingredient";

CREATE POLICY "Allow public read"  
ON "Ingredient"
FOR SELECT
TO anon, authenticated
USING (true);
