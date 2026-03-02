-- Script SQL per aggiornare le traduzioni del menu MyKafe
-- Esegui questo script nel SQL Editor di Supabase

-- ============== CATEGORIE ==============
UPDATE "Category" SET
  "nameEn" = 'Toast',
  "nameFr" = 'Toast',
  "nameEs" = 'Tostada',
  "nameHe" = 'טוסט',
  "descriptionEn" = 'Each toast is served with a side salad',
  "descriptionFr" = 'Chaque toast est servi avec une salade d''accompagnement',
  "descriptionEs" = 'Cada tostada se sirve con ensalada de acompañamiento',
  "descriptionHe" = 'כל טוסט מוגש עם סלט צד'
WHERE "name" = 'Toast';

UPDATE "Category" SET
  "nameEn" = 'Salad',
  "nameFr" = 'Salade',
  "nameEs" = 'Ensalada',
  "nameHe" = 'סלט',
  "descriptionEn" = 'Fresh and genuine salads',
  "descriptionFr" = 'Salades fraîches et authentiques',
  "descriptionEs" = 'Ensaladas frescas y genuinas',
  "descriptionHe" = 'סלטים טריים ואותנטיים'
WHERE "name" = 'Salad';

UPDATE "Category" SET
  "nameEn" = 'Piadina',
  "nameFr" = 'Piadina',
  "nameEs" = 'Piadina',
  "nameHe" = 'פיאדינה',
  "descriptionEn" = 'Piadinas stuffed with fresh ingredients',
  "descriptionFr" = 'Piadines garnies d''ingrédients frais',
  "descriptionEs" = 'Piadinas rellenas con ingredientes frescos',
  "descriptionHe" = 'פיאדינות ממולאות במרכיבים טריים'
WHERE "name" = 'Piadina';

UPDATE "Category" SET
  "nameEn" = 'Smoked',
  "nameFr" = 'Fumé',
  "nameEs" = 'Ahumado',
  "nameHe" = 'מעושן',
  "descriptionEn" = 'Specialties with smoked salmon',
  "descriptionFr" = 'Spécialités au saumon fumé',
  "descriptionEs" = 'Especialidades con salmón ahumado',
  "descriptionHe" = 'מיוחדים עם סלמון מעושן'
WHERE "name" = 'Affumicato';

UPDATE "Category" SET
  "nameEn" = 'Caprese',
  "nameFr" = 'Caprese',
  "nameEs" = 'Caprese',
  "nameHe" = 'קפרזה',
  "descriptionEn" = 'Our caprese dishes',
  "descriptionFr" = 'Nos capreses',
  "descriptionEs" = 'Nuestras capresas',
  "descriptionHe" = 'מנות הקפרזה שלנו'
WHERE "name" = 'Caprese';

UPDATE "Category" SET
  "nameEn" = 'Bruschetta',
  "nameFr" = 'Bruschetta',
  "nameEs" = 'Bruschetta',
  "nameHe" = 'ברוסקטה',
  "descriptionEn" = 'Traditional bruschettas',
  "descriptionFr" = 'Bruschettas traditionnelles',
  "descriptionEs" = 'Bruschettas tradicionales',
  "descriptionHe" = 'ברוסקטות מסורתיות'
WHERE "name" = 'Bruschetta';

UPDATE "Category" SET
  "nameEn" = 'Pizza and Focaccia',
  "nameFr" = 'Pizza et Focaccia',
  "nameEs" = 'Pizza y Focaccia',
  "nameHe" = 'פיצה ופוקצ''ה',
  "descriptionEn" = 'Homemade pizza and focaccia',
  "descriptionFr" = 'Pizza et focaccia faites maison',
  "descriptionEs" = 'Pizza y focaccia caseras',
  "descriptionHe" = 'פיצה ופוקצ''ה ביתיות'
WHERE "name" = 'Pizza e Focaccia';

UPDATE "Category" SET
  "nameEn" = 'Beverages',
  "nameFr" = 'Boissons',
  "nameEs" = 'Bebidas',
  "nameHe" = 'משקאות',
  "descriptionEn" = 'Fresh beverages',
  "descriptionFr" = 'Boissons fraîches',
  "descriptionEs" = 'Bebidas frescas',
  "descriptionHe" = 'משקאות קרים'
WHERE "name" = 'Bevande';

UPDATE "Category" SET
  "nameEn" = 'Coffee Shop',
  "nameFr" = 'Café',
  "nameEs" = 'Cafetería',
  "nameHe" = 'בית קפה',
  "descriptionEn" = 'Sweets and hot beverages',
  "descriptionFr" = 'Desserts et boissons chaudes',
  "descriptionEs" = 'Dulces y bebidas calientes',
  "descriptionHe" = 'קינוחים ומשקאות חמים'
WHERE "name" = 'Caffetteria';

-- ============== TOAST ==============
UPDATE "MenuItem" SET
  "nameEn" = 'Toast 01', "nameFr" = 'Toast 01', "nameEs" = 'Tostada 01', "nameHe" = 'טוסט 01',
  "descriptionEn" = 'Ciabatta, mozzarella, tomato, arugula',
  "descriptionFr" = 'Ciabatta, mozzarella, tomate, roquette',
  "descriptionEs" = 'Ciabatta, mozzarella, tomate, rúcula',
  "descriptionHe" = 'צ''יאבטה, מוצרלה, עגבנייה, רוקט'
WHERE "name" = 'Toast 01';

UPDATE "MenuItem" SET
  "nameEn" = 'Toast 02', "nameFr" = 'Toast 02', "nameEs" = 'Tostada 02', "nameHe" = 'טוסט 02',
  "descriptionEn" = 'Bagel, mozzarella, zucchini, tomato',
  "descriptionFr" = 'Bagel, mozzarella, courgettes, tomate',
  "descriptionEs" = 'Bagel, mozzarella, calabacín, tomate',
  "descriptionHe" = 'בייגל, מוצרלה, קישוא, עגבנייה'
WHERE "name" = 'Toast 02';

UPDATE "MenuItem" SET
  "nameEn" = 'Toast 03', "nameFr" = 'Toast 03', "nameEs" = 'Tostada 03', "nameHe" = 'טוסט 03',
  "descriptionEn" = 'Pita bread, mozzarella, eggplant, tomato, mayonnaise',
  "descriptionFr" = 'Pain pita, mozzarella, aubergines, tomate, mayonnaise',
  "descriptionEs" = 'Pan árabe, mozzarella, berenjena, tomate, mayonesa',
  "descriptionHe" = 'פיתה, מוצרלה, חציל, עגבנייה, מיונז'
WHERE "name" = 'Toast 03';

UPDATE "MenuItem" SET
  "nameEn" = 'Toast 04', "nameFr" = 'Toast 04', "nameEs" = 'Tostada 04', "nameHe" = 'טוסט 04',
  "descriptionEn" = 'Bagel, tuna, tomato, onion, arugula, mayonnaise',
  "descriptionFr" = 'Bagel, thon, tomate, oignon, roquette, mayonnaise',
  "descriptionEs" = 'Bagel, atún, tomate, cebolla, rúcula, mayonesa',
  "descriptionHe" = 'בייגל, טונה, עגבנייה, בצל, רוקט, מיונז'
WHERE "name" = 'Toast 04';

UPDATE "MenuItem" SET
  "nameEn" = 'Toast 05', "nameFr" = 'Toast 05', "nameEs" = 'Tostada 05', "nameHe" = 'טוסט 05',
  "descriptionEn" = 'Bagel, smoked salmon, tomato, arugula, mayonnaise',
  "descriptionFr" = 'Bagel, saumon fumé, tomate, roquette, mayonnaise',
  "descriptionEs" = 'Bagel, salmón ahumado, tomate, rúcula, mayonesa',
  "descriptionHe" = 'בייגל, סלמון מעושן, עגבנייה, רוקט, מיונז'
WHERE "name" = 'Toast 05';

UPDATE "MenuItem" SET
  "nameEn" = 'Toast 06', "nameFr" = 'Toast 06', "nameEs" = 'Tostada 06', "nameHe" = 'טוסט 06',
  "descriptionEn" = 'Focaccia, mozzarella, tomato, eggplant, zucchini',
  "descriptionFr" = 'Focaccia, mozzarella, tomate, aubergines, courgettes',
  "descriptionEs" = 'Focaccia, mozzarella, tomate, berenjena, calabacín',
  "descriptionHe" = 'פוקצ''ה, מוצרלה, עגבנייה, חציל, קישוא'
WHERE "name" = 'Toast 06';

UPDATE "MenuItem" SET
  "nameEn" = 'Toast 07', "nameFr" = 'Toast 07', "nameEs" = 'Tostada 07', "nameHe" = 'טוסט 07',
  "descriptionEn" = 'Bagel, mozzarella, tomato, pesto, arugula',
  "descriptionFr" = 'Bagel, mozzarella, tomate, pesto, roquette',
  "descriptionEs" = 'Bagel, mozzarella, tomate, pesto, rúcula',
  "descriptionHe" = 'בייגל, מוצרלה, עגבנייה, פסטו, רוקט'
WHERE "name" = 'Toast 07';

UPDATE "MenuItem" SET
  "nameEn" = 'Toast 08', "nameFr" = 'Toast 08', "nameEs" = 'Tostada 08', "nameHe" = 'טוסט 08',
  "descriptionEn" = 'Pita bread, mozzarella, mushrooms, oregano, tomato, salad',
  "descriptionFr" = 'Pain pita, mozzarella, champignons, origan, tomate, salade',
  "descriptionEs" = 'Pan árabe, mozzarella, champiñones, orégano, tomate, ensalada',
  "descriptionHe" = 'פיתה, מוצרלה, פטריות, אורגנו, עגבנייה, סלט'
WHERE "name" = 'Toast 08';

UPDATE "MenuItem" SET
  "nameEn" = 'Toast 09', "nameFr" = 'Toast 09', "nameEs" = 'Tostada 09', "nameHe" = 'טוסט 09',
  "descriptionEn" = 'Ciabatta, mixed cheeses, tomato, salad',
  "descriptionFr" = 'Ciabatta, fromages variés, tomate, salade',
  "descriptionEs" = 'Ciabatta, quesos mixtos, tomate, ensalada',
  "descriptionHe" = 'צ''יאבטה, גבינות מעורבות, עגבנייה, סלט'
WHERE "name" = 'Toast 09';

UPDATE "MenuItem" SET
  "nameEn" = 'Toast 10', "nameFr" = 'Toast 10', "nameEs" = 'Tostada 10', "nameHe" = 'טוסט 10',
  "descriptionEn" = 'Bagel, smoked salmon, lettuce, cucumbers, pesto, mayonnaise',
  "descriptionFr" = 'Bagel, saumon fumé, laitue, concombres, pesto, mayonnaise',
  "descriptionEs" = 'Bagel, salmón ahumado, lechuga, pepinos, pesto, mayonesa',
  "descriptionHe" = 'בייגל, סלמון מעושן, חסה, מלפפונים, פסטו, מיונז'
WHERE "name" = 'Toast 10';

UPDATE "MenuItem" SET
  "nameEn" = 'Toast 11', "nameFr" = 'Toast 11', "nameEs" = 'Tostada 11', "nameHe" = 'טוסט 11',
  "descriptionEn" = 'Bagel, mozzarella, peppers, eggplant, mayonnaise, chimichurri',
  "descriptionFr" = 'Bagel, mozzarella, poivrons, aubergines, mayonnaise, chimichurri',
  "descriptionEs" = 'Bagel, mozzarella, pimientos, berenjena, mayonesa, chimichurri',
  "descriptionHe" = 'בייגל, מוצרלה, פלפלים, חציל, מיונז, צ''ימיצ''ורי'
WHERE "name" = 'Toast 11';

UPDATE "MenuItem" SET
  "nameEn" = 'Toast 12', "nameFr" = 'Toast 12', "nameEs" = 'Tostada 12', "nameHe" = 'טוסט 12',
  "descriptionEn" = 'Pita bread, tuna, zucchini, lettuce, chimichurri, mayonnaise',
  "descriptionFr" = 'Pain pita, thon, courgettes, laitue, chimichurri, mayonnaise',
  "descriptionEs" = 'Pan árabe, atún, calabacín, lechuga, chimichurri, mayonesa',
  "descriptionHe" = 'פיתה, טונה, קישוא, חסה, צ''ימיצ''ורי, מיונז'
WHERE "name" = 'Toast 12';

UPDATE "MenuItem" SET
  "nameEn" = 'Toast 13', "nameFr" = 'Toast 13', "nameEs" = 'Tostada 13', "nameHe" = 'טוסט 13',
  "descriptionEn" = 'Ciabatta, mozzarella, tomato, artichokes, mayonnaise',
  "descriptionFr" = 'Ciabatta, mozzarella, tomate, artichauts, mayonnaise',
  "descriptionEs" = 'Ciabatta, mozzarella, tomate, alcachofas, mayonesa',
  "descriptionHe" = 'צ''יאבטה, מוצרלה, עגבנייה, ארטישוק, מיונז'
WHERE "name" = 'Toast 13';

UPDATE "MenuItem" SET
  "nameEn" = 'Toast 15', "nameFr" = 'Toast 15', "nameEs" = 'Tostada 15', "nameHe" = 'טוסט 15',
  "descriptionEn" = 'Bagel, tomato, zucchini, eggplant, avocado, artichokes, mayonnaise',
  "descriptionFr" = 'Bagel, tomate, courgettes, aubergines, avocat, artichauts, mayonnaise',
  "descriptionEs" = 'Bagel, tomate, calabacín, berenjena, aguacate, alcachofas, mayonesa',
  "descriptionHe" = 'בייגל, עגבנייה, קישוא, חציל, אבוקדו, ארטישוק, מיונז'
WHERE "name" = 'Toast 15';

UPDATE "MenuItem" SET
  "nameEn" = 'Toast 16', "nameFr" = 'Toast 16', "nameEs" = 'Tostada 16', "nameHe" = 'טוסט 16',
  "descriptionEn" = 'Focaccia, smoked salmon, arugula, avocado, zucchini, pesto, mayonnaise',
  "descriptionFr" = 'Focaccia, saumon fumé, roquette, avocat, courgettes, pesto, mayonnaise',
  "descriptionEs" = 'Focaccia, salmón ahumado, rúcula, aguacate, calabacín, pesto, mayonesa',
  "descriptionHe" = 'פוקצ''ה, סלמון מעושן, רוקט, אבוקדו, קישוא, פסטו, מיונז'
WHERE "name" = 'Toast 16';

UPDATE "MenuItem" SET
  "nameEn" = 'Toast 17', "nameFr" = 'Toast 17', "nameEs" = 'Tostada 17', "nameHe" = 'טוסט 17',
  "descriptionEn" = 'Ciabatta, tuna, tomato, lettuce, onions, ketchup',
  "descriptionFr" = 'Ciabatta, thon, tomate, laitue, oignons, ketchup',
  "descriptionEs" = 'Ciabatta, atún, tomate, lechuga, cebollas, ketchup',
  "descriptionHe" = 'צ''יאבטה, טונה, עגבנייה, חסה, בצל, קטשופ'
WHERE "name" = 'Toast 17';

UPDATE "MenuItem" SET
  "nameEn" = 'Toast 18', "nameFr" = 'Toast 18', "nameEs" = 'Tostada 18', "nameHe" = 'טוסט 18',
  "descriptionEn" = 'Ciabatta, mixed cheeses, olive tapenade, arugula, eggplant, mayonnaise',
  "descriptionFr" = 'Ciabatta, fromages variés, tapenade d''olives, roquette, aubergines, mayonnaise',
  "descriptionEs" = 'Ciabatta, quesos mixtos, paté de aceitunas, rúcula, berenjena, mayonesa',
  "descriptionHe" = 'צ''יאבטה, גבינות מעורבות, טפנד זיתים, רוקט, חציל, מיונז'
WHERE "name" = 'Toast 18';

-- ============== SALAD ==============
UPDATE "MenuItem" SET
  "nameEn" = 'Salad 01', "nameFr" = 'Salade 01', "nameEs" = 'Ensalada 01', "nameHe" = 'סלט 01',
  "descriptionEn" = 'Salad, mozzarella balls, tomatoes, cucumbers, carrots, olives',
  "descriptionFr" = 'Salade, mozzarellines, tomates, concombres, carottes, olives',
  "descriptionEs" = 'Ensalada, bolitas de mozzarella, tomates, pepinos, zanahorias, aceitunas',
  "descriptionHe" = 'סלט, כדורי מוצרלה, עגבניות, מלפפונים, גזר, זיתים'
WHERE "name" = 'Salad 01';

UPDATE "MenuItem" SET
  "nameEn" = 'Salad 02', "nameFr" = 'Salade 02', "nameEs" = 'Ensalada 02', "nameHe" = 'סלט 02',
  "descriptionEn" = 'Salad, tuna, tomatoes, corn, olives, onions',
  "descriptionFr" = 'Salade, thon, tomates, maïs, olives, oignons',
  "descriptionEs" = 'Ensalada, atún, tomates, maíz, aceitunas, cebollas',
  "descriptionHe" = 'סלט, טונה, עגבניות, תירס, זיתים, בצל'
WHERE "name" = 'Salad 02';

UPDATE "MenuItem" SET
  "nameEn" = 'Salad 03', "nameFr" = 'Salade 03', "nameEs" = 'Ensalada 03', "nameHe" = 'סלט 03',
  "descriptionEn" = 'Salad, smoked salmon, avocado, tomatoes, olives',
  "descriptionFr" = 'Salade, saumon fumé, avocat, tomates, olives',
  "descriptionEs" = 'Ensalada, salmón ahumado, aguacate, tomates, aceitunas',
  "descriptionHe" = 'סלט, סלמון מעושן, אבוקדו, עגבניות, זיתים'
WHERE "name" = 'Salad 03';

UPDATE "MenuItem" SET
  "nameEn" = 'Salad 04', "nameFr" = 'Salade 04', "nameEs" = 'Ensalada 04', "nameHe" = 'סלט 04',
  "descriptionEn" = 'Salad, feta, arugula, tomatoes, cucumbers, eggplant, olives',
  "descriptionFr" = 'Salade, feta, roquette, tomates, concombres, aubergines, olives',
  "descriptionEs" = 'Ensalada, feta, rúcula, tomates, pepinos, berenjena, aceitunas',
  "descriptionHe" = 'סלט, פטה, רוקט, עגבניות, מלפפונים, חציל, זיתים'
WHERE "name" = 'Salad 04';

UPDATE "MenuItem" SET
  "nameEn" = 'Salad 05', "nameFr" = 'Salade 05', "nameEs" = 'Ensalada 05', "nameHe" = 'סלט 05',
  "descriptionEn" = 'Salad, grilled zucchini and eggplant, cucumbers, tomatoes, carrots, avocado, corn',
  "descriptionFr" = 'Salade, courgettes et aubergines grillées, concombres, tomates, carottes, avocat, maïs',
  "descriptionEs" = 'Ensalada, calabacín y berenjena a la parrilla, pepinos, tomates, zanahorias, aguacate, maíz',
  "descriptionHe" = 'סלט, קישוא וחציל צלויים, מלפפונים, עגבניות, גזר, אבוקדו, תירס'
WHERE "name" = 'Salad 05';

-- ============== PIADINA ==============
UPDATE "MenuItem" SET
  "nameEn" = 'Piadina 01', "nameFr" = 'Piadina 01', "nameEs" = 'Piadina 01', "nameHe" = 'פיאדינה 01',
  "descriptionEn" = 'Mozzarella, tomato, zucchini, mayonnaise',
  "descriptionFr" = 'Mozzarella, tomate, courgettes, mayonnaise',
  "descriptionEs" = 'Mozzarella, tomate, calabacín, mayonesa',
  "descriptionHe" = 'מוצרלה, עגבנייה, קישוא, מיונז'
WHERE "name" = 'Piadina 01';

UPDATE "MenuItem" SET
  "nameEn" = 'Piadina 02', "nameFr" = 'Piadina 02', "nameEs" = 'Piadina 02', "nameHe" = 'פיאדינה 02',
  "descriptionEn" = 'Mozzarella, tomato, pesto, arugula',
  "descriptionFr" = 'Mozzarella, tomate, pesto, roquette',
  "descriptionEs" = 'Mozzarella, tomate, pesto, rúcula',
  "descriptionHe" = 'מוצרלה, עגבנייה, פסטו, רוקט'
WHERE "name" = 'Piadina 02';

UPDATE "MenuItem" SET
  "nameEn" = 'Piadina 03', "nameFr" = 'Piadina 03', "nameEs" = 'Piadina 03', "nameHe" = 'פיאדינה 03',
  "descriptionEn" = 'Mixed cheeses, peppers, tomato, mayonnaise',
  "descriptionFr" = 'Fromages variés, poivrons, tomate, mayonnaise',
  "descriptionEs" = 'Quesos mixtos, pimientos, tomate, mayonesa',
  "descriptionHe" = 'גבינות מעורבות, פלפלים, עגבנייה, מיונז'
WHERE "name" = 'Piadina 03';

UPDATE "MenuItem" SET
  "nameEn" = 'Piadina 04', "nameFr" = 'Piadina 04', "nameEs" = 'Piadina 04', "nameHe" = 'פיאדינה 04',
  "descriptionEn" = 'Mozzarella, mixed cheeses, tomato, mushrooms, arugula',
  "descriptionFr" = 'Mozzarella, fromages variés, tomate, champignons, roquette',
  "descriptionEs" = 'Mozzarella, quesos mixtos, tomate, champiñones, rúcula',
  "descriptionHe" = 'מוצרלה, גבינות מעורבות, עגבנייה, פטריות, רוקט'
WHERE "name" = 'Piadina 04';

UPDATE "MenuItem" SET
  "nameEn" = 'Piadina 05', "nameFr" = 'Piadina 05', "nameEs" = 'Piadina 05', "nameHe" = 'פיאדינה 05',
  "descriptionEn" = 'Zucchini, eggplant, peppers, avocado, mushrooms, pesto',
  "descriptionFr" = 'Courgettes, aubergines, poivrons, avocat, champignons, pesto',
  "descriptionEs" = 'Calabacín, berenjena, pimientos, aguacate, champiñones, pesto',
  "descriptionHe" = 'קישוא, חציל, פלפלים, אבוקדו, פטריות, פסטו'
WHERE "name" = 'Piadina 05';

-- ============== AFFUMICATO ==============
UPDATE "MenuItem" SET
  "nameEn" = 'Smoked Salmon Plate', "nameFr" = 'Assiette de Saumon Fumé', "nameEs" = 'Plato de Salmón Ahumado', "nameHe" = 'צלחת סלמון מעושן',
  "descriptionEn" = 'Smoked salmon, tomatoes, zucchini, avocado, arugula, corn',
  "descriptionFr" = 'Saumon fumé, tomates, courgettes, avocat, roquette, maïs',
  "descriptionEs" = 'Salmón ahumado, tomates, calabacín, aguacate, rúcula, maíz',
  "descriptionHe" = 'סלמון מעושן, עגבניות, קישוא, אבוקדו, רוקט, תירס'
WHERE "name" = 'Piatto Affumicato';

-- ============== CAPRESE ==============
UPDATE "MenuItem" SET
  "nameEn" = 'Caprese 01', "nameFr" = 'Caprese 01', "nameEs" = 'Caprese 01', "nameHe" = 'קפרזה 01',
  "descriptionEn" = 'Mozzarella, tomato, arugula, zucchini, pesto',
  "descriptionFr" = 'Mozzarella, tomate, roquette, courgettes, pesto',
  "descriptionEs" = 'Mozzarella, tomate, rúcula, calabacín, pesto',
  "descriptionHe" = 'מוצרלה, עגבנייה, רוקט, קישוא, פסטו'
WHERE "name" = 'Caprese 01';

UPDATE "MenuItem" SET
  "nameEn" = 'Caprese 02', "nameFr" = 'Caprese 02', "nameEs" = 'Caprese 02', "nameHe" = 'קפרזה 02',
  "descriptionEn" = 'Tuna, arugula, tomato, zucchini, eggplant, carrots, avocado',
  "descriptionFr" = 'Thon, roquette, tomate, courgettes, aubergines, carottes, avocat',
  "descriptionEs" = 'Atún, rúcula, tomate, calabacín, berenjena, zanahorias, aguacate',
  "descriptionHe" = 'טונה, רוקט, עגבנייה, קישוא, חציל, גזר, אבוקדו'
WHERE "name" = 'Caprese 02';

-- ============== BRUSCHETTA ==============
UPDATE "MenuItem" SET
  "nameEn" = 'Bruschetta 01', "nameFr" = 'Bruschetta 01', "nameEs" = 'Bruschetta 01', "nameHe" = 'ברוסקטה 01',
  "descriptionEn" = 'Toasted bread, tomato, pesto/chimichurri',
  "descriptionFr" = 'Pain grillé, tomate, pesto/chimichurri',
  "descriptionEs" = 'Pan tostado, tomate, pesto/chimichurri',
  "descriptionHe" = 'לחם קלוי, עגבנייה, פסטו/צ''ימיצ''ורי'
WHERE "name" = 'Bruschetta 01';

UPDATE "MenuItem" SET
  "nameEn" = 'Bruschetta 02', "nameFr" = 'Bruschetta 02', "nameEs" = 'Bruschetta 02', "nameHe" = 'ברוסקטה 02',
  "descriptionEn" = 'Toasted bread, tomato, pesto/chimichurri, mozzarella',
  "descriptionFr" = 'Pain grillé, tomate, pesto/chimichurri, mozzarella',
  "descriptionEs" = 'Pan tostado, tomate, pesto/chimichurri, mozzarella',
  "descriptionHe" = 'לחם קלוי, עגבנייה, פסטו/צ''ימיצ''ורי, מוצרלה'
WHERE "name" = 'Bruschetta 02';

-- ============== PIZZA E FOCACCIA ==============
UPDATE "MenuItem" SET
  "nameEn" = 'Margherita Pizza', "nameFr" = 'Pizza Margherita', "nameEs" = 'Pizza Margherita', "nameHe" = 'פיצה מרגריטה',
  "descriptionEn" = 'Pizza, mozzarella, tomato',
  "descriptionFr" = 'Pizza, mozzarella, tomate',
  "descriptionEs" = 'Pizza, mozzarella, tomate',
  "descriptionHe" = 'פיצה, מוצרלה, עגבנייה'
WHERE "name" = 'Pizza Margherita';

UPDATE "MenuItem" SET
  "nameEn" = 'Focaccia', "nameFr" = 'Focaccia', "nameEs" = 'Focaccia', "nameHe" = 'פוקצ''ה',
  "descriptionEn" = 'Focaccia, mozzarella',
  "descriptionFr" = 'Focaccia, mozzarella',
  "descriptionEs" = 'Focaccia, mozzarella',
  "descriptionHe" = 'פוקצ''ה, מוצרלה'
WHERE "name" = 'Focaccia';

-- ============== BEVANDE ==============
UPDATE "MenuItem" SET
  "nameEn" = 'Water', "nameFr" = 'Eau', "nameEs" = 'Agua', "nameHe" = 'מים'
WHERE "name" = 'Acqua';

UPDATE "MenuItem" SET
  "nameHe" = 'קוקה קולה / פאנטה / ספרייט / נסטי / אסטתה'
WHERE "name" = 'Coca Cola / Fanta / Sprite / Nestea / Estathe';

UPDATE "MenuItem" SET
  "nameEn" = 'Fresh Orange Juice', "nameFr" = 'Jus d''orange pressé', "nameEs" = 'Zumo de naranja natural', "nameHe" = 'מיץ תפוזים סחוט',
  "descriptionEn" = 'Freshly squeezed orange juice',
  "descriptionFr" = 'Jus d''orange fraîchement pressé',
  "descriptionEs" = 'Zumo de naranja recién exprimido',
  "descriptionHe" = 'מיץ תפוזים סחוט טרי'
WHERE "name" = 'Spremuta Arancia';

UPDATE "MenuItem" SET
  "nameEn" = 'Fruit Juices', "nameFr" = 'Jus de fruits', "nameEs" = 'Zumos de frutas', "nameHe" = 'מיצי פירות'
WHERE "name" = 'Succhi di frutta';

UPDATE "MenuItem" SET
  "nameEn" = 'Tonic Water / Ginger Ale / Lemon Soda', "nameFr" = 'Eau tonique / Ginger Ale / Limonade', "nameEs" = 'Agua tónica / Ginger Ale / Limonada', "nameHe" = 'מי טוניק / ג''ינג''ר אייל / לימונדה'
WHERE "name" = 'Acqua tonica / Ginger Ale / Lemon Soda';

UPDATE "MenuItem" SET
  "nameEn" = 'Beer 33cl', "nameFr" = 'Bière 33cl', "nameEs" = 'Cerveza 33cl', "nameHe" = 'בירה 33 מ"ל'
WHERE "name" = 'Birra 33cl';

UPDATE "MenuItem" SET
  "nameEn" = 'Glass of wine', "nameFr" = 'Verre de vin', "nameEs" = 'Copa de vino', "nameHe" = 'כוס יין'
WHERE "name" = 'Bicchiere di vino';

-- ============== CAFFETTERIA ==============
UPDATE "MenuItem" SET
  "nameFr" = 'Affogato au café', "nameEs" = 'Affogato al café', "nameHe" = 'אפוגטו קפה',
  "descriptionEn" = 'One scoop of your choice',
  "descriptionFr" = 'Une boule au choix',
  "descriptionEs" = 'Una bola a elegir',
  "descriptionHe" = 'כדור גלידה לבחירה'
WHERE "name" = 'Affogato al caffè';

UPDATE "MenuItem" SET
  "nameEn" = 'Hot Chocolate', "nameFr" = 'Chocolat chaud', "nameEs" = 'Chocolate caliente', "nameHe" = 'שוקו חם'
WHERE "name" = 'Cioccolata calda';

UPDATE "MenuItem" SET
  "nameHe" = 'קרפ',
  "descriptionEn" = 'Crêpe with topping of your choice',
  "descriptionFr" = 'Crêpe avec garniture au choix',
  "descriptionEs" = 'Crêpe con topping a elegir',
  "descriptionHe" = 'קרפ עם תוספת לבחירה'
WHERE "name" = 'Crêpe';

UPDATE "MenuItem" SET
  "nameEn" = 'Ice Cream Cup', "nameFr" = 'Coupe de Glace', "nameEs" = 'Copa de Helado', "nameHe" = 'גביע גלידה'
WHERE "name" = 'Coppa Gelato';

UPDATE "MenuItem" SET
  "nameFr" = 'Spécial MyKafe', "nameEs" = 'Especial MyKafe', "nameHe" = 'מיוחד MyKafe',
  "descriptionEn" = 'Our specialty',
  "descriptionFr" = 'Notre spécialité',
  "descriptionEs" = 'Nuestra especialidad',
  "descriptionHe" = 'המיוחד שלנו'
WHERE "name" = 'MyKafe Special';

UPDATE "MenuItem" SET
  "nameEn" = 'Iced Chocolate/Coffee', "nameFr" = 'Chocolat/Café glacé', "nameEs" = 'Chocolate/Café helado', "nameHe" = 'שוקו/קפה קר'
WHERE "name" = 'Ice Chocolate/Caffè';

UPDATE "MenuItem" SET
  "nameEs" = 'Batido', "nameHe" = 'מילקשייק'
WHERE "name" = 'Milkshake';

UPDATE "MenuItem" SET
  "nameFr" = 'Cocktail glacé', "nameEs" = 'Cóctel helado', "nameHe" = 'קוקטייל קפוא'
WHERE "name" = 'Frozen Cocktail';

-- ============== MODIFIER GROUPS ==============
UPDATE "ModifierGroup" SET
  "nameEn" = 'Extra ingredients',
  "nameFr" = 'Ingrédients supplémentaires',
  "nameEs" = 'Ingredientes extra',
  "nameHe" = 'תוספות'
WHERE "name" = 'Extra ingredienti';

UPDATE "ModifierGroup" SET
  "nameHe" = 'תוספות'
WHERE "name" = 'Extra';

-- ============== MODIFIERS ==============
UPDATE "Modifier" SET "nameEn" = 'Switch to focaccia', "nameFr" = 'Variante focaccia', "nameEs" = 'Cambiar a focaccia', "nameHe" = 'החלף לפוקצ''ה' WHERE "name" = 'Variazione a focaccia';
UPDATE "Modifier" SET "nameHe" = '+ מוצרלה' WHERE "name" = '+ Mozzarella';
UPDATE "Modifier" SET "nameEn" = '+ Tuna', "nameFr" = '+ Thon', "nameEs" = '+ Atún', "nameHe" = '+ טונה' WHERE "name" = '+ Tonno';
UPDATE "Modifier" SET "nameFr" = '+ Avocat', "nameEs" = '+ Aguacate', "nameHe" = '+ אבוקדו' WHERE "name" = '+ Avocado';
UPDATE "Modifier" SET "nameHe" = '+ פסטו' WHERE "name" = '+ Pesto';
UPDATE "Modifier" SET "nameEn" = '+ Olive tapenade', "nameFr" = '+ Tapenade d''olives', "nameEs" = '+ Paté de aceitunas', "nameHe" = '+ טפנד זיתים' WHERE "name" = '+ Patè di olive';
UPDATE "Modifier" SET "nameEn" = '+ Artichokes', "nameFr" = '+ Artichauts', "nameEs" = '+ Alcachofas', "nameHe" = '+ ארטישוק' WHERE "name" = '+ Carciofi';
UPDATE "Modifier" SET "nameEn" = '+ Mixed vegetables', "nameFr" = '+ Légumes variés', "nameEs" = '+ Verduras variadas', "nameHe" = '+ ירקות מעורבים' WHERE "name" = '+ Verdure varie';
UPDATE "Modifier" SET "nameEn" = '+ Smoked salmon', "nameFr" = '+ Saumon fumé', "nameEs" = '+ Salmón ahumado', "nameHe" = '+ סלמון מעושן' WHERE "name" = '+ Salmone affumicato';
UPDATE "Modifier" SET "nameEn" = '+ Whipped cream', "nameFr" = '+ Crème chantilly', "nameEs" = '+ Nata montada', "nameHe" = '+ קצפת' WHERE "name" = '+ Panna';
UPDATE "Modifier" SET "nameEn" = '+ Ice cream scoop', "nameFr" = '+ Boule de glace', "nameEs" = '+ Bola de helado', "nameHe" = '+ כדור גלידה' WHERE "name" = '+ Pallina di gelato';

-- Verifica le traduzioni
SELECT 'Categories:', COUNT(*) as total,
       COUNT("nameEn") as with_en,
       COUNT("nameFr") as with_fr,
       COUNT("nameEs") as with_es,
       COUNT("nameHe") as with_he
FROM "Category";

SELECT 'MenuItems:', COUNT(*) as total,
       COUNT("nameEn") as with_en,
       COUNT("nameFr") as with_fr,
       COUNT("nameEs") as with_es,
       COUNT("nameHe") as with_he
FROM "MenuItem";

SELECT 'ModifierGroups:', COUNT(*) as total,
       COUNT("nameEn") as with_en,
       COUNT("nameFr") as with_fr,
       COUNT("nameEs") as with_es,
       COUNT("nameHe") as with_he
FROM "ModifierGroup";

SELECT 'Modifiers:', COUNT(*) as total,
       COUNT("nameEn") as with_en,
       COUNT("nameFr") as with_fr,
       COUNT("nameEs") as with_es,
       COUNT("nameHe") as with_he
FROM "Modifier";
