-- ============================================
-- "Order" nella pubblicazione Realtime
-- ============================================
-- Il print-server ascolta gli INSERT su "Order" via Realtime, ma la tabella non
-- era nella pubblicazione `supabase_realtime`: nessun evento arrivava e gli
-- scontrini partivano solo dal polling di riserva (fino a 30s di ritardo).
-- La RLS resta invariata: gli eventi arrivano solo a chi puo' leggere "Order"
-- (la secret key del print-server), non alla anon key.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'Order'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE "Order";
  END IF;
END $$;
