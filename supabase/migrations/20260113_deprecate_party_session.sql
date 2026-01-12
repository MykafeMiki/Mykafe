-- ============================================================
-- MIGRAZIONE: Deprecazione PartySession
-- Data: 12 Gennaio 2026
-- ============================================================

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
