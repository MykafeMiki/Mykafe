-- ============================================
-- Cambi alla ricetta sugli articoli dell'ordine
-- ============================================
-- Scontrino e schermo cucina devono sapere cosa cambia rispetto al piatto: il
-- sostituto di un ingrediente esaurito ("Salmone affumicato -> Tonno") e gli
-- ingredienti tolti dal cliente ("SENZA Cipolla rossa"). Nomi in italiano,
-- salvati dall'edge function `orders` quando arriva l'ordine.
--   substitutions:      [{"from": "Salmone affumicato", "to": "Tonno"}]
--   removedIngredients: ["Cipolla rossa"]
-- Colonne facoltative: gli ordini senza cambi le lasciano NULL.

ALTER TABLE "OrderItem"
  ADD COLUMN IF NOT EXISTS "substitutions" jsonb,
  ADD COLUMN IF NOT EXISTS "removedIngredients" jsonb;
