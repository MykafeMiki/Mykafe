-- Add payment tracking fields to Order table
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "isPaid" BOOLEAN DEFAULT false;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP WITH TIME ZONE;
