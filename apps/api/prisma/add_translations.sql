-- Add translation fields to Category table
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "nameEn" TEXT;
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "nameFr" TEXT;
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "nameEs" TEXT;
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "nameHe" TEXT;
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "descriptionEn" TEXT;
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "descriptionFr" TEXT;
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "descriptionEs" TEXT;
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "descriptionHe" TEXT;

-- Add translation fields to MenuItem table
ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "nameEn" TEXT;
ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "nameFr" TEXT;
ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "nameEs" TEXT;
ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "nameHe" TEXT;
ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "descriptionEn" TEXT;
ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "descriptionFr" TEXT;
ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "descriptionEs" TEXT;
ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "descriptionHe" TEXT;

-- Add translation fields to ModifierGroup table
ALTER TABLE "ModifierGroup" ADD COLUMN IF NOT EXISTS "nameEn" TEXT;
ALTER TABLE "ModifierGroup" ADD COLUMN IF NOT EXISTS "nameFr" TEXT;
ALTER TABLE "ModifierGroup" ADD COLUMN IF NOT EXISTS "nameEs" TEXT;
ALTER TABLE "ModifierGroup" ADD COLUMN IF NOT EXISTS "nameHe" TEXT;

-- Add translation fields to Modifier table
ALTER TABLE "Modifier" ADD COLUMN IF NOT EXISTS "nameEn" TEXT;
ALTER TABLE "Modifier" ADD COLUMN IF NOT EXISTS "nameFr" TEXT;
ALTER TABLE "Modifier" ADD COLUMN IF NOT EXISTS "nameEs" TEXT;
ALTER TABLE "Modifier" ADD COLUMN IF NOT EXISTS "nameHe" TEXT;

-- Add translation fields to Ingredient table (for ingredient names)
ALTER TABLE "Ingredient" ADD COLUMN IF NOT EXISTS "nameEn" TEXT;
ALTER TABLE "Ingredient" ADD COLUMN IF NOT EXISTS "nameFr" TEXT;
ALTER TABLE "Ingredient" ADD COLUMN IF NOT EXISTS "nameEs" TEXT;
ALTER TABLE "Ingredient" ADD COLUMN IF NOT EXISTS "nameHe" TEXT;
