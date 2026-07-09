-- ============================================
-- Restringe la scrittura su "AppSettings"
-- ============================================
-- Prima la policy "public_write" (FOR ALL USING (true)) permetteva a CHIUNQUE
-- avesse la anon key (pubblica) di scrivere direttamente la tabella via API REST.
-- Le impostazioni vengono modificate solo dai route handler server-side
-- (apps/web/src/app/api/settings/*) che usano la service_role key, la quale
-- bypassa comunque la RLS. Quindi qui teniamo solo la lettura pubblica.

DROP POLICY IF EXISTS "public_write" ON "AppSettings";

-- La lettura pubblica resta (il frontend legge orari/chiusure/sostituti).
-- "public_read" (FOR SELECT USING (true)) è già presente dalla migrazione 20260224.
