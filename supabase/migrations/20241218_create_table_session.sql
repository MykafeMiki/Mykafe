-- Create TableSession table for merged tables functionality
CREATE TABLE IF NOT EXISTS "TableSession" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "hostTableId" TEXT NOT NULL,
  "linkedTables" INTEGER[] DEFAULT '{}',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt" TIMESTAMP(3),
  PRIMARY KEY ("id")
);

-- Create unique index on code
CREATE UNIQUE INDEX IF NOT EXISTS "TableSession_code_key" ON "TableSession"("code");

-- Add foreign key constraint (optional, for data integrity)
-- ALTER TABLE "TableSession" ADD CONSTRAINT "TableSession_hostTableId_fkey" FOREIGN KEY ("hostTableId") REFERENCES "Table"("id") ON DELETE CASCADE;

-- Add tableSessionId column to Order table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Order' AND column_name = 'tableSessionId'
  ) THEN
    ALTER TABLE "Order" ADD COLUMN "tableSessionId" TEXT;
  END IF;
END $$;

-- Add foreign key constraint for Order.tableSessionId
-- ALTER TABLE "Order" ADD CONSTRAINT "Order_tableSessionId_fkey" FOREIGN KEY ("tableSessionId") REFERENCES "TableSession"("id") ON DELETE SET NULL;
