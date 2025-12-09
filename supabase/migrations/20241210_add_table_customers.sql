-- Add TableCustomer table for tracking customers at tables
CREATE TABLE IF NOT EXISTS "TableCustomer" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isHost" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "TableCustomer_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraint
ALTER TABLE "TableCustomer" ADD CONSTRAINT "TableCustomer_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS "TableCustomer_tableId_isActive_idx" ON "TableCustomer"("tableId", "isActive");
