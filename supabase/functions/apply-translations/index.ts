import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Translations data
const categoryTranslations = [
  { name: 'Toast', nameEn: 'Toast', nameFr: 'Toast', nameEs: 'Tostada', nameHe: 'טוסט', descriptionEn: 'Each toast is served with a side salad', descriptionFr: 'Chaque toast est servi avec une salade d\'accompagnement', descriptionEs: 'Cada tostada se sirve con ensalada de acompañamiento', descriptionHe: 'כל טוסט מוגש עם סלט צד' },
  { name: 'Salad', nameEn: 'Salad', nameFr: 'Salade', nameEs: 'Ensalada', nameHe: 'סלט', descriptionEn: 'Fresh and genuine salads', descriptionFr: 'Salades fraîches et authentiques', descriptionEs: 'Ensaladas frescas y genuinas', descriptionHe: 'סלטים טריים ואותנטיים' },
  { name: 'Piadina', nameEn: 'Piadina', nameFr: 'Piadina', nameEs: 'Piadina', nameHe: 'פיאדינה', descriptionEn: 'Piadinas stuffed with fresh ingredients', descriptionFr: 'Piadines garnies d\'ingrédients frais', descriptionEs: 'Piadinas rellenas con ingredientes frescos', descriptionHe: 'פיאדינות ממולאות במרכיבים טריים' },
  { name: 'Affumicato', nameEn: 'Smoked', nameFr: 'Fumé', nameEs: 'Ahumado', nameHe: 'מעושן', descriptionEn: 'Specialties with smoked salmon', descriptionFr: 'Spécialités au saumon fumé', descriptionEs: 'Especialidades con salmón ahumado', descriptionHe: 'מיוחדים עם סלמון מעושן' },
  { name: 'Caprese', nameEn: 'Caprese', nameFr: 'Caprese', nameEs: 'Caprese', nameHe: 'קפרזה', descriptionEn: 'Our caprese dishes', descriptionFr: 'Nos capreses', descriptionEs: 'Nuestras capresas', descriptionHe: 'מנות הקפרזה שלנו' },
  { name: 'Bruschetta', nameEn: 'Bruschetta', nameFr: 'Bruschetta', nameEs: 'Bruschetta', nameHe: 'ברוסקטה', descriptionEn: 'Traditional bruschettas', descriptionFr: 'Bruschettas traditionnelles', descriptionEs: 'Bruschettas tradicionales', descriptionHe: 'ברוסקטות מסורתיות' },
  { name: 'Pizza e Focaccia', nameEn: 'Pizza and Focaccia', nameFr: 'Pizza et Focaccia', nameEs: 'Pizza y Focaccia', nameHe: 'פיצה ופוקצ\'ה', descriptionEn: 'Homemade pizza and focaccia', descriptionFr: 'Pizza et focaccia faites maison', descriptionEs: 'Pizza y focaccia caseras', descriptionHe: 'פיצה ופוקצ\'ה ביתיות' },
  { name: 'Bevande', nameEn: 'Beverages', nameFr: 'Boissons', nameEs: 'Bebidas', nameHe: 'משקאות', descriptionEn: 'Fresh beverages', descriptionFr: 'Boissons fraîches', descriptionEs: 'Bebidas frescas', descriptionHe: 'משקאות קרים' },
  { name: 'Caffetteria', nameEn: 'Coffee Shop', nameFr: 'Café', nameEs: 'Cafetería', nameHe: 'בית קפה', descriptionEn: 'Sweets and hot beverages', descriptionFr: 'Desserts et boissons chaudes', descriptionEs: 'Dulces y bebidas calientes', descriptionHe: 'קינוחים ומשקאות חמים' },
]

const menuItemTranslations = [
  // Toast
  { name: 'Toast 01', nameEn: 'Toast 01', nameFr: 'Toast 01', nameEs: 'Tostada 01', nameHe: 'טוסט 01', descriptionEn: 'Ciabatta, mozzarella, tomato, arugula', descriptionFr: 'Ciabatta, mozzarella, tomate, roquette', descriptionEs: 'Ciabatta, mozzarella, tomate, rúcula', descriptionHe: 'צ\'יאבטה, מוצרלה, עגבנייה, רוקט' },
  { name: 'Toast 02', nameEn: 'Toast 02', nameFr: 'Toast 02', nameEs: 'Tostada 02', nameHe: 'טוסט 02', descriptionEn: 'Bagel, mozzarella, zucchini, tomato', descriptionFr: 'Bagel, mozzarella, courgettes, tomate', descriptionEs: 'Bagel, mozzarella, calabacín, tomate', descriptionHe: 'בייגל, מוצרלה, קישוא, עגבנייה' },
  { name: 'Toast 03', nameEn: 'Toast 03', nameFr: 'Toast 03', nameEs: 'Tostada 03', nameHe: 'טוסט 03', descriptionEn: 'Pita bread, mozzarella, eggplant, tomato, mayonnaise', descriptionFr: 'Pain pita, mozzarella, aubergines, tomate, mayonnaise', descriptionEs: 'Pan árabe, mozzarella, berenjena, tomate, mayonesa', descriptionHe: 'פיתה, מוצרלה, חציל, עגבנייה, מיונז' },
  { name: 'Toast 04', nameEn: 'Toast 04', nameFr: 'Toast 04', nameEs: 'Tostada 04', nameHe: 'טוסט 04', descriptionEn: 'Bagel, tuna, tomato, onion, arugula, mayonnaise', descriptionFr: 'Bagel, thon, tomate, oignon, roquette, mayonnaise', descriptionEs: 'Bagel, atún, tomate, cebolla, rúcula, mayonesa', descriptionHe: 'בייגל, טונה, עגבנייה, בצל, רוקט, מיונז' },
  { name: 'Toast 05', nameEn: 'Toast 05', nameFr: 'Toast 05', nameEs: 'Tostada 05', nameHe: 'טוסט 05', descriptionEn: 'Bagel, smoked salmon, tomato, arugula, mayonnaise', descriptionFr: 'Bagel, saumon fumé, tomate, roquette, mayonnaise', descriptionEs: 'Bagel, salmón ahumado, tomate, rúcula, mayonesa', descriptionHe: 'בייגל, סלמון מעושן, עגבנייה, רוקט, מיונז' },
  { name: 'Toast 06', nameEn: 'Toast 06', nameFr: 'Toast 06', nameEs: 'Tostada 06', nameHe: 'טוסט 06', descriptionEn: 'Focaccia, mozzarella, tomato, eggplant, zucchini', descriptionFr: 'Focaccia, mozzarella, tomate, aubergines, courgettes', descriptionEs: 'Focaccia, mozzarella, tomate, berenjena, calabacín', descriptionHe: 'פוקצ\'ה, מוצרלה, עגבנייה, חציל, קישוא' },
  { name: 'Toast 07', nameEn: 'Toast 07', nameFr: 'Toast 07', nameEs: 'Tostada 07', nameHe: 'טוסט 07', descriptionEn: 'Bagel, mozzarella, tomato, pesto, arugula', descriptionFr: 'Bagel, mozzarella, tomate, pesto, roquette', descriptionEs: 'Bagel, mozzarella, tomate, pesto, rúcula', descriptionHe: 'בייגל, מוצרלה, עגבנייה, פסטו, רוקט' },
  { name: 'Toast 08', nameEn: 'Toast 08', nameFr: 'Toast 08', nameEs: 'Tostada 08', nameHe: 'טוסט 08', descriptionEn: 'Pita bread, mozzarella, mushrooms, oregano, tomato, salad', descriptionFr: 'Pain pita, mozzarella, champignons, origan, tomate, salade', descriptionEs: 'Pan árabe, mozzarella, champiñones, orégano, tomate, ensalada', descriptionHe: 'פיתה, מוצרלה, פטריות, אורגנו, עגבנייה, סלט' },
  { name: 'Toast 09', nameEn: 'Toast 09', nameFr: 'Toast 09', nameEs: 'Tostada 09', nameHe: 'טוסט 09', descriptionEn: 'Ciabatta, mixed cheeses, tomato, salad', descriptionFr: 'Ciabatta, fromages variés, tomate, salade', descriptionEs: 'Ciabatta, quesos mixtos, tomate, ensalada', descriptionHe: 'צ\'יאבטה, גבינות מעורבות, עגבנייה, סלט' },
  { name: 'Toast 10', nameEn: 'Toast 10', nameFr: 'Toast 10', nameEs: 'Tostada 10', nameHe: 'טוסט 10', descriptionEn: 'Bagel, smoked salmon, lettuce, cucumbers, pesto, mayonnaise', descriptionFr: 'Bagel, saumon fumé, laitue, concombres, pesto, mayonnaise', descriptionEs: 'Bagel, salmón ahumado, lechuga, pepinos, pesto, mayonesa', descriptionHe: 'בייגל, סלמון מעושן, חסה, מלפפונים, פסטו, מיונז' },
  { name: 'Toast 11', nameEn: 'Toast 11', nameFr: 'Toast 11', nameEs: 'Tostada 11', nameHe: 'טוסט 11', descriptionEn: 'Bagel, mozzarella, peppers, eggplant, mayonnaise, chimichurri', descriptionFr: 'Bagel, mozzarella, poivrons, aubergines, mayonnaise, chimichurri', descriptionEs: 'Bagel, mozzarella, pimientos, berenjena, mayonesa, chimichurri', descriptionHe: 'בייגל, מוצרלה, פלפלים, חציל, מיונז, צ\'ימיצ\'ורי' },
  { name: 'Toast 12', nameEn: 'Toast 12', nameFr: 'Toast 12', nameEs: 'Tostada 12', nameHe: 'טוסט 12', descriptionEn: 'Pita bread, tuna, zucchini, lettuce, chimichurri, mayonnaise', descriptionFr: 'Pain pita, thon, courgettes, laitue, chimichurri, mayonnaise', descriptionEs: 'Pan árabe, atún, calabacín, lechuga, chimichurri, mayonesa', descriptionHe: 'פיתה, טונה, קישוא, חסה, צ\'ימיצ\'ורי, מיונז' },
  { name: 'Toast 13', nameEn: 'Toast 13', nameFr: 'Toast 13', nameEs: 'Tostada 13', nameHe: 'טוסט 13', descriptionEn: 'Ciabatta, mozzarella, tomato, artichokes, mayonnaise', descriptionFr: 'Ciabatta, mozzarella, tomate, artichauts, mayonnaise', descriptionEs: 'Ciabatta, mozzarella, tomate, alcachofas, mayonesa', descriptionHe: 'צ\'יאבטה, מוצרלה, עגבנייה, ארטישוק, מיונז' },
  { name: 'Toast 15', nameEn: 'Toast 15', nameFr: 'Toast 15', nameEs: 'Tostada 15', nameHe: 'טוסט 15', descriptionEn: 'Bagel, tomato, zucchini, eggplant, avocado, artichokes, mayonnaise', descriptionFr: 'Bagel, tomate, courgettes, aubergines, avocat, artichauts, mayonnaise', descriptionEs: 'Bagel, tomate, calabacín, berenjena, aguacate, alcachofas, mayonesa', descriptionHe: 'בייגל, עגבנייה, קישוא, חציל, אבוקדו, ארטישוק, מיונז' },
  { name: 'Toast 16', nameEn: 'Toast 16', nameFr: 'Toast 16', nameEs: 'Tostada 16', nameHe: 'טוסט 16', descriptionEn: 'Focaccia, smoked salmon, arugula, avocado, zucchini, pesto, mayonnaise', descriptionFr: 'Focaccia, saumon fumé, roquette, avocat, courgettes, pesto, mayonnaise', descriptionEs: 'Focaccia, salmón ahumado, rúcula, aguacate, calabacín, pesto, mayonesa', descriptionHe: 'פוקצ\'ה, סלמון מעושן, רוקט, אבוקדו, קישוא, פסטו, מיונז' },
  { name: 'Toast 17', nameEn: 'Toast 17', nameFr: 'Toast 17', nameEs: 'Tostada 17', nameHe: 'טוסט 17', descriptionEn: 'Ciabatta, tuna, tomato, lettuce, onions, ketchup', descriptionFr: 'Ciabatta, thon, tomate, laitue, oignons, ketchup', descriptionEs: 'Ciabatta, atún, tomate, lechuga, cebollas, ketchup', descriptionHe: 'צ\'יאבטה, טונה, עגבנייה, חסה, בצל, קטשופ' },
  { name: 'Toast 18', nameEn: 'Toast 18', nameFr: 'Toast 18', nameEs: 'Tostada 18', nameHe: 'טוסט 18', descriptionEn: 'Ciabatta, mixed cheeses, olive tapenade, arugula, eggplant, mayonnaise', descriptionFr: 'Ciabatta, fromages variés, tapenade d\'olives, roquette, aubergines, mayonnaise', descriptionEs: 'Ciabatta, quesos mixtos, paté de aceitunas, rúcula, berenjena, mayonesa', descriptionHe: 'צ\'יאבטה, גבינות מעורבות, טפנד זיתים, רוקט, חציל, מיונז' },
  // Salad
  { name: 'Salad 01', nameEn: 'Salad 01', nameFr: 'Salade 01', nameEs: 'Ensalada 01', nameHe: 'סלט 01', descriptionEn: 'Salad, mozzarella balls, tomatoes, cucumbers, carrots, olives', descriptionFr: 'Salade, mozzarellines, tomates, concombres, carottes, olives', descriptionEs: 'Ensalada, bolitas de mozzarella, tomates, pepinos, zanahorias, aceitunas', descriptionHe: 'סלט, כדורי מוצרלה, עגבניות, מלפפונים, גזר, זיתים' },
  { name: 'Salad 02', nameEn: 'Salad 02', nameFr: 'Salade 02', nameEs: 'Ensalada 02', nameHe: 'סלט 02', descriptionEn: 'Salad, tuna, tomatoes, corn, olives, onions', descriptionFr: 'Salade, thon, tomates, maïs, olives, oignons', descriptionEs: 'Ensalada, atún, tomates, maíz, aceitunas, cebollas', descriptionHe: 'סלט, טונה, עגבניות, תירס, זיתים, בצל' },
  { name: 'Salad 03', nameEn: 'Salad 03', nameFr: 'Salade 03', nameEs: 'Ensalada 03', nameHe: 'סלט 03', descriptionEn: 'Salad, smoked salmon, avocado, tomatoes, olives', descriptionFr: 'Salade, saumon fumé, avocat, tomates, olives', descriptionEs: 'Ensalada, salmón ahumado, aguacate, tomates, aceitunas', descriptionHe: 'סלט, סלמון מעושן, אבוקדו, עגבניות, זיתים' },
  { name: 'Salad 04', nameEn: 'Salad 04', nameFr: 'Salade 04', nameEs: 'Ensalada 04', nameHe: 'סלט 04', descriptionEn: 'Salad, feta, arugula, tomatoes, cucumbers, eggplant, olives', descriptionFr: 'Salade, feta, roquette, tomates, concombres, aubergines, olives', descriptionEs: 'Ensalada, feta, rúcula, tomates, pepinos, berenjena, aceitunas', descriptionHe: 'סלט, פטה, רוקט, עגבניות, מלפפונים, חציל, זיתים' },
  { name: 'Salad 05', nameEn: 'Salad 05', nameFr: 'Salade 05', nameEs: 'Ensalada 05', nameHe: 'סלט 05', descriptionEn: 'Salad, grilled zucchini and eggplant, cucumbers, tomatoes, carrots, avocado, corn', descriptionFr: 'Salade, courgettes et aubergines grillées, concombres, tomates, carottes, avocat, maïs', descriptionEs: 'Ensalada, calabacín y berenjena a la parrilla, pepinos, tomates, zanahorias, aguacate, maíz', descriptionHe: 'סלט, קישוא וחציל צלויים, מלפפונים, עגבניות, גזר, אבוקדו, תירס' },
  // Piadina
  { name: 'Piadina 01', nameEn: 'Piadina 01', nameFr: 'Piadina 01', nameEs: 'Piadina 01', nameHe: 'פיאדינה 01', descriptionEn: 'Mozzarella, tomato, zucchini, mayonnaise', descriptionFr: 'Mozzarella, tomate, courgettes, mayonnaise', descriptionEs: 'Mozzarella, tomate, calabacín, mayonesa', descriptionHe: 'מוצרלה, עגבנייה, קישוא, מיונז' },
  { name: 'Piadina 02', nameEn: 'Piadina 02', nameFr: 'Piadina 02', nameEs: 'Piadina 02', nameHe: 'פיאדינה 02', descriptionEn: 'Mozzarella, tomato, pesto, arugula', descriptionFr: 'Mozzarella, tomate, pesto, roquette', descriptionEs: 'Mozzarella, tomate, pesto, rúcula', descriptionHe: 'מוצרלה, עגבנייה, פסטו, רוקט' },
  { name: 'Piadina 03', nameEn: 'Piadina 03', nameFr: 'Piadina 03', nameEs: 'Piadina 03', nameHe: 'פיאדינה 03', descriptionEn: 'Mixed cheeses, peppers, tomato, mayonnaise', descriptionFr: 'Fromages variés, poivrons, tomate, mayonnaise', descriptionEs: 'Quesos mixtos, pimientos, tomate, mayonesa', descriptionHe: 'גבינות מעורבות, פלפלים, עגבנייה, מיונז' },
  { name: 'Piadina 04', nameEn: 'Piadina 04', nameFr: 'Piadina 04', nameEs: 'Piadina 04', nameHe: 'פיאדינה 04', descriptionEn: 'Mozzarella, mixed cheeses, tomato, mushrooms, arugula', descriptionFr: 'Mozzarella, fromages variés, tomate, champignons, roquette', descriptionEs: 'Mozzarella, quesos mixtos, tomate, champiñones, rúcula', descriptionHe: 'מוצרלה, גבינות מעורבות, עגבנייה, פטריות, רוקט' },
  { name: 'Piadina 05', nameEn: 'Piadina 05', nameFr: 'Piadina 05', nameEs: 'Piadina 05', nameHe: 'פיאדינה 05', descriptionEn: 'Zucchini, eggplant, peppers, avocado, mushrooms, pesto', descriptionFr: 'Courgettes, aubergines, poivrons, avocat, champignons, pesto', descriptionEs: 'Calabacín, berenjena, pimientos, aguacate, champiñones, pesto', descriptionHe: 'קישוא, חציל, פלפלים, אבוקדו, פטריות, פסטו' },
  // Affumicato
  { name: 'Piatto Affumicato', nameEn: 'Smoked Salmon Plate', nameFr: 'Assiette de Saumon Fumé', nameEs: 'Plato de Salmón Ahumado', nameHe: 'צלחת סלמון מעושן', descriptionEn: 'Smoked salmon, tomatoes, zucchini, avocado, arugula, corn', descriptionFr: 'Saumon fumé, tomates, courgettes, avocat, roquette, maïs', descriptionEs: 'Salmón ahumado, tomates, calabacín, aguacate, rúcula, maíz', descriptionHe: 'סלמון מעושן, עגבניות, קישוא, אבוקדו, רוקט, תירס' },
  // Caprese
  { name: 'Caprese 01', nameEn: 'Caprese 01', nameFr: 'Caprese 01', nameEs: 'Caprese 01', nameHe: 'קפרזה 01', descriptionEn: 'Mozzarella, tomato, arugula, zucchini, pesto', descriptionFr: 'Mozzarella, tomate, roquette, courgettes, pesto', descriptionEs: 'Mozzarella, tomate, rúcula, calabacín, pesto', descriptionHe: 'מוצרלה, עגבנייה, רוקט, קישוא, פסטו' },
  { name: 'Caprese 02', nameEn: 'Caprese 02', nameFr: 'Caprese 02', nameEs: 'Caprese 02', nameHe: 'קפרזה 02', descriptionEn: 'Tuna, arugula, tomato, zucchini, eggplant, carrots, avocado', descriptionFr: 'Thon, roquette, tomate, courgettes, aubergines, carottes, avocat', descriptionEs: 'Atún, rúcula, tomate, calabacín, berenjena, zanahorias, aguacate', descriptionHe: 'טונה, רוקט, עגבנייה, קישוא, חציל, גזר, אבוקדו' },
  // Bruschetta
  { name: 'Bruschetta 01', nameEn: 'Bruschetta 01', nameFr: 'Bruschetta 01', nameEs: 'Bruschetta 01', nameHe: 'ברוסקטה 01', descriptionEn: 'Toasted bread, tomato, pesto/chimichurri', descriptionFr: 'Pain grillé, tomate, pesto/chimichurri', descriptionEs: 'Pan tostado, tomate, pesto/chimichurri', descriptionHe: 'לחם קלוי, עגבנייה, פסטו/צ\'ימיצ\'ורי' },
  { name: 'Bruschetta 02', nameEn: 'Bruschetta 02', nameFr: 'Bruschetta 02', nameEs: 'Bruschetta 02', nameHe: 'ברוסקטה 02', descriptionEn: 'Toasted bread, tomato, pesto/chimichurri, mozzarella', descriptionFr: 'Pain grillé, tomate, pesto/chimichurri, mozzarella', descriptionEs: 'Pan tostado, tomate, pesto/chimichurri, mozzarella', descriptionHe: 'לחם קלוי, עגבנייה, פסטו/צ\'ימיצ\'ורי, מוצרלה' },
  // Pizza
  { name: 'Pizza Margherita', nameEn: 'Margherita Pizza', nameFr: 'Pizza Margherita', nameEs: 'Pizza Margherita', nameHe: 'פיצה מרגריטה', descriptionEn: 'Pizza, mozzarella, tomato', descriptionFr: 'Pizza, mozzarella, tomate', descriptionEs: 'Pizza, mozzarella, tomate', descriptionHe: 'פיצה, מוצרלה, עגבנייה' },
  { name: 'Focaccia', nameEn: 'Focaccia', nameFr: 'Focaccia', nameEs: 'Focaccia', nameHe: 'פוקצ\'ה', descriptionEn: 'Focaccia, mozzarella', descriptionFr: 'Focaccia, mozzarella', descriptionEs: 'Focaccia, mozzarella', descriptionHe: 'פוקצ\'ה, מוצרלה' },
  // Bevande
  { name: 'Acqua', nameEn: 'Water', nameFr: 'Eau', nameEs: 'Agua', nameHe: 'מים' },
  { name: 'Coca Cola / Fanta / Sprite / Nestea / Estathe', nameHe: 'קוקה קולה / פאנטה / ספרייט / נסטי / אסטתה' },
  { name: 'Spremuta Arancia', nameEn: 'Fresh Orange Juice', nameFr: 'Jus d\'orange pressé', nameEs: 'Zumo de naranja natural', nameHe: 'מיץ תפוזים סחוט', descriptionEn: 'Freshly squeezed orange juice', descriptionFr: 'Jus d\'orange fraîchement pressé', descriptionEs: 'Zumo de naranja recién exprimido', descriptionHe: 'מיץ תפוזים סחוט טרי' },
  { name: 'Succhi di frutta', nameEn: 'Fruit Juices', nameFr: 'Jus de fruits', nameEs: 'Zumos de frutas', nameHe: 'מיצי פירות' },
  { name: 'Acqua tonica / Ginger Ale / Lemon Soda', nameEn: 'Tonic Water / Ginger Ale / Lemon Soda', nameFr: 'Eau tonique / Ginger Ale / Limonade', nameEs: 'Agua tónica / Ginger Ale / Limonada', nameHe: 'מי טוניק / ג\'ינג\'ר אייל / לימונדה' },
  { name: 'Birra 33cl', nameEn: 'Beer 33cl', nameFr: 'Bière 33cl', nameEs: 'Cerveza 33cl', nameHe: 'בירה 33 מ"ל' },
  { name: 'Bicchiere di vino', nameEn: 'Glass of wine', nameFr: 'Verre de vin', nameEs: 'Copa de vino', nameHe: 'כוס יין' },
  // Caffetteria
  { name: 'Affogato al caffè', nameFr: 'Affogato au café', nameEs: 'Affogato al café', nameHe: 'אפוגטו קפה', descriptionEn: 'One scoop of your choice', descriptionFr: 'Une boule au choix', descriptionEs: 'Una bola a elegir', descriptionHe: 'כדור גלידה לבחירה' },
  { name: 'Cioccolata calda', nameEn: 'Hot Chocolate', nameFr: 'Chocolat chaud', nameEs: 'Chocolate caliente', nameHe: 'שוקו חם' },
  { name: 'Crêpe', nameHe: 'קרפ', descriptionEn: 'Crêpe with topping of your choice', descriptionFr: 'Crêpe avec garniture au choix', descriptionEs: 'Crêpe con topping a elegir', descriptionHe: 'קרפ עם תוספת לבחירה' },
  { name: 'Coppa Gelato', nameEn: 'Ice Cream Cup', nameFr: 'Coupe de Glace', nameEs: 'Copa de Helado', nameHe: 'גביע גלידה' },
  { name: 'MyKafe Special', nameFr: 'Spécial MyKafe', nameEs: 'Especial MyKafe', nameHe: 'מיוחד MyKafe', descriptionEn: 'Our specialty', descriptionFr: 'Notre spécialité', descriptionEs: 'Nuestra especialidad', descriptionHe: 'המיוחד שלנו' },
  { name: 'Ice Chocolate/Caffè', nameEn: 'Iced Chocolate/Coffee', nameFr: 'Chocolat/Café glacé', nameEs: 'Chocolate/Café helado', nameHe: 'שוקו/קפה קר' },
  { name: 'Milkshake', nameEs: 'Batido', nameHe: 'מילקשייק' },
  { name: 'Frozen Cocktail', nameFr: 'Cocktail glacé', nameEs: 'Cóctel helado', nameHe: 'קוקטייל קפוא' },
]

const modifierGroupTranslations = [
  { name: 'Extra ingredienti', nameEn: 'Extra ingredients', nameFr: 'Ingrédients supplémentaires', nameEs: 'Ingredientes extra', nameHe: 'תוספות' },
  { name: 'Extra', nameHe: 'תוספות' },
]

const modifierTranslations = [
  { name: 'Variazione a focaccia', nameEn: 'Switch to focaccia', nameFr: 'Variante focaccia', nameEs: 'Cambiar a focaccia', nameHe: 'החלף לפוקצ\'ה' },
  { name: '+ Mozzarella', nameHe: '+ מוצרלה' },
  { name: '+ Tonno', nameEn: '+ Tuna', nameFr: '+ Thon', nameEs: '+ Atún', nameHe: '+ טונה' },
  { name: '+ Avocado', nameFr: '+ Avocat', nameEs: '+ Aguacate', nameHe: '+ אבוקדו' },
  { name: '+ Pesto', nameHe: '+ פסטו' },
  { name: '+ Patè di olive', nameEn: '+ Olive tapenade', nameFr: '+ Tapenade d\'olives', nameEs: '+ Paté de aceitunas', nameHe: '+ טפנד זיתים' },
  { name: '+ Carciofi', nameEn: '+ Artichokes', nameFr: '+ Artichauts', nameEs: '+ Alcachofas', nameHe: '+ ארטישוק' },
  { name: '+ Verdure varie', nameEn: '+ Mixed vegetables', nameFr: '+ Légumes variés', nameEs: '+ Verduras variadas', nameHe: '+ ירקות מעורבים' },
  { name: '+ Salmone affumicato', nameEn: '+ Smoked salmon', nameFr: '+ Saumon fumé', nameEs: '+ Salmón ahumado', nameHe: '+ סלמון מעושן' },
  { name: '+ Panna', nameEn: '+ Whipped cream', nameFr: '+ Crème chantilly', nameEs: '+ Nata montada', nameHe: '+ קצפת' },
  { name: '+ Pallina di gelato', nameEn: '+ Ice cream scoop', nameFr: '+ Boule de glace', nameEs: '+ Bola de helado', nameHe: '+ כדור גלידה' },
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const results = {
      categories: 0,
      menuItems: 0,
      modifierGroups: 0,
      modifiers: 0,
      errors: [] as string[]
    }

    // Update categories
    for (const cat of categoryTranslations) {
      const { error } = await supabase
        .from('Category')
        .update({
          nameEn: cat.nameEn,
          nameFr: cat.nameFr,
          nameEs: cat.nameEs,
          nameHe: cat.nameHe,
          descriptionEn: cat.descriptionEn,
          descriptionFr: cat.descriptionFr,
          descriptionEs: cat.descriptionEs,
          descriptionHe: cat.descriptionHe,
        })
        .eq('name', cat.name)

      if (error) {
        results.errors.push(`Category ${cat.name}: ${error.message}`)
      } else {
        results.categories++
      }
    }

    // Update menu items
    for (const item of menuItemTranslations) {
      const updateData: Record<string, string | undefined> = {}
      if (item.nameEn) updateData.nameEn = item.nameEn
      if (item.nameFr) updateData.nameFr = item.nameFr
      if (item.nameEs) updateData.nameEs = item.nameEs
      if (item.nameHe) updateData.nameHe = item.nameHe
      if (item.descriptionEn) updateData.descriptionEn = item.descriptionEn
      if (item.descriptionFr) updateData.descriptionFr = item.descriptionFr
      if (item.descriptionEs) updateData.descriptionEs = item.descriptionEs
      if (item.descriptionHe) updateData.descriptionHe = item.descriptionHe

      const { error } = await supabase
        .from('MenuItem')
        .update(updateData)
        .eq('name', item.name)

      if (error) {
        results.errors.push(`MenuItem ${item.name}: ${error.message}`)
      } else {
        results.menuItems++
      }
    }

    // Update modifier groups
    for (const group of modifierGroupTranslations) {
      const updateData: Record<string, string | undefined> = {}
      if (group.nameEn) updateData.nameEn = group.nameEn
      if (group.nameFr) updateData.nameFr = group.nameFr
      if (group.nameEs) updateData.nameEs = group.nameEs
      if (group.nameHe) updateData.nameHe = group.nameHe

      const { error } = await supabase
        .from('ModifierGroup')
        .update(updateData)
        .eq('name', group.name)

      if (error) {
        results.errors.push(`ModifierGroup ${group.name}: ${error.message}`)
      } else {
        results.modifierGroups++
      }
    }

    // Update modifiers
    for (const mod of modifierTranslations) {
      const updateData: Record<string, string | undefined> = {}
      if (mod.nameEn) updateData.nameEn = mod.nameEn
      if (mod.nameFr) updateData.nameFr = mod.nameFr
      if (mod.nameEs) updateData.nameEs = mod.nameEs
      if (mod.nameHe) updateData.nameHe = mod.nameHe

      const { error } = await supabase
        .from('Modifier')
        .update(updateData)
        .eq('name', mod.name)

      if (error) {
        results.errors.push(`Modifier ${mod.name}: ${error.message}`)
      } else {
        results.modifiers++
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Translations applied successfully',
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
