-- Script per aggiungere le colonne dei prezzi differenziati
-- Esegui questo script nel SQL Editor di Supabase Dashboard

-- Aggiungi colonna priceTakeaway (prezzo takeaway in loco/banco)
ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "priceTakeaway" INTEGER;

-- Aggiungi colonna priceTakeawayRemote (prezzo takeaway da remoto /ordina)
ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "priceTakeawayRemote" INTEGER;

-- Commento: entrambe le colonne sono nullable
-- - Se priceTakeaway è NULL, usa il prezzo base (price)
-- - Se priceTakeawayRemote è NULL, usa priceTakeaway o price

-- Verifica che le colonne siano state aggiunte
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'MenuItem'
AND column_name IN ('price', 'priceTakeaway', 'priceTakeawayRemote');
