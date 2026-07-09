-- ============================================
-- Rinomina la categoria "Toast" → "Panini"
-- Unifica TUTTE le categorie panini sotto "Panini"
-- Assicura che la categoria sia attiva e visibile
-- Data: 26 Febbraio 2026
-- ============================================

-- 1. Determina la categoria target (Panini o Toast attiva)
DO $$
DECLARE
  target_id TEXT;
  panini_id TEXT;
  toast_id  TEXT;
BEGIN
  -- Cerca categoria "Panini" attiva
  SELECT id INTO panini_id FROM categories WHERE lower(name) = 'panini' AND active = true LIMIT 1;
  -- Cerca categoria "Toast" attiva
  SELECT id INTO toast_id  FROM categories WHERE lower(name) = 'toast'  AND active = true LIMIT 1;

  -- Cerca categoria "Panini" anche se inattiva
  IF panini_id IS NULL THEN
    SELECT id INTO panini_id FROM categories WHERE lower(name) = 'panini' LIMIT 1;
  END IF;
  IF toast_id IS NULL THEN
    SELECT id INTO toast_id  FROM categories WHERE lower(name) = 'toast'  LIMIT 1;
  END IF;

  -- Sceglie target: preferisce "Panini", poi "Toast"
  target_id := COALESCE(panini_id, toast_id);

  RAISE NOTICE 'panini_id=%, toast_id=%, target_id=%', panini_id, toast_id, target_id;

  IF target_id IS NULL THEN
    -- Crea categoria Panini da zero
    INSERT INTO categories (id, name, "nameEn", "nameFr", "nameEs", "nameHe", description, "sortOrder", active, "createdAt", "updatedAt")
    VALUES (
      'cat_panini_unified',
      'Panini',
      'Sandwiches',
      'Sandwichs',
      'Sándwiches',
      'כריכות',
      'Panini, Toast, Bagel, Club Sandwich, Ciabatta e Focaccia Farcita',
      1,
      true,
      NOW(),
      NOW()
    );
    target_id := 'cat_panini_unified';
    RAISE NOTICE 'Creata nuova categoria Panini con id=%', target_id;
  ELSE
    -- Rinomina la categoria target in "Panini" e la attiva
    UPDATE categories
    SET
      name         = 'Panini',
      "nameEn"     = 'Sandwiches',
      "nameFr"     = 'Sandwichs',
      "nameEs"     = 'Sándwiches',
      "nameHe"     = 'כריכות',
      description  = 'Panini, Toast, Bagel, Club Sandwich, Ciabatta e Focaccia Farcita',
      active       = true,
      "sortOrder"  = 1,
      "updatedAt"  = NOW()
    WHERE id = target_id;
    RAISE NOTICE 'Rinominata/attivata categoria id=% → Panini', target_id;
  END IF;

  -- 2. Sposta tutti gli item delle altre categorie panini verso target_id
  UPDATE menu_items
  SET "categoryId" = target_id, "updatedAt" = NOW()
  WHERE "categoryId" IN (
    SELECT id FROM categories
    WHERE lower(name) IN ('toast', 'panini', 'panino', 'bagel', 'focaccia farcita', 'ciabatte', 'ciabatta', 'club sandwich')
      AND id != target_id
  );

  RAISE NOTICE 'Items spostati verso categoria Panini (id=%)', target_id;

  -- 3. Disattiva le vecchie categorie ora vuote
  UPDATE categories
  SET active = false, "updatedAt" = NOW()
  WHERE lower(name) IN ('toast', 'panino', 'bagel', 'focaccia farcita', 'ciabatte', 'ciabatta', 'club sandwich')
    AND id != target_id;

  RAISE NOTICE 'Vecchie categorie disattivate';

END $$;

-- 4. Aggiorna ordine categorie attive
UPDATE categories SET "sortOrder" = 1, "updatedAt" = NOW() WHERE lower(name) = 'panini'  AND active = true;
UPDATE categories SET "sortOrder" = 2, "updatedAt" = NOW() WHERE lower(name) IN ('piadina','piadine') AND active = true;
UPDATE categories SET "sortOrder" = 3, "updatedAt" = NOW() WHERE lower(name) IN ('focaccia e pizza','focacce e pizze') AND active = true;
UPDATE categories SET "sortOrder" = 4, "updatedAt" = NOW() WHERE lower(name) IN ('bruschetta','bruschette') AND active = true;
UPDATE categories SET "sortOrder" = 5, "updatedAt" = NOW() WHERE lower(name) = 'caprese'   AND active = true;
UPDATE categories SET "sortOrder" = 6, "updatedAt" = NOW() WHERE lower(name) = 'affumicato' AND active = true;
UPDATE categories SET "sortOrder" = 7, "updatedAt" = NOW() WHERE lower(name) IN ('insalate','salad') AND active = true;
UPDATE categories SET "sortOrder" = 8, "updatedAt" = NOW() WHERE lower(name) IN ('caffetteria','caffetteria e dolci') AND active = true;
UPDATE categories SET "sortOrder" = 9, "updatedAt" = NOW() WHERE lower(name) IN ('bevande','bibite') AND active = true;
UPDATE categories SET "sortOrder" = 10, "updatedAt" = NOW() WHERE lower(name) = 'sushi' AND active = true;

-- 5. Verifica finale
DO $$
DECLARE
  panini_items INTEGER;
  panini_id    TEXT;
  active_cats  INTEGER;
BEGIN
  SELECT id INTO panini_id FROM categories WHERE lower(name) = 'panini' AND active = true LIMIT 1;

  SELECT COUNT(*) INTO panini_items
  FROM menu_items mi
  JOIN categories c ON mi."categoryId" = c.id
  WHERE c.active = true AND lower(c.name) = 'panini';

  SELECT COUNT(*) INTO active_cats FROM categories WHERE active = true;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRAZIONE COMPLETATA';
  RAISE NOTICE 'Categoria Panini id    : %', panini_id;
  RAISE NOTICE 'Items in categoria Panini : %', panini_items;
  RAISE NOTICE 'Categorie attive totali   : %', active_cats;
  RAISE NOTICE '========================================';
END $$;
