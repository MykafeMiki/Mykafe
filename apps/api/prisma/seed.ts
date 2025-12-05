import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database con menu MyKafe...')

  // Pulisci database esistente
  await prisma.orderItemModifier.deleteMany()
  await prisma.orderItem.deleteMany()
  await prisma.order.deleteMany()
  await prisma.modifier.deleteMany()
  await prisma.modifierGroup.deleteMany()
  await prisma.menuItemIngredient.deleteMany()
  await prisma.menuItem.deleteMany()
  await prisma.category.deleteMany()
  await prisma.table.deleteMany()
  await prisma.ingredient.deleteMany()

  // Crea tavoli (15 tavoli)
  const tables = await Promise.all(
    Array.from({ length: 15 }, (_, i) =>
      prisma.table.create({
        data: {
          number: i + 1,
          seats: i < 5 ? 2 : i < 10 ? 4 : 6,
          qrCode: `tavolo-${i + 1}`,
        },
      })
    )
  )
  console.log(`✅ Creati ${tables.length} tavoli`)

  // Crea tavolo virtuale per takeaway (numero 0)
  await prisma.table.create({
    data: {
      number: 0,
      seats: 0,
      qrCode: 'takeaway',
      status: 'AVAILABLE',
    },
  })
  console.log('✅ Creato tavolo virtuale per takeaway')

  // ============== CATEGORIE ==============
  const toast = await prisma.category.create({
    data: {
      name: 'Toast',
      nameEn: 'Toast',
      nameFr: 'Toast',
      nameEs: 'Tostada',
      nameHe: 'טוסט',
      description: 'Ogni toast viene servito con un contorno di insalata',
      descriptionEn: 'Each toast is served with a side salad',
      descriptionFr: 'Chaque toast est servi avec une salade d\'accompagnement',
      descriptionEs: 'Cada tostada se sirve con ensalada de acompañamiento',
      descriptionHe: 'כל טוסט מוגש עם סלט צד',
      sortOrder: 1,
    },
  })

  const salad = await prisma.category.create({
    data: {
      name: 'Salad',
      nameEn: 'Salad',
      nameFr: 'Salade',
      nameEs: 'Ensalada',
      nameHe: 'סלט',
      description: 'Insalate fresche e genuine',
      descriptionEn: 'Fresh and genuine salads',
      descriptionFr: 'Salades fraîches et authentiques',
      descriptionEs: 'Ensaladas frescas y genuinas',
      descriptionHe: 'סלטים טריים ואותנטיים',
      sortOrder: 2,
    },
  })

  const piadina = await prisma.category.create({
    data: {
      name: 'Piadina',
      nameEn: 'Piadina',
      nameFr: 'Piadina',
      nameEs: 'Piadina',
      nameHe: 'פיאדינה',
      description: 'Piadine farcite con ingredienti freschi',
      descriptionEn: 'Piadinas stuffed with fresh ingredients',
      descriptionFr: 'Piadines garnies d\'ingrédients frais',
      descriptionEs: 'Piadinas rellenas con ingredientes frescos',
      descriptionHe: 'פיאדינות ממולאות במרכיבים טריים',
      sortOrder: 3,
    },
  })

  const affumicato = await prisma.category.create({
    data: {
      name: 'Affumicato',
      nameEn: 'Smoked',
      nameFr: 'Fumé',
      nameEs: 'Ahumado',
      nameHe: 'מעושן',
      description: 'Specialità con salmone affumicato',
      descriptionEn: 'Specialties with smoked salmon',
      descriptionFr: 'Spécialités au saumon fumé',
      descriptionEs: 'Especialidades con salmón ahumado',
      descriptionHe: 'מיוחדים עם סלמון מעושן',
      sortOrder: 4,
    },
  })

  const caprese = await prisma.category.create({
    data: {
      name: 'Caprese',
      nameEn: 'Caprese',
      nameFr: 'Caprese',
      nameEs: 'Caprese',
      nameHe: 'קפרזה',
      description: 'Le nostre capresi',
      descriptionEn: 'Our caprese dishes',
      descriptionFr: 'Nos capreses',
      descriptionEs: 'Nuestras capresas',
      descriptionHe: 'מנות הקפרזה שלנו',
      sortOrder: 5,
    },
  })

  const bruschetta = await prisma.category.create({
    data: {
      name: 'Bruschetta',
      nameEn: 'Bruschetta',
      nameFr: 'Bruschetta',
      nameEs: 'Bruschetta',
      nameHe: 'ברוסקטה',
      description: 'Bruschette tradizionali',
      descriptionEn: 'Traditional bruschettas',
      descriptionFr: 'Bruschettas traditionnelles',
      descriptionEs: 'Bruschettas tradicionales',
      descriptionHe: 'ברוסקטות מסורתיות',
      sortOrder: 6,
    },
  })

  const pizzaFocaccia = await prisma.category.create({
    data: {
      name: 'Pizza e Focaccia',
      nameEn: 'Pizza and Focaccia',
      nameFr: 'Pizza et Focaccia',
      nameEs: 'Pizza y Focaccia',
      nameHe: 'פיצה ופוקצ\'ה',
      description: 'Pizza e focaccia fatte in casa',
      descriptionEn: 'Homemade pizza and focaccia',
      descriptionFr: 'Pizza et focaccia faites maison',
      descriptionEs: 'Pizza y focaccia caseras',
      descriptionHe: 'פיצה ופוקצ\'ה ביתיות',
      sortOrder: 7,
    },
  })

  const bevande = await prisma.category.create({
    data: {
      name: 'Bevande',
      nameEn: 'Beverages',
      nameFr: 'Boissons',
      nameEs: 'Bebidas',
      nameHe: 'משקאות',
      description: 'Bevande fresche',
      descriptionEn: 'Fresh beverages',
      descriptionFr: 'Boissons fraîches',
      descriptionEs: 'Bebidas frescas',
      descriptionHe: 'משקאות קרים',
      sortOrder: 8,
    },
  })

  const caffetteria = await prisma.category.create({
    data: {
      name: 'Caffetteria',
      nameEn: 'Coffee Shop',
      nameFr: 'Café',
      nameEs: 'Cafetería',
      nameHe: 'בית קפה',
      description: 'Dolci e bevande calde',
      descriptionEn: 'Sweets and hot beverages',
      descriptionFr: 'Desserts et boissons chaudes',
      descriptionEs: 'Dulces y bebidas calientes',
      descriptionHe: 'קינוחים ומשקאות חמים',
      sortOrder: 9,
    },
  })

  console.log('✅ Create categorie con traduzioni')

  // ============== TOAST ==============
  const toastItems = [
    {
      name: 'Toast 01',
      nameEn: 'Toast 01',
      nameFr: 'Toast 01',
      nameEs: 'Tostada 01',
      nameHe: 'טוסט 01',
      description: 'Ciabatta, mozzarella, pomodoro, rucola',
      descriptionEn: 'Ciabatta, mozzarella, tomato, arugula',
      descriptionFr: 'Ciabatta, mozzarella, tomate, roquette',
      descriptionEs: 'Ciabatta, mozzarella, tomate, rúcula',
      descriptionHe: 'צ\'יאבטה, מוצרלה, עגבנייה, רוקט',
      price: 890
    },
    {
      name: 'Toast 02',
      nameEn: 'Toast 02',
      nameFr: 'Toast 02',
      nameEs: 'Tostada 02',
      nameHe: 'טוסט 02',
      description: 'Bagel, mozzarella, zucchine, pomodoro',
      descriptionEn: 'Bagel, mozzarella, zucchini, tomato',
      descriptionFr: 'Bagel, mozzarella, courgettes, tomate',
      descriptionEs: 'Bagel, mozzarella, calabacín, tomate',
      descriptionHe: 'בייגל, מוצרלה, קישוא, עגבנייה',
      price: 890
    },
    {
      name: 'Toast 03',
      nameEn: 'Toast 03',
      nameFr: 'Toast 03',
      nameEs: 'Tostada 03',
      nameHe: 'טוסט 03',
      description: 'Pane arabo, mozzarella, melanzane, pomodoro, maionese',
      descriptionEn: 'Pita bread, mozzarella, eggplant, tomato, mayonnaise',
      descriptionFr: 'Pain pita, mozzarella, aubergines, tomate, mayonnaise',
      descriptionEs: 'Pan árabe, mozzarella, berenjena, tomate, mayonesa',
      descriptionHe: 'פיתה, מוצרלה, חציל, עגבנייה, מיונז',
      price: 890
    },
    {
      name: 'Toast 04',
      nameEn: 'Toast 04',
      nameFr: 'Toast 04',
      nameEs: 'Tostada 04',
      nameHe: 'טוסט 04',
      description: 'Bagel, tonno, pomodoro, cipolla, rucola, maionese',
      descriptionEn: 'Bagel, tuna, tomato, onion, arugula, mayonnaise',
      descriptionFr: 'Bagel, thon, tomate, oignon, roquette, mayonnaise',
      descriptionEs: 'Bagel, atún, tomate, cebolla, rúcula, mayonesa',
      descriptionHe: 'בייגל, טונה, עגבנייה, בצל, רוקט, מיונז',
      price: 890
    },
    {
      name: 'Toast 05',
      nameEn: 'Toast 05',
      nameFr: 'Toast 05',
      nameEs: 'Tostada 05',
      nameHe: 'טוסט 05',
      description: 'Bagel, salmone affumicato, pomodoro, rucola, maionese',
      descriptionEn: 'Bagel, smoked salmon, tomato, arugula, mayonnaise',
      descriptionFr: 'Bagel, saumon fumé, tomate, roquette, mayonnaise',
      descriptionEs: 'Bagel, salmón ahumado, tomate, rúcula, mayonesa',
      descriptionHe: 'בייגל, סלמון מעושן, עגבנייה, רוקט, מיונז',
      price: 1000
    },
    {
      name: 'Toast 06',
      nameEn: 'Toast 06',
      nameFr: 'Toast 06',
      nameEs: 'Tostada 06',
      nameHe: 'טוסט 06',
      description: 'Focaccia, mozzarella, pomodoro, melanzane, zucchine',
      descriptionEn: 'Focaccia, mozzarella, tomato, eggplant, zucchini',
      descriptionFr: 'Focaccia, mozzarella, tomate, aubergines, courgettes',
      descriptionEs: 'Focaccia, mozzarella, tomate, berenjena, calabacín',
      descriptionHe: 'פוקצ\'ה, מוצרלה, עגבנייה, חציל, קישוא',
      price: 900
    },
    {
      name: 'Toast 07',
      nameEn: 'Toast 07',
      nameFr: 'Toast 07',
      nameEs: 'Tostada 07',
      nameHe: 'טוסט 07',
      description: 'Bagel, mozzarella, pomodoro, pesto, rucola',
      descriptionEn: 'Bagel, mozzarella, tomato, pesto, arugula',
      descriptionFr: 'Bagel, mozzarella, tomate, pesto, roquette',
      descriptionEs: 'Bagel, mozzarella, tomate, pesto, rúcula',
      descriptionHe: 'בייגל, מוצרלה, עגבנייה, פסטו, רוקט',
      price: 890
    },
    {
      name: 'Toast 08',
      nameEn: 'Toast 08',
      nameFr: 'Toast 08',
      nameEs: 'Tostada 08',
      nameHe: 'טוסט 08',
      description: 'Pane arabo, mozzarella, funghi, origano, pomodoro, insalata',
      descriptionEn: 'Pita bread, mozzarella, mushrooms, oregano, tomato, salad',
      descriptionFr: 'Pain pita, mozzarella, champignons, origan, tomate, salade',
      descriptionEs: 'Pan árabe, mozzarella, champiñones, orégano, tomate, ensalada',
      descriptionHe: 'פיתה, מוצרלה, פטריות, אורגנו, עגבנייה, סלט',
      price: 890
    },
    {
      name: 'Toast 09',
      nameEn: 'Toast 09',
      nameFr: 'Toast 09',
      nameEs: 'Tostada 09',
      nameHe: 'טוסט 09',
      description: 'Ciabatta, formaggi misti, pomodoro, insalata',
      descriptionEn: 'Ciabatta, mixed cheeses, tomato, salad',
      descriptionFr: 'Ciabatta, fromages variés, tomate, salade',
      descriptionEs: 'Ciabatta, quesos mixtos, tomate, ensalada',
      descriptionHe: 'צ\'יאבטה, גבינות מעורבות, עגבנייה, סלט',
      price: 890
    },
    {
      name: 'Toast 10',
      nameEn: 'Toast 10',
      nameFr: 'Toast 10',
      nameEs: 'Tostada 10',
      nameHe: 'טוסט 10',
      description: 'Bagel, salmone affumicato, lattuga, cetrioli, pesto, maionese',
      descriptionEn: 'Bagel, smoked salmon, lettuce, cucumbers, pesto, mayonnaise',
      descriptionFr: 'Bagel, saumon fumé, laitue, concombres, pesto, mayonnaise',
      descriptionEs: 'Bagel, salmón ahumado, lechuga, pepinos, pesto, mayonesa',
      descriptionHe: 'בייגל, סלמון מעושן, חסה, מלפפונים, פסטו, מיונז',
      price: 1000
    },
    {
      name: 'Toast 11',
      nameEn: 'Toast 11',
      nameFr: 'Toast 11',
      nameEs: 'Tostada 11',
      nameHe: 'טוסט 11',
      description: 'Bagel, mozzarella, peperoni, melanzane, maionese, chimichurri',
      descriptionEn: 'Bagel, mozzarella, peppers, eggplant, mayonnaise, chimichurri',
      descriptionFr: 'Bagel, mozzarella, poivrons, aubergines, mayonnaise, chimichurri',
      descriptionEs: 'Bagel, mozzarella, pimientos, berenjena, mayonesa, chimichurri',
      descriptionHe: 'בייגל, מוצרלה, פלפלים, חציל, מיונז, צ\'ימיצ\'ורי',
      price: 890
    },
    {
      name: 'Toast 12',
      nameEn: 'Toast 12',
      nameFr: 'Toast 12',
      nameEs: 'Tostada 12',
      nameHe: 'טוסט 12',
      description: 'Pane arabo, tonno, zucchine, lattuga, chimichurri, maionese',
      descriptionEn: 'Pita bread, tuna, zucchini, lettuce, chimichurri, mayonnaise',
      descriptionFr: 'Pain pita, thon, courgettes, laitue, chimichurri, mayonnaise',
      descriptionEs: 'Pan árabe, atún, calabacín, lechuga, chimichurri, mayonesa',
      descriptionHe: 'פיתה, טונה, קישוא, חסה, צ\'ימיצ\'ורי, מיונז',
      price: 890
    },
    {
      name: 'Toast 13',
      nameEn: 'Toast 13',
      nameFr: 'Toast 13',
      nameEs: 'Tostada 13',
      nameHe: 'טוסט 13',
      description: 'Ciabatta, mozzarella, pomodoro, carciofi, maionese',
      descriptionEn: 'Ciabatta, mozzarella, tomato, artichokes, mayonnaise',
      descriptionFr: 'Ciabatta, mozzarella, tomate, artichauts, mayonnaise',
      descriptionEs: 'Ciabatta, mozzarella, tomate, alcachofas, mayonesa',
      descriptionHe: 'צ\'יאבטה, מוצרלה, עגבנייה, ארטישוק, מיונז',
      price: 890
    },
    {
      name: 'Toast 15',
      nameEn: 'Toast 15',
      nameFr: 'Toast 15',
      nameEs: 'Tostada 15',
      nameHe: 'טוסט 15',
      description: 'Bagel, pomodoro, zucchine, melanzane, avocado, carciofi, maionese',
      descriptionEn: 'Bagel, tomato, zucchini, eggplant, avocado, artichokes, mayonnaise',
      descriptionFr: 'Bagel, tomate, courgettes, aubergines, avocat, artichauts, mayonnaise',
      descriptionEs: 'Bagel, tomate, calabacín, berenjena, aguacate, alcachofas, mayonesa',
      descriptionHe: 'בייגל, עגבנייה, קישוא, חציל, אבוקדו, ארטישוק, מיונז',
      price: 900
    },
    {
      name: 'Toast 16',
      nameEn: 'Toast 16',
      nameFr: 'Toast 16',
      nameEs: 'Tostada 16',
      nameHe: 'טוסט 16',
      description: 'Focaccia, salmone affumicato, rucola, avocado, zucchine, pesto, maionese',
      descriptionEn: 'Focaccia, smoked salmon, arugula, avocado, zucchini, pesto, mayonnaise',
      descriptionFr: 'Focaccia, saumon fumé, roquette, avocat, courgettes, pesto, mayonnaise',
      descriptionEs: 'Focaccia, salmón ahumado, rúcula, aguacate, calabacín, pesto, mayonesa',
      descriptionHe: 'פוקצ\'ה, סלמון מעושן, רוקט, אבוקדו, קישוא, פסטו, מיונז',
      price: 1090
    },
    {
      name: 'Toast 17',
      nameEn: 'Toast 17',
      nameFr: 'Toast 17',
      nameEs: 'Tostada 17',
      nameHe: 'טוסט 17',
      description: 'Ciabatta, tonno, pomodoro, lattuga, cipolle, ketchup',
      descriptionEn: 'Ciabatta, tuna, tomato, lettuce, onions, ketchup',
      descriptionFr: 'Ciabatta, thon, tomate, laitue, oignons, ketchup',
      descriptionEs: 'Ciabatta, atún, tomate, lechuga, cebollas, ketchup',
      descriptionHe: 'צ\'יאבטה, טונה, עגבנייה, חסה, בצל, קטשופ',
      price: 990
    },
    {
      name: 'Toast 18',
      nameEn: 'Toast 18',
      nameFr: 'Toast 18',
      nameEs: 'Tostada 18',
      nameHe: 'טוסט 18',
      description: 'Ciabatta, formaggi misti, patè di olive, rucola, melanzane, maionese',
      descriptionEn: 'Ciabatta, mixed cheeses, olive tapenade, arugula, eggplant, mayonnaise',
      descriptionFr: 'Ciabatta, fromages variés, tapenade d\'olives, roquette, aubergines, mayonnaise',
      descriptionEs: 'Ciabatta, quesos mixtos, paté de aceitunas, rúcula, berenjena, mayonesa',
      descriptionHe: 'צ\'יאבטה, גבינות מעורבות, טפנד זיתים, רוקט, חציל, מיונז',
      price: 900
    },
  ]

  // Modificatori per toast con traduzioni
  const toastModifiers = [
    { name: 'Variazione a focaccia', nameEn: 'Switch to focaccia', nameFr: 'Variante focaccia', nameEs: 'Cambiar a focaccia', nameHe: 'החלף לפוקצ\'ה', price: 50 },
    { name: '+ Mozzarella', nameEn: '+ Mozzarella', nameFr: '+ Mozzarella', nameEs: '+ Mozzarella', nameHe: '+ מוצרלה', price: 200 },
    { name: '+ Tonno', nameEn: '+ Tuna', nameFr: '+ Thon', nameEs: '+ Atún', nameHe: '+ טונה', price: 200 },
    { name: '+ Avocado', nameEn: '+ Avocado', nameFr: '+ Avocat', nameEs: '+ Aguacate', nameHe: '+ אבוקדו', price: 200 },
    { name: '+ Pesto', nameEn: '+ Pesto', nameFr: '+ Pesto', nameEs: '+ Pesto', nameHe: '+ פסטו', price: 50 },
    { name: '+ Patè di olive', nameEn: '+ Olive tapenade', nameFr: '+ Tapenade d\'olives', nameEs: '+ Paté de aceitunas', nameHe: '+ טפנד זיתים', price: 50 },
    { name: '+ Carciofi', nameEn: '+ Artichokes', nameFr: '+ Artichauts', nameEs: '+ Alcachofas', nameHe: '+ ארטישוק', price: 100 },
    { name: '+ Verdure varie', nameEn: '+ Mixed vegetables', nameFr: '+ Légumes variés', nameEs: '+ Verduras variadas', nameHe: '+ ירקות מעורבים', price: 50 },
  ]

  for (let i = 0; i < toastItems.length; i++) {
    const item = await prisma.menuItem.create({
      data: {
        ...toastItems[i],
        categoryId: toast.id,
        sortOrder: i + 1,
      },
    })

    // Aggiungi modificatori per toast
    await prisma.modifierGroup.create({
      data: {
        name: 'Extra ingredienti',
        nameEn: 'Extra ingredients',
        nameFr: 'Ingrédients supplémentaires',
        nameEs: 'Ingredientes extra',
        nameHe: 'תוספות',
        required: false,
        multiSelect: true,
        maxSelect: 5,
        menuItemId: item.id,
        modifiers: {
          create: toastModifiers,
        },
      },
    })
  }
  console.log('✅ Creati toast con modificatori e traduzioni')

  // ============== SALAD ==============
  const saladItems = [
    {
      name: 'Salad 01',
      nameEn: 'Salad 01',
      nameFr: 'Salade 01',
      nameEs: 'Ensalada 01',
      nameHe: 'סלט 01',
      description: 'Insalata, mozzarelline, pomodori, cetrioli, carote, olive',
      descriptionEn: 'Salad, mozzarella balls, tomatoes, cucumbers, carrots, olives',
      descriptionFr: 'Salade, mozzarellines, tomates, concombres, carottes, olives',
      descriptionEs: 'Ensalada, bolitas de mozzarella, tomates, pepinos, zanahorias, aceitunas',
      descriptionHe: 'סלט, כדורי מוצרלה, עגבניות, מלפפונים, גזר, זיתים',
      price: 1050
    },
    {
      name: 'Salad 02',
      nameEn: 'Salad 02',
      nameFr: 'Salade 02',
      nameEs: 'Ensalada 02',
      nameHe: 'סלט 02',
      description: 'Insalata, tonno, pomodori, mais, olive, cipolle',
      descriptionEn: 'Salad, tuna, tomatoes, corn, olives, onions',
      descriptionFr: 'Salade, thon, tomates, maïs, olives, oignons',
      descriptionEs: 'Ensalada, atún, tomates, maíz, aceitunas, cebollas',
      descriptionHe: 'סלט, טונה, עגבניות, תירס, זיתים, בצל',
      price: 1050
    },
    {
      name: 'Salad 03',
      nameEn: 'Salad 03',
      nameFr: 'Salade 03',
      nameEs: 'Ensalada 03',
      nameHe: 'סלט 03',
      description: 'Insalata, salmone affumicato, avocado, pomodori, olive',
      descriptionEn: 'Salad, smoked salmon, avocado, tomatoes, olives',
      descriptionFr: 'Salade, saumon fumé, avocat, tomates, olives',
      descriptionEs: 'Ensalada, salmón ahumado, aguacate, tomates, aceitunas',
      descriptionHe: 'סלט, סלמון מעושן, אבוקדו, עגבניות, זיתים',
      price: 1190
    },
    {
      name: 'Salad 04',
      nameEn: 'Salad 04',
      nameFr: 'Salade 04',
      nameEs: 'Ensalada 04',
      nameHe: 'סלט 04',
      description: 'Insalata, feta, rucola, pomodori, cetrioli, melanzane, olive',
      descriptionEn: 'Salad, feta, arugula, tomatoes, cucumbers, eggplant, olives',
      descriptionFr: 'Salade, feta, roquette, tomates, concombres, aubergines, olives',
      descriptionEs: 'Ensalada, feta, rúcula, tomates, pepinos, berenjena, aceitunas',
      descriptionHe: 'סלט, פטה, רוקט, עגבניות, מלפפונים, חציל, זיתים',
      price: 1090
    },
    {
      name: 'Salad 05',
      nameEn: 'Salad 05',
      nameFr: 'Salade 05',
      nameEs: 'Ensalada 05',
      nameHe: 'סלט 05',
      description: 'Insalata, zucchine e melanzane grigliate, cetrioli, pomodori, carote, avocado, mais',
      descriptionEn: 'Salad, grilled zucchini and eggplant, cucumbers, tomatoes, carrots, avocado, corn',
      descriptionFr: 'Salade, courgettes et aubergines grillées, concombres, tomates, carottes, avocat, maïs',
      descriptionEs: 'Ensalada, calabacín y berenjena a la parrilla, pepinos, tomates, zanahorias, aguacate, maíz',
      descriptionHe: 'סלט, קישוא וחציל צלויים, מלפפונים, עגבניות, גזר, אבוקדו, תירס',
      price: 950
    },
  ]

  // Modificatori per salad con traduzioni
  const saladModifiers = [
    { name: '+ Salmone affumicato', nameEn: '+ Smoked salmon', nameFr: '+ Saumon fumé', nameEs: '+ Salmón ahumado', nameHe: '+ סלמון מעושן', price: 300 },
    { name: '+ Mozzarella', nameEn: '+ Mozzarella', nameFr: '+ Mozzarella', nameEs: '+ Mozzarella', nameHe: '+ מוצרלה', price: 200 },
    { name: '+ Tonno', nameEn: '+ Tuna', nameFr: '+ Thon', nameEs: '+ Atún', nameHe: '+ טונה', price: 200 },
    { name: '+ Avocado', nameEn: '+ Avocado', nameFr: '+ Avocat', nameEs: '+ Aguacate', nameHe: '+ אבוקדו', price: 100 },
    { name: '+ Carciofi', nameEn: '+ Artichokes', nameFr: '+ Artichauts', nameEs: '+ Alcachofas', nameHe: '+ ארטישוק', price: 100 },
    { name: '+ Pesto', nameEn: '+ Pesto', nameFr: '+ Pesto', nameEs: '+ Pesto', nameHe: '+ פסטו', price: 50 },
    { name: '+ Verdure varie', nameEn: '+ Mixed vegetables', nameFr: '+ Légumes variés', nameEs: '+ Verduras variadas', nameHe: '+ ירקות מעורבים', price: 50 },
  ]

  for (let i = 0; i < saladItems.length; i++) {
    const item = await prisma.menuItem.create({
      data: {
        ...saladItems[i],
        categoryId: salad.id,
        sortOrder: i + 1,
      },
    })

    await prisma.modifierGroup.create({
      data: {
        name: 'Extra ingredienti',
        nameEn: 'Extra ingredients',
        nameFr: 'Ingrédients supplémentaires',
        nameEs: 'Ingredientes extra',
        nameHe: 'תוספות',
        required: false,
        multiSelect: true,
        maxSelect: 5,
        menuItemId: item.id,
        modifiers: {
          create: saladModifiers,
        },
      },
    })
  }
  console.log('✅ Create insalate con traduzioni')

  // ============== PIADINA ==============
  const piadinaItems = [
    {
      name: 'Piadina 01',
      nameEn: 'Piadina 01',
      nameFr: 'Piadina 01',
      nameEs: 'Piadina 01',
      nameHe: 'פיאדינה 01',
      description: 'Mozzarella, pomodoro, zucchine, maionese',
      descriptionEn: 'Mozzarella, tomato, zucchini, mayonnaise',
      descriptionFr: 'Mozzarella, tomate, courgettes, mayonnaise',
      descriptionEs: 'Mozzarella, tomate, calabacín, mayonesa',
      descriptionHe: 'מוצרלה, עגבנייה, קישוא, מיונז',
      price: 990
    },
    {
      name: 'Piadina 02',
      nameEn: 'Piadina 02',
      nameFr: 'Piadina 02',
      nameEs: 'Piadina 02',
      nameHe: 'פיאדינה 02',
      description: 'Mozzarella, pomodoro, pesto, rucola',
      descriptionEn: 'Mozzarella, tomato, pesto, arugula',
      descriptionFr: 'Mozzarella, tomate, pesto, roquette',
      descriptionEs: 'Mozzarella, tomate, pesto, rúcula',
      descriptionHe: 'מוצרלה, עגבנייה, פסטו, רוקט',
      price: 990
    },
    {
      name: 'Piadina 03',
      nameEn: 'Piadina 03',
      nameFr: 'Piadina 03',
      nameEs: 'Piadina 03',
      nameHe: 'פיאדינה 03',
      description: 'Formaggi misti, peperoni, pomodoro, maionese',
      descriptionEn: 'Mixed cheeses, peppers, tomato, mayonnaise',
      descriptionFr: 'Fromages variés, poivrons, tomate, mayonnaise',
      descriptionEs: 'Quesos mixtos, pimientos, tomate, mayonesa',
      descriptionHe: 'גבינות מעורבות, פלפלים, עגבנייה, מיונז',
      price: 990
    },
    {
      name: 'Piadina 04',
      nameEn: 'Piadina 04',
      nameFr: 'Piadina 04',
      nameEs: 'Piadina 04',
      nameHe: 'פיאדינה 04',
      description: 'Mozzarella, formaggi misti, pomodoro, funghi, rucola',
      descriptionEn: 'Mozzarella, mixed cheeses, tomato, mushrooms, arugula',
      descriptionFr: 'Mozzarella, fromages variés, tomate, champignons, roquette',
      descriptionEs: 'Mozzarella, quesos mixtos, tomate, champiñones, rúcula',
      descriptionHe: 'מוצרלה, גבינות מעורבות, עגבנייה, פטריות, רוקט',
      price: 990
    },
    {
      name: 'Piadina 05',
      nameEn: 'Piadina 05',
      nameFr: 'Piadina 05',
      nameEs: 'Piadina 05',
      nameHe: 'פיאדינה 05',
      description: 'Zucchine, melanzane, peperoni, avocado, funghi, pesto',
      descriptionEn: 'Zucchini, eggplant, peppers, avocado, mushrooms, pesto',
      descriptionFr: 'Courgettes, aubergines, poivrons, avocat, champignons, pesto',
      descriptionEs: 'Calabacín, berenjena, pimientos, aguacate, champiñones, pesto',
      descriptionHe: 'קישוא, חציל, פלפלים, אבוקדו, פטריות, פסטו',
      price: 990
    },
  ]

  for (let i = 0; i < piadinaItems.length; i++) {
    await prisma.menuItem.create({
      data: {
        ...piadinaItems[i],
        categoryId: piadina.id,
        sortOrder: i + 1,
      },
    })
  }
  console.log('✅ Create piadine con traduzioni')

  // ============== AFFUMICATO ==============
  await prisma.menuItem.create({
    data: {
      name: 'Piatto Affumicato',
      nameEn: 'Smoked Salmon Plate',
      nameFr: 'Assiette de Saumon Fumé',
      nameEs: 'Plato de Salmón Ahumado',
      nameHe: 'צלחת סלמון מעושן',
      description: 'Salmone affumicato, pomodori, zucchine, avocado, rucola, mais',
      descriptionEn: 'Smoked salmon, tomatoes, zucchini, avocado, arugula, corn',
      descriptionFr: 'Saumon fumé, tomates, courgettes, avocat, roquette, maïs',
      descriptionEs: 'Salmón ahumado, tomates, calabacín, aguacate, rúcula, maíz',
      descriptionHe: 'סלמון מעושן, עגבניות, קישוא, אבוקדו, רוקט, תירס',
      price: 1350,
      categoryId: affumicato.id,
      sortOrder: 1,
    },
  })
  console.log('✅ Creato affumicato con traduzioni')

  // ============== CAPRESE ==============
  const capreseItems = [
    {
      name: 'Caprese 01',
      nameEn: 'Caprese 01',
      nameFr: 'Caprese 01',
      nameEs: 'Caprese 01',
      nameHe: 'קפרזה 01',
      description: 'Mozzarella, pomodoro, rucola, zucchine, pesto',
      descriptionEn: 'Mozzarella, tomato, arugula, zucchini, pesto',
      descriptionFr: 'Mozzarella, tomate, roquette, courgettes, pesto',
      descriptionEs: 'Mozzarella, tomate, rúcula, calabacín, pesto',
      descriptionHe: 'מוצרלה, עגבנייה, רוקט, קישוא, פסטו',
      price: 1090
    },
    {
      name: 'Caprese 02',
      nameEn: 'Caprese 02',
      nameFr: 'Caprese 02',
      nameEs: 'Caprese 02',
      nameHe: 'קפרזה 02',
      description: 'Tonno, rucola, pomodoro, zucchine, melanzane, carote, avocado',
      descriptionEn: 'Tuna, arugula, tomato, zucchini, eggplant, carrots, avocado',
      descriptionFr: 'Thon, roquette, tomate, courgettes, aubergines, carottes, avocat',
      descriptionEs: 'Atún, rúcula, tomate, calabacín, berenjena, zanahorias, aguacate',
      descriptionHe: 'טונה, רוקט, עגבנייה, קישוא, חציל, גזר, אבוקדו',
      price: 1090
    },
  ]

  for (let i = 0; i < capreseItems.length; i++) {
    await prisma.menuItem.create({
      data: {
        ...capreseItems[i],
        categoryId: caprese.id,
        sortOrder: i + 1,
      },
    })
  }
  console.log('✅ Create capresi con traduzioni')

  // ============== BRUSCHETTA ==============
  const bruschettaItems = [
    {
      name: 'Bruschetta 01',
      nameEn: 'Bruschetta 01',
      nameFr: 'Bruschetta 01',
      nameEs: 'Bruschetta 01',
      nameHe: 'ברוסקטה 01',
      description: 'Pane tostato, pomodoro, pesto/chimichurri',
      descriptionEn: 'Toasted bread, tomato, pesto/chimichurri',
      descriptionFr: 'Pain grillé, tomate, pesto/chimichurri',
      descriptionEs: 'Pan tostado, tomate, pesto/chimichurri',
      descriptionHe: 'לחם קלוי, עגבנייה, פסטו/צ\'ימיצ\'ורי',
      price: 700
    },
    {
      name: 'Bruschetta 02',
      nameEn: 'Bruschetta 02',
      nameFr: 'Bruschetta 02',
      nameEs: 'Bruschetta 02',
      nameHe: 'ברוסקטה 02',
      description: 'Pane tostato, pomodoro, pesto/chimichurri, mozzarella',
      descriptionEn: 'Toasted bread, tomato, pesto/chimichurri, mozzarella',
      descriptionFr: 'Pain grillé, tomate, pesto/chimichurri, mozzarella',
      descriptionEs: 'Pan tostado, tomate, pesto/chimichurri, mozzarella',
      descriptionHe: 'לחם קלוי, עגבנייה, פסטו/צ\'ימיצ\'ורי, מוצרלה',
      price: 800
    },
  ]

  for (let i = 0; i < bruschettaItems.length; i++) {
    await prisma.menuItem.create({
      data: {
        ...bruschettaItems[i],
        categoryId: bruschetta.id,
        sortOrder: i + 1,
      },
    })
  }
  console.log('✅ Create bruschette con traduzioni')

  // ============== PIZZA E FOCACCIA ==============
  const pizzaItems = [
    {
      name: 'Pizza Margherita',
      nameEn: 'Margherita Pizza',
      nameFr: 'Pizza Margherita',
      nameEs: 'Pizza Margherita',
      nameHe: 'פיצה מרגריטה',
      description: 'Pizza, mozzarella, pomodoro',
      descriptionEn: 'Pizza, mozzarella, tomato',
      descriptionFr: 'Pizza, mozzarella, tomate',
      descriptionEs: 'Pizza, mozzarella, tomate',
      descriptionHe: 'פיצה, מוצרלה, עגבנייה',
      price: 490
    },
    {
      name: 'Focaccia',
      nameEn: 'Focaccia',
      nameFr: 'Focaccia',
      nameEs: 'Focaccia',
      nameHe: 'פוקצ\'ה',
      description: 'Focaccia, mozzarella',
      descriptionEn: 'Focaccia, mozzarella',
      descriptionFr: 'Focaccia, mozzarella',
      descriptionEs: 'Focaccia, mozzarella',
      descriptionHe: 'פוקצ\'ה, מוצרלה',
      price: 490
    },
  ]

  // Modificatori per pizza con traduzioni
  const pizzaModifiers = [
    { name: '+ Pesto', nameEn: '+ Pesto', nameFr: '+ Pesto', nameEs: '+ Pesto', nameHe: '+ פסטו', price: 50 },
    { name: '+ Avocado', nameEn: '+ Avocado', nameFr: '+ Avocat', nameEs: '+ Aguacate', nameHe: '+ אבוקדו', price: 100 },
    { name: '+ Carciofi', nameEn: '+ Artichokes', nameFr: '+ Artichauts', nameEs: '+ Alcachofas', nameHe: '+ ארטישוק', price: 100 },
    { name: '+ Verdure varie', nameEn: '+ Mixed vegetables', nameFr: '+ Légumes variés', nameEs: '+ Verduras variadas', nameHe: '+ ירקות מעורבים', price: 50 },
  ]

  for (let i = 0; i < pizzaItems.length; i++) {
    const item = await prisma.menuItem.create({
      data: {
        ...pizzaItems[i],
        categoryId: pizzaFocaccia.id,
        sortOrder: i + 1,
      },
    })

    await prisma.modifierGroup.create({
      data: {
        name: 'Extra ingredienti',
        nameEn: 'Extra ingredients',
        nameFr: 'Ingrédients supplémentaires',
        nameEs: 'Ingredientes extra',
        nameHe: 'תוספות',
        required: false,
        multiSelect: true,
        maxSelect: 5,
        menuItemId: item.id,
        modifiers: {
          create: pizzaModifiers,
        },
      },
    })
  }
  console.log('✅ Create pizza e focaccia con traduzioni')

  // ============== BEVANDE ==============
  const bevandeItems = [
    {
      name: 'Acqua',
      nameEn: 'Water',
      nameFr: 'Eau',
      nameEs: 'Agua',
      nameHe: 'מים',
      description: null,
      descriptionEn: null,
      descriptionFr: null,
      descriptionEs: null,
      descriptionHe: null,
      price: 150
    },
    {
      name: 'Coca Cola / Fanta / Sprite / Nestea / Estathe',
      nameEn: 'Coca Cola / Fanta / Sprite / Nestea / Estathe',
      nameFr: 'Coca Cola / Fanta / Sprite / Nestea / Estathe',
      nameEs: 'Coca Cola / Fanta / Sprite / Nestea / Estathe',
      nameHe: 'קוקה קולה / פאנטה / ספרייט / נסטי / אסטתה',
      description: null,
      descriptionEn: null,
      descriptionFr: null,
      descriptionEs: null,
      descriptionHe: null,
      price: 300
    },
    {
      name: 'Spremuta Arancia',
      nameEn: 'Fresh Orange Juice',
      nameFr: 'Jus d\'orange pressé',
      nameEs: 'Zumo de naranja natural',
      nameHe: 'מיץ תפוזים סחוט',
      description: 'Spremuta fresca di arancia',
      descriptionEn: 'Freshly squeezed orange juice',
      descriptionFr: 'Jus d\'orange fraîchement pressé',
      descriptionEs: 'Zumo de naranja recién exprimido',
      descriptionHe: 'מיץ תפוזים סחוט טרי',
      price: 450
    },
    {
      name: 'Succhi di frutta',
      nameEn: 'Fruit Juices',
      nameFr: 'Jus de fruits',
      nameEs: 'Zumos de frutas',
      nameHe: 'מיצי פירות',
      description: null,
      descriptionEn: null,
      descriptionFr: null,
      descriptionEs: null,
      descriptionHe: null,
      price: 350
    },
    {
      name: 'Acqua tonica / Ginger Ale / Lemon Soda',
      nameEn: 'Tonic Water / Ginger Ale / Lemon Soda',
      nameFr: 'Eau tonique / Ginger Ale / Limonade',
      nameEs: 'Agua tónica / Ginger Ale / Limonada',
      nameHe: 'מי טוניק / ג\'ינג\'ר אייל / לימונדה',
      description: null,
      descriptionEn: null,
      descriptionFr: null,
      descriptionEs: null,
      descriptionHe: null,
      price: 300
    },
    {
      name: 'Birra 33cl',
      nameEn: 'Beer 33cl',
      nameFr: 'Bière 33cl',
      nameEs: 'Cerveza 33cl',
      nameHe: 'בירה 33 מ"ל',
      description: null,
      descriptionEn: null,
      descriptionFr: null,
      descriptionEs: null,
      descriptionHe: null,
      price: 400
    },
    {
      name: 'Bicchiere di vino',
      nameEn: 'Glass of wine',
      nameFr: 'Verre de vin',
      nameEs: 'Copa de vino',
      nameHe: 'כוס יין',
      description: null,
      descriptionEn: null,
      descriptionFr: null,
      descriptionEs: null,
      descriptionHe: null,
      price: 400
    },
  ]

  for (let i = 0; i < bevandeItems.length; i++) {
    await prisma.menuItem.create({
      data: {
        name: bevandeItems[i].name,
        nameEn: bevandeItems[i].nameEn,
        nameFr: bevandeItems[i].nameFr,
        nameEs: bevandeItems[i].nameEs,
        nameHe: bevandeItems[i].nameHe,
        description: bevandeItems[i].description,
        descriptionEn: bevandeItems[i].descriptionEn,
        descriptionFr: bevandeItems[i].descriptionFr,
        descriptionEs: bevandeItems[i].descriptionEs,
        descriptionHe: bevandeItems[i].descriptionHe,
        price: bevandeItems[i].price,
        categoryId: bevande.id,
        sortOrder: i + 1,
      },
    })
  }
  console.log('✅ Create bevande con traduzioni')

  // ============== CAFFETTERIA ==============
  const caffeItems = [
    {
      name: 'Affogato al caffè',
      nameEn: 'Affogato al caffè',
      nameFr: 'Affogato au café',
      nameEs: 'Affogato al café',
      nameHe: 'אפוגטו קפה',
      description: 'Una pallina a scelta',
      descriptionEn: 'One scoop of your choice',
      descriptionFr: 'Une boule au choix',
      descriptionEs: 'Una bola a elegir',
      descriptionHe: 'כדור גלידה לבחירה',
      price: 300,
      hasModifiers: true
    },
    {
      name: 'Cioccolata calda',
      nameEn: 'Hot Chocolate',
      nameFr: 'Chocolat chaud',
      nameEs: 'Chocolate caliente',
      nameHe: 'שוקו חם',
      description: null,
      descriptionEn: null,
      descriptionFr: null,
      descriptionEs: null,
      descriptionHe: null,
      price: 390,
      hasModifiers: true
    },
    {
      name: 'Crêpe',
      nameEn: 'Crêpe',
      nameFr: 'Crêpe',
      nameEs: 'Crêpe',
      nameHe: 'קרפ',
      description: 'Crêpe con topping a scelta',
      descriptionEn: 'Crêpe with topping of your choice',
      descriptionFr: 'Crêpe avec garniture au choix',
      descriptionEs: 'Crêpe con topping a elegir',
      descriptionHe: 'קרפ עם תוספת לבחירה',
      price: 900,
      hasModifiers: false
    },
    {
      name: 'Coppa Gelato',
      nameEn: 'Ice Cream Cup',
      nameFr: 'Coupe de Glace',
      nameEs: 'Copa de Helado',
      nameHe: 'גביע גלידה',
      description: null,
      descriptionEn: null,
      descriptionFr: null,
      descriptionEs: null,
      descriptionHe: null,
      price: 700,
      hasModifiers: false
    },
    {
      name: 'MyKafe Special',
      nameEn: 'MyKafe Special',
      nameFr: 'Spécial MyKafe',
      nameEs: 'Especial MyKafe',
      nameHe: 'מיוחד MyKafe',
      description: 'La nostra specialità',
      descriptionEn: 'Our specialty',
      descriptionFr: 'Notre spécialité',
      descriptionEs: 'Nuestra especialidad',
      descriptionHe: 'המיוחד שלנו',
      price: 900,
      hasModifiers: false
    },
    {
      name: 'Ice Chocolate/Caffè',
      nameEn: 'Iced Chocolate/Coffee',
      nameFr: 'Chocolat/Café glacé',
      nameEs: 'Chocolate/Café helado',
      nameHe: 'שוקו/קפה קר',
      description: null,
      descriptionEn: null,
      descriptionFr: null,
      descriptionEs: null,
      descriptionHe: null,
      price: 800,
      hasModifiers: false
    },
    {
      name: 'Milkshake',
      nameEn: 'Milkshake',
      nameFr: 'Milkshake',
      nameEs: 'Batido',
      nameHe: 'מילקשייק',
      description: null,
      descriptionEn: null,
      descriptionFr: null,
      descriptionEs: null,
      descriptionHe: null,
      price: 500,
      hasModifiers: true
    },
    {
      name: 'Frozen Cocktail',
      nameEn: 'Frozen Cocktail',
      nameFr: 'Cocktail glacé',
      nameEs: 'Cóctel helado',
      nameHe: 'קוקטייל קפוא',
      description: null,
      descriptionEn: null,
      descriptionFr: null,
      descriptionEs: null,
      descriptionHe: null,
      price: 500,
      hasModifiers: false
    },
  ]

  // Modificatori per caffetteria con traduzioni
  const caffeModifiers = [
    { name: '+ Panna', nameEn: '+ Whipped cream', nameFr: '+ Crème chantilly', nameEs: '+ Nata montada', nameHe: '+ קצפת', price: 100 },
    { name: '+ Pallina di gelato', nameEn: '+ Ice cream scoop', nameFr: '+ Boule de glace', nameEs: '+ Bola de helado', nameHe: '+ כדור גלידה', price: 100 },
  ]

  for (let i = 0; i < caffeItems.length; i++) {
    const item = await prisma.menuItem.create({
      data: {
        name: caffeItems[i].name,
        nameEn: caffeItems[i].nameEn,
        nameFr: caffeItems[i].nameFr,
        nameEs: caffeItems[i].nameEs,
        nameHe: caffeItems[i].nameHe,
        description: caffeItems[i].description,
        descriptionEn: caffeItems[i].descriptionEn,
        descriptionFr: caffeItems[i].descriptionFr,
        descriptionEs: caffeItems[i].descriptionEs,
        descriptionHe: caffeItems[i].descriptionHe,
        price: caffeItems[i].price,
        categoryId: caffetteria.id,
        sortOrder: i + 1,
      },
    })

    // Aggiungi modificatori per alcuni items della caffetteria
    if (caffeItems[i].hasModifiers) {
      await prisma.modifierGroup.create({
        data: {
          name: 'Extra',
          nameEn: 'Extra',
          nameFr: 'Extra',
          nameEs: 'Extra',
          nameHe: 'תוספות',
          required: false,
          multiSelect: true,
          maxSelect: 3,
          menuItemId: item.id,
          modifiers: {
            create: caffeModifiers,
          },
        },
      })
    }
  }
  console.log('✅ Creata caffetteria con traduzioni')

  console.log('🎉 Seed completato! Menu MyKafe pronto con tutte le traduzioni.')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
