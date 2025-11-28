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
  await prisma.menuItem.deleteMany()
  await prisma.category.deleteMany()
  await prisma.table.deleteMany()

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
      description: 'Ogni toast viene servito con un contorno di insalata',
      sortOrder: 1,
    },
  })

  const salad = await prisma.category.create({
    data: {
      name: 'Salad',
      description: 'Insalate fresche e genuine',
      sortOrder: 2,
    },
  })

  const piadina = await prisma.category.create({
    data: {
      name: 'Piadina',
      description: 'Piadine farcite con ingredienti freschi',
      sortOrder: 3,
    },
  })

  const affumicato = await prisma.category.create({
    data: {
      name: 'Affumicato',
      description: 'Specialità con salmone affumicato',
      sortOrder: 4,
    },
  })

  const caprese = await prisma.category.create({
    data: {
      name: 'Caprese',
      description: 'Le nostre capresi',
      sortOrder: 5,
    },
  })

  const bruschetta = await prisma.category.create({
    data: {
      name: 'Bruschetta',
      description: 'Bruschette tradizionali',
      sortOrder: 6,
    },
  })

  const pizzaFocaccia = await prisma.category.create({
    data: {
      name: 'Pizza e Focaccia',
      description: 'Pizza e focaccia fatte in casa',
      sortOrder: 7,
    },
  })

  const bevande = await prisma.category.create({
    data: {
      name: 'Bevande',
      description: 'Bevande fresche',
      sortOrder: 8,
    },
  })

  const caffetteria = await prisma.category.create({
    data: {
      name: 'Caffetteria',
      description: 'Dolci e bevande calde',
      sortOrder: 9,
    },
  })

  console.log('✅ Create categorie')

  // ============== TOAST ==============
  const toastItems = [
    { name: 'Toast 01', description: 'Ciabatta, mozzarella, pomodoro, rucola', price: 890 },
    { name: 'Toast 02', description: 'Bagel, mozzarella, zucchine, pomodoro', price: 890 },
    { name: 'Toast 03', description: 'Pane arabo, mozzarella, melanzane, pomodoro, maionese', price: 890 },
    { name: 'Toast 04', description: 'Bagel, tonno, pomodoro, cipolla, rucola, maionese', price: 890 },
    { name: 'Toast 05', description: 'Bagel, salmone affumicato, pomodoro, rucola, maionese', price: 1000 },
    { name: 'Toast 06', description: 'Focaccia, mozzarella, pomodoro, melanzane, zucchine', price: 900 },
    { name: 'Toast 07', description: 'Bagel, mozzarella, pomodoro, pesto, rucola', price: 890 },
    { name: 'Toast 08', description: 'Pane arabo, mozzarella, funghi, origano, pomodoro, insalata', price: 890 },
    { name: 'Toast 09', description: 'Ciabatta, formaggi misti, pomodoro, insalata', price: 890 },
    { name: 'Toast 10', description: 'Bagel, salmone affumicato, lattuga, cetrioli, pesto, maionese', price: 1000 },
    { name: 'Toast 11', description: 'Bagel, mozzarella, peperoni, melanzane, maionese, chimichurri', price: 890 },
    { name: 'Toast 12', description: 'Pane arabo, tonno, zucchine, lattuga, chimichurri, maionese', price: 890 },
    { name: 'Toast 13', description: 'Ciabatta, mozzarella, pomodoro, carciofi, maionese', price: 890 },
    { name: 'Toast 15', description: 'Bagel, pomodoro, zucchine, melanzane, avocado, carciofi, maionese', price: 900 },
    { name: 'Toast 16', description: 'Focaccia, salmone affumicato, rucola, avocado, zucchine, pesto, maionese', price: 1090 },
    { name: 'Toast 17', description: 'Ciabatta, tonno, pomodoro, lattuga, cipolle, ketchup', price: 990 },
    { name: 'Toast 18', description: 'Ciabatta, formaggi misti, patè di olive, rucola, melanzane, maionese', price: 900 },
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
        required: false,
        multiSelect: true,
        maxSelect: 5,
        menuItemId: item.id,
        modifiers: {
          create: [
            { name: 'Variazione a focaccia', price: 50 },
            { name: '+ Mozzarella', price: 200 },
            { name: '+ Tonno', price: 200 },
            { name: '+ Avocado', price: 200 },
            { name: '+ Pesto', price: 50 },
            { name: '+ Patè di olive', price: 50 },
            { name: '+ Carciofi', price: 100 },
            { name: '+ Verdure varie', price: 50 },
          ],
        },
      },
    })
  }
  console.log('✅ Creati toast con modificatori')

  // ============== SALAD ==============
  const saladItems = [
    { name: 'Salad 01', description: 'Insalata, mozzarelline, pomodori, cetrioli, carote, olive', price: 1050 },
    { name: 'Salad 02', description: 'Insalata, tonno, pomodori, mais, olive, cipolle', price: 1050 },
    { name: 'Salad 03', description: 'Insalata, salmone affumicato, avocado, pomodori, olive', price: 1190 },
    { name: 'Salad 04', description: 'Insalata, feta, rucola, pomodori, cetrioli, melanzane, olive', price: 1090 },
    { name: 'Salad 05', description: 'Insalata, zucchine e melanzane grigliate, cetrioli, pomodori, carote, avocado, mais', price: 950 },
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
        required: false,
        multiSelect: true,
        maxSelect: 5,
        menuItemId: item.id,
        modifiers: {
          create: [
            { name: '+ Salmone affumicato', price: 300 },
            { name: '+ Mozzarella', price: 200 },
            { name: '+ Tonno', price: 200 },
            { name: '+ Avocado', price: 100 },
            { name: '+ Carciofi', price: 100 },
            { name: '+ Pesto', price: 50 },
            { name: '+ Verdure varie', price: 50 },
          ],
        },
      },
    })
  }
  console.log('✅ Create insalate')

  // ============== PIADINA ==============
  const piadinaItems = [
    { name: 'Piadina 01', description: 'Mozzarella, pomodoro, zucchine, maionese', price: 990 },
    { name: 'Piadina 02', description: 'Mozzarella, pomodoro, pesto, rucola', price: 990 },
    { name: 'Piadina 03', description: 'Formaggi misti, peperoni, pomodoro, maionese', price: 990 },
    { name: 'Piadina 04', description: 'Mozzarella, formaggi misti, pomodoro, funghi, rucola', price: 990 },
    { name: 'Piadina 05', description: 'Zucchine, melanzane, peperoni, avocado, funghi, pesto', price: 990 },
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
  console.log('✅ Create piadine')

  // ============== AFFUMICATO ==============
  await prisma.menuItem.create({
    data: {
      name: 'Piatto Affumicato',
      description: 'Salmone affumicato, pomodori, zucchine, avocado, rucola, mais',
      price: 1350,
      categoryId: affumicato.id,
      sortOrder: 1,
    },
  })
  console.log('✅ Creato affumicato')

  // ============== CAPRESE ==============
  const capreseItems = [
    { name: 'Caprese 01', description: 'Mozzarella, pomodoro, rucola, zucchine, pesto', price: 1090 },
    { name: 'Caprese 02', description: 'Tonno, rucola, pomodoro, zucchine, melanzane, carote, avocado', price: 1090 },
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
  console.log('✅ Create capresi')

  // ============== BRUSCHETTA ==============
  const bruschettaItems = [
    { name: 'Bruschetta 01', description: 'Pane tostato, pomodoro, pesto/chimichurri', price: 700 },
    { name: 'Bruschetta 02', description: 'Pane tostato, pomodoro, pesto/chimichurri, mozzarella', price: 800 },
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
  console.log('✅ Create bruschette')

  // ============== PIZZA E FOCACCIA ==============
  const pizzaItems = [
    { name: 'Pizza Margherita', description: 'Pizza, mozzarella, pomodoro', price: 490 },
    { name: 'Focaccia', description: 'Focaccia, mozzarella', price: 490 },
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
        required: false,
        multiSelect: true,
        maxSelect: 5,
        menuItemId: item.id,
        modifiers: {
          create: [
            { name: '+ Pesto', price: 50 },
            { name: '+ Avocado', price: 100 },
            { name: '+ Carciofi', price: 100 },
            { name: '+ Verdure varie', price: 50 },
          ],
        },
      },
    })
  }
  console.log('✅ Create pizza e focaccia')

  // ============== BEVANDE ==============
  const bevandeItems = [
    { name: 'Acqua', description: null, price: 150 },
    { name: 'Coca Cola / Fanta / Sprite / Nestea / Estathe', description: null, price: 300 },
    { name: 'Spremuta Arancia', description: 'Spremuta fresca di arancia', price: 450 },
    { name: 'Succhi di frutta', description: null, price: 350 },
    { name: 'Acqua tonica / Ginger Ale / Lemon Soda', description: null, price: 300 },
    { name: 'Birra 33cl', description: null, price: 400 },
    { name: 'Bicchiere di vino', description: null, price: 400 },
  ]

  for (let i = 0; i < bevandeItems.length; i++) {
    await prisma.menuItem.create({
      data: {
        name: bevandeItems[i].name,
        description: bevandeItems[i].description,
        price: bevandeItems[i].price,
        categoryId: bevande.id,
        sortOrder: i + 1,
      },
    })
  }
  console.log('✅ Create bevande')

  // ============== CAFFETTERIA ==============
  const caffeItems = [
    { name: 'Affogato al caffè', description: 'Una pallina a scelta', price: 300 },
    { name: 'Cioccolata calda', description: null, price: 390 },
    { name: 'Crêpe', description: 'Crêpe con topping a scelta', price: 900 },
    { name: 'Coppa Gelato', description: null, price: 700 },
    { name: 'MyKafe Special', description: 'La nostra specialità', price: 900 },
    { name: 'Ice Chocolate/Caffè', description: null, price: 800 },
    { name: 'Milkshake', description: null, price: 500 },
    { name: 'Frozen Cocktail', description: null, price: 500 },
  ]

  for (let i = 0; i < caffeItems.length; i++) {
    const item = await prisma.menuItem.create({
      data: {
        name: caffeItems[i].name,
        description: caffeItems[i].description,
        price: caffeItems[i].price,
        categoryId: caffetteria.id,
        sortOrder: i + 1,
      },
    })

    // Aggiungi modificatori per alcuni items della caffetteria
    if (['Affogato al caffè', 'Cioccolata calda', 'Milkshake'].includes(caffeItems[i].name)) {
      await prisma.modifierGroup.create({
        data: {
          name: 'Extra',
          required: false,
          multiSelect: true,
          maxSelect: 3,
          menuItemId: item.id,
          modifiers: {
            create: [
              { name: '+ Panna', price: 100 },
              { name: '+ Pallina di gelato', price: 100 },
            ],
          },
        },
      })
    }
  }
  console.log('✅ Creata caffetteria')

  console.log('🎉 Seed completato! Menu MyKafe pronto.')
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
