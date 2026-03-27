/**
 * MIGRATION: Safe deprecation of PartySession
 * 
 * Questo approccio mantiene la tabella ma:
 * 1. Migra eventuali ordini orfani
 * 2. Chiude tutte le sessioni attive
 * 3. Aggiunge commento di deprecazione
 * 
 * Eseguire con: npx prisma migrate dev --name deprecate_party_session
 */

-- Step 1: Close all active PartySession
UPDATE "PartySession" 
SET "isActive" = false, 
    "closedAt" = NOW() 
WHERE "isActive" = true;

-- Step 2: Add deprecation comment
COMMENT ON TABLE "PartySession" IS 
'DEPRECATED: Use TableSession instead. Kept for historical order references only. Do not create new records.';

-- Step 3: Create a view to help identify any remaining references
CREATE OR REPLACE VIEW deprecated_party_orders AS
SELECT 
  o.id as order_id,
  o."createdAt" as order_date,
  ps.id as party_session_id,
  ps.code as party_code
FROM "Order" o
JOIN "PartySession" ps ON o."partySessionId" = ps.id;

-- Optional: If you want to fully remove PartySession in the future,
-- first run this to check for orphaned orders:
-- SELECT COUNT(*) FROM "Order" WHERE "partySessionId" IS NOT NULL;

-- Then remove the foreign key and column:
-- ALTER TABLE "Order" DROP COLUMN "partySessionId";
-- DROP TABLE "PartySession";
