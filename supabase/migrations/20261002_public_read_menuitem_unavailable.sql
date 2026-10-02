-- ============================================
-- Lettura pubblica su "MenuItemUnavailableIngredient"
-- ============================================
-- La tabella ha la RLS attiva ma nessuna policy: la anon key ne legge 0 righe.
-- Il menu clienti (fetchMenuDirect) la legge proprio con la anon key per
-- sapere quali piatti citano nella descrizione un ingrediente esaurito, quindi
-- quei piatti non mostravano ne' l'ingrediente esaurito ne' il sostituto.
-- Sono dati del menu, non sensibili: stessa lettura pubblica di
-- "MenuItemIngredient". La scrittura resta solo alla secret key (edge function).

DROP POLICY IF EXISTS "Allow public read" ON "MenuItemUnavailableIngredient";
CREATE POLICY "Allow public read" ON "MenuItemUnavailableIngredient"
  FOR SELECT TO anon, authenticated USING (true);
