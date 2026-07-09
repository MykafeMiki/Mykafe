-- ============================================
-- Unifica tutte le categorie panini in "Toast"
-- Mantiene Piadine e Focacce/Pizze separate
-- Data: 16 Gennaio 2026
-- ============================================

-- 1. Crea la categoria Toast unificata se non esiste
INSERT INTO "Category" ("id", "name", "nameEn", "nameFr", "nameEs", "nameHe", "description", "descriptionEn", "sortOrder", "active", "createdAt", "updatedAt")
SELECT 
  'cat_toast_unified',
  'Toast',
  'Toast',
  'Toast',
  'Tostadas',
  'טוסט',
  'Panini, Bagel, Ciabatta e Focaccia Farcita',
  'Sandwiches, Bagels, Ciabatta and Stuffed Focaccia',
  1,
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Category" WHERE "name" = 'Toast' AND "active" = true
);

-- 2. Sposta tutti gli item dalle vecchie categorie alla categoria Toast
DO $$
DECLARE
  toast_cat_id TEXT;
  items_moved INTEGER := 0;
BEGIN
  -- Trova l'ID della categoria Toast attiva
  SELECT "id" INTO toast_cat_id 
  FROM "Category" 
  WHERE "name" = 'Toast' AND "active" = true 
  LIMIT 1;
  
  -- Se non trovata, usa l'ID inserito sopra
  IF toast_cat_id IS NULL THEN
    toast_cat_id := 'cat_toast_unified';
  END IF;
  
  RAISE NOTICE 'Usando categoria Toast con ID: %', toast_cat_id;
  
  -- Conta items da spostare
  SELECT COUNT(*) INTO items_moved
  FROM "MenuItem" 
  WHERE "categoryId" IN (
    SELECT "id" FROM "Category" 
    WHERE "name" IN ('Panini', 'Bagel', 'Focaccia Farcita', 'Panini Farciti')
      AND "id" != toast_cat_id
  );
  
  RAISE NOTICE 'Items da spostare: %', items_moved;
  
  -- Sposta tutti gli item
  UPDATE "MenuItem" 
  SET "categoryId" = toast_cat_id, "updatedAt" = NOW()
  WHERE "categoryId" IN (
    SELECT "id" FROM "Category" 
    WHERE "name" IN ('Panini', 'Bagel', 'Focaccia Farcita', 'Panini Farciti')
      AND "id" != toast_cat_id
  );
  
  -- Disattiva le vecchie categorie
  UPDATE "Category" 
  SET "active" = false, "updatedAt" = NOW()
  WHERE "name" IN ('Panini', 'Bagel', 'Focaccia Farcita', 'Panini Farciti')
    AND "id" != toast_cat_id;
    
  RAISE NOTICE 'Vecchie categorie disattivate';

END $$;

-- 3. Aggiorna sortOrder di tutte le categorie attive
UPDATE "Category" SET "sortOrder" = 1, "updatedAt" = NOW() WHERE "name" = 'Toast' AND "active" = true;
UPDATE "Category" SET "sortOrder" = 2, "updatedAt" = NOW() WHERE "name" IN ('Piadina', 'Piadine') AND "active" = true;
UPDATE "Category" SET "sortOrder" = 3, "updatedAt" = NOW() WHERE "name" IN ('Focaccia e Pizza', 'Focacce e Pizze') AND "active" = true;
UPDATE "Category" SET "sortOrder" = 4, "updatedAt" = NOW() WHERE "name" IN ('Bruschetta', 'Bruschette') AND "active" = true;
UPDATE "Category" SET "sortOrder" = 5, "updatedAt" = NOW() WHERE "name" = 'Caprese' AND "active" = true;
UPDATE "Category" SET "sortOrder" = 6, "updatedAt" = NOW() WHERE "name" = 'Affumicato' AND "active" = true;
UPDATE "Category" SET "sortOrder" = 7, "updatedAt" = NOW() WHERE "name" IN ('Insalate', 'Salad') AND "active" = true;
UPDATE "Category" SET "sortOrder" = 8, "updatedAt" = NOW() WHERE "name" IN ('Caffetteria', 'Caffetteria e Dolci') AND "active" = true;
UPDATE "Category" SET "sortOrder" = 9, "updatedAt" = NOW() WHERE "name" IN ('Bevande', 'Bibite') AND "active" = true;
UPDATE "Category" SET "sortOrder" = 10, "updatedAt" = NOW() WHERE "name" = 'Sushi' AND "active" = true;

-- 4. Verifica finale
DO $$
DECLARE
  toast_items INTEGER;
  active_categories INTEGER;
BEGIN
  SELECT COUNT(*) INTO toast_items 
  FROM "MenuItem" mi
  JOIN "Category" c ON mi."categoryId" = c."id"
  WHERE c."name" = 'Toast' AND c."active" = true;
  
  SELECT COUNT(*) INTO active_categories
  FROM "Category" WHERE "active" = true;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRATION COMPLETATA';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Items nella categoria Toast: %', toast_items;
  RAISE NOTICE 'Categorie attive totali: %', active_categories;
  RAISE NOTICE '========================================';
END $$;
