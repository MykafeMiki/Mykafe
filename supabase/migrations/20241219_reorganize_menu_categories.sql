-- Riorganizzazione categorie menu
-- Crea nuove categorie: Panini, Bagel, Focaccia Farcita

-- 1. Crea categoria Panini
INSERT INTO "Category" ("id", "name", "nameEn", "nameFr", "nameEs", "nameHe", "description", "descriptionEn", "sortOrder", "active", "createdAt", "updatedAt")
VALUES (
  'cat_panini_001',
  'Panini',
  'Sandwiches',
  'Sandwichs',
  'Bocadillos',
  'כריכים',
  'Panini su ciabatta o pita',
  'Sandwiches on ciabatta or pita bread',
  1,
  true,
  NOW(),
  NOW()
);

-- 2. Crea categoria Bagel
INSERT INTO "Category" ("id", "name", "nameEn", "nameFr", "nameEs", "nameHe", "description", "descriptionEn", "sortOrder", "active", "createdAt", "updatedAt")
VALUES (
  'cat_bagel_001',
  'Bagel',
  'Bagels',
  'Bagels',
  'Bagels',
  'בייגל',
  'Bagel farciti con ingredienti freschi',
  'Bagels stuffed with fresh ingredients',
  2,
  true,
  NOW(),
  NOW()
);

-- 3. Crea categoria Focaccia Farcita
INSERT INTO "Category" ("id", "name", "nameEn", "nameFr", "nameEs", "nameHe", "description", "descriptionEn", "sortOrder", "active", "createdAt", "updatedAt")
VALUES (
  'cat_focaccia_farcita_001',
  'Focaccia Farcita',
  'Stuffed Focaccia',
  'Focaccia Farcie',
  'Focaccia Rellena',
  'פוקצ''ה ממולאה',
  'Focaccia ripiena con ingredienti gustosi',
  'Focaccia filled with tasty ingredients',
  3,
  true,
  NOW(),
  NOW()
);

-- 4. Sposta i prodotti ciabatta e pita nella categoria Panini
UPDATE "MenuItem" SET "categoryId" = 'cat_panini_001' WHERE "id" IN (
  'cmiiv7slt000qfv0ryvv3qggs', -- Toast 01 (Ciabatta)
  'cmiiv7u2y003efv0regxs1xy1', -- Toast 09 (Ciabatta)
  'cmiiv7usa004qfv0rdi7vumds', -- Toast 13 (Ciabatta)
  'cmiiv7vbb005qfv0r1b01qzao', -- Toast 17 (Ciabatta)
  'cmiiv7vhg0062fv0rk06tl3vm', -- Toast 18 (Ciabatta)
  'cmiiv7t14001efv0rpgwqlz0i', -- Toast 03 (Pita)
  'cmiiv7twn0032fv0r1llhjp8t', -- Toast 08 (Pita)
  'cmiiv7ulx004efv0r48ugu9xs'  -- Toast 12 (Pita)
);

-- 5. Sposta i prodotti bagel nella categoria Bagel
UPDATE "MenuItem" SET "categoryId" = 'cat_bagel_001' WHERE "id" IN (
  'cmiiv7suu0012fv0rpgaj3cju', -- Toast 02
  'cmiiv7t7j001qfv0rq53091gg', -- Toast 04
  'cmiiv7tdv0022fv0r1igxwq2m', -- Toast 05
  'cmiiv7tqf002qfv0rch92grjw', -- Toast 07
  'cmiiv7u9f003qfv0rgyfolvoa', -- Toast 10
  'cmiiv7ufq0042fv0rumpkd4do', -- Toast 11
  'cmiiv7uyo0052fv0r7e83o57c'  -- Toast 15
);

-- 6. Sposta i prodotti focaccia nella categoria Focaccia Farcita
UPDATE "MenuItem" SET "categoryId" = 'cat_focaccia_farcita_001' WHERE "id" IN (
  'cmiiv7tk7002efv0rf4orxijt', -- Toast 06
  'cmiiv7v52005efv0r2ielw88c'  -- Toast 16
);

-- 7. Aggiorna ordine e nomi categorie esistenti
UPDATE "Category" SET "sortOrder" = 4, "name" = 'Piadina' WHERE "name" = 'Piadine';
UPDATE "Category" SET "sortOrder" = 5, "name" = 'Focaccia e Pizza' WHERE "name" = 'Focacce e Pizze';
UPDATE "Category" SET "sortOrder" = 6 WHERE "name" = 'Insalate';
UPDATE "Category" SET "sortOrder" = 7 WHERE "name" = 'Caprese';
UPDATE "Category" SET "sortOrder" = 8 WHERE "name" = 'Affumicato';
UPDATE "Category" SET "sortOrder" = 9, "name" = 'Bruschetta' WHERE "name" = 'Bruschette';
UPDATE "Category" SET "sortOrder" = 10, "name" = 'Caffetteria' WHERE "name" = 'Caffetteria e Dolci';
UPDATE "Category" SET "sortOrder" = 11 WHERE "name" = 'Bevande';

-- 8. Disattiva la vecchia categoria Panini Farciti
UPDATE "Category" SET "active" = false WHERE "name" = 'Panini Farciti';
