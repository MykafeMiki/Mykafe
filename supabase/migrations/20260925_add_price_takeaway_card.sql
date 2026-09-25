-- Quarto listino: takeaway da remoto con pagamento carta (prezzo esplicito,
-- sostituisce il +3% quando valorizzato). NULL = prezzo da remoto + 3%.
ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "priceTakeawayCard" INTEGER;
