/**
 * SOLUZIONE: Pre-calcolo description matching
 * 
 * QUANDO: ingrediente marcato out-of-stock
 * COSA: cerca l'ingrediente nelle descrizioni di tutti i piatti
 * DOVE: salva i match in `MenuItemUnavailableIngredient`
 * 
 * Il menu endpoint fa un semplice JOIN invece del loop O(items × ingredients)
 * 
 * Costo totale giornaliero:
 * - Prima: 1000 richieste × 100 items × 50 ingredienti = 5.000.000 operazioni
 * - Dopo: 3 ingredienti finiti × 100 items = 300 operazioni
 */

// ============================================================
// STEP 1: Migration SQL
// ============================================================

const MIGRATION_SQL = `
-- Tabella per match description pre-calcolati
CREATE TABLE IF NOT EXISTS "MenuItemUnavailableIngredient" (
  "id" TEXT NOT NULL,
  "menuItemId" TEXT NOT NULL,
  "ingredientId" TEXT NOT NULL,
  "matchedText" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "MenuItemUnavailableIngredient_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MenuItemUnavailableIngredient_menuItemId_fkey" 
    FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE,
  CONSTRAINT "MenuItemUnavailableIngredient_ingredientId_fkey" 
    FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "MenuItemUnavailableIngredient_menuItemId_ingredientId_key" 
  ON "MenuItemUnavailableIngredient"("menuItemId", "ingredientId");
CREATE INDEX "MenuItemUnavailableIngredient_ingredientId_idx" 
  ON "MenuItemUnavailableIngredient"("ingredientId");
CREATE INDEX "MenuItemUnavailableIngredient_menuItemId_idx" 
  ON "MenuItemUnavailableIngredient"("menuItemId");
`;

// ============================================================
// STEP 2: Prisma Schema (aggiungi a schema.prisma)
// ============================================================

const PRISMA_MODEL = `
// Associazioni ingrediente-piatto da description matching (pre-calcolate)
model MenuItemUnavailableIngredient {
  id           String     @id @default(cuid())
  menuItemId   String
  menuItem     MenuItem   @relation(fields: [menuItemId], references: [id], onDelete: Cascade)
  ingredientId String
  ingredient   Ingredient @relation(fields: [ingredientId], references: [id], onDelete: Cascade)
  matchedText  String?    // Testo che ha matchato (debug)
  createdAt    DateTime   @default(now())

  @@unique([menuItemId, ingredientId])
  @@index([ingredientId])
  @@index([menuItemId])
}

// Aggiungi relazione a MenuItem:
// unavailableIngredients MenuItemUnavailableIngredient[]

// Aggiungi relazione a Ingredient:
// unavailableInMenuItems MenuItemUnavailableIngredient[]
`;

// ============================================================
// STEP 3: Funzione di calcolo match (da chiamare quando cambia stock)
// ============================================================

/**
 * Calcola quali piatti contengono un ingrediente (tramite description matching)
 * e salva i risultati nella tabella MenuItemUnavailableIngredient
 */
async function calculateIngredientMatches(
  supabase: SupabaseClient,
  ingredientId: string,
  ingredientName: string
): Promise<number> {
  
  // Genera varianti singolare/plurale italiano
  const variants = getItalianVariants(ingredientName.toLowerCase())
  
  // Prendi tutti i menu items con le loro descrizioni
  const { data: menuItems } = await supabase
    .from('MenuItem')
    .select('id, description, descriptionEn, descriptionFr, descriptionEs, descriptionHe')
  
  if (!menuItems) return 0
  
  const matches: { menuItemId: string; matchedText: string }[] = []
  
  for (const item of menuItems) {
    // Concatena tutte le descrizioni
    const allDescriptions = [
      item.description || '',
      item.descriptionEn || '',
      item.descriptionFr || '',
      item.descriptionEs || '',
      item.descriptionHe || ''
    ].join(' ').toLowerCase()
    
    // Cerca ogni variante
    for (const variant of variants) {
      if (allDescriptions.includes(variant)) {
        matches.push({
          menuItemId: item.id,
          matchedText: variant
        })
        break // Una volta trovato, passa al prossimo item
      }
    }
  }
  
  // Inserisci i match (upsert per evitare duplicati)
  if (matches.length > 0) {
    const records = matches.map(m => ({
      id: generateCuid(),
      menuItemId: m.menuItemId,
      ingredientId: ingredientId,
      matchedText: m.matchedText
    }))
    
    // Batch insert con ON CONFLICT DO NOTHING
    await supabase
      .from('MenuItemUnavailableIngredient')
      .upsert(records, { 
        onConflict: 'menuItemId,ingredientId',
        ignoreDuplicates: true 
      })
  }
  
  return matches.length
}

/**
 * Rimuove i match quando l'ingrediente torna disponibile
 */
async function clearIngredientMatches(
  supabase: SupabaseClient,
  ingredientId: string
): Promise<void> {
  await supabase
    .from('MenuItemUnavailableIngredient')
    .delete()
    .eq('ingredientId', ingredientId)
}

/**
 * Varianti italiano singolare/plurale
 */
function getItalianVariants(word: string): string[] {
  const variants = [word]
  
  // -o → -i (pomodoro → pomodori)
  if (word.endsWith('o')) {
    variants.push(word.slice(0, -1) + 'i')
  }
  // -i → -o (pomodori → pomodoro)
  else if (word.endsWith('i')) {
    variants.push(word.slice(0, -1) + 'o')
  }
  // -a → -e (mozzarella → mozzarelle)
  else if (word.endsWith('a')) {
    variants.push(word.slice(0, -1) + 'e')
  }
  // -e → -a/-i (melanzane → melanzana)
  else if (word.endsWith('e')) {
    variants.push(word.slice(0, -1) + 'a')
    variants.push(word.slice(0, -1) + 'i')
  }
  
  return variants
}

function generateCuid(): string {
  const timestamp = Date.now().toString(36)
  const randomPart = Math.random().toString(36).substring(2, 9)
  return `c${timestamp}${randomPart}`
}

// ============================================================
// STEP 4: Modifica a supabase/functions/ingredients/index.ts
// Nel PATCH quando inStock cambia
// ============================================================

const INGREDIENTS_PATCH_CODE = `
// PATCH /ingredients/:id - Update ingredient
if (req.method === 'PATCH' && subPath[0]) {
  const ingredientId = subPath[0]
  const body = await req.json()
  const { name, nameEn, nameFr, nameEs, nameHe, inStock, menuType } = body

  // Prima recupera l'ingrediente attuale per avere il nome
  const { data: currentIngredient } = await supabase
    .from('Ingredient')
    .select('name, inStock')
    .eq('id', ingredientId)
    .single()

  if (!currentIngredient) {
    return new Response(JSON.stringify({ error: 'Ingredient not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const updateData: Record<string, unknown> = {}
  if (name !== undefined) updateData.name = name
  if (nameEn !== undefined) updateData.nameEn = nameEn
  if (nameFr !== undefined) updateData.nameFr = nameFr
  if (nameEs !== undefined) updateData.nameEs = nameEs
  if (nameHe !== undefined) updateData.nameHe = nameHe
  if (inStock !== undefined) updateData.inStock = inStock
  if (menuType !== undefined) updateData.menuType = menuType

  // Update ingredient
  const { data: ingredient, error } = await supabase
    .from('Ingredient')
    .update(updateData)
    .eq('id', ingredientId)
    .select()
    .single()

  if (error) throw error

  // ===== NUOVO: Gestione description matching pre-calcolato =====
  
  // Se lo stock è cambiato, aggiorna i match
  if (inStock !== undefined && inStock !== currentIngredient.inStock) {
    if (inStock === false) {
      // Ingrediente esaurito: calcola i match nelle descrizioni
      const ingredientName = name || currentIngredient.name
      const matchCount = await calculateIngredientMatches(supabase, ingredientId, ingredientName)
      console.log(\`Ingredient \${ingredientName} out of stock: found \${matchCount} menu items via description\`)
      
      // ... resto della logica esistente per disabilitare piatti/modifiers ...
      
    } else {
      // Ingrediente tornato disponibile: rimuovi i match
      await clearIngredientMatches(supabase, ingredientId)
      console.log(\`Ingredient \${ingredient.name} back in stock: cleared description matches\`)
      
      // ... resto della logica esistente per riabilitare ...
    }
  }

  return new Response(JSON.stringify(ingredient), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}
`;

// ============================================================
// STEP 5: Modifica a supabase/functions/menu/index.ts
// Leggi dalla tabella pre-calcolata invece di fare il matching
// ============================================================

const MENU_OPTIMIZED_CODE = `
// GET /menu - Con lettura da tabella pre-calcolata
if (req.method === 'GET' && subPath.length === 0) {
  
  // Query parallele
  const [categoriesResult, unavailableResult] = await Promise.all([
    // Menu principale
    supabase
      .from('Category')
      .select(\`
        id, name, nameEn, nameFr, nameEs, nameHe,
        description, imageUrl, sortOrder, active,
        items:MenuItem(
          id, name, nameEn, nameFr, nameEs, nameHe,
          description, descriptionEn, descriptionFr, descriptionEs, descriptionHe,
          price, priceTakeaway, priceTakeawayRemote,
          imageUrl, available, sortOrder, categoryId,
          modifierGroups:ModifierGroup(
            id, name, nameEn, nameFr, nameEs, nameHe,
            required, multiSelect, minSelect, maxSelect,
            modifiers:Modifier(id, name, price, available, ingredientId)
          )
        )
      \`)
      .eq('active', true)
      .order('sortOrder'),
    
    // Ingredienti non disponibili con i loro match pre-calcolati
    supabase
      .from('Ingredient')
      .select(\`
        id, name, nameEn, nameFr, nameEs, nameHe,
        menuItemMatches:MenuItemUnavailableIngredient(menuItemId)
      \`)
      .eq('inStock', false)
  ])

  if (categoriesResult.error) throw categoriesResult.error

  // Costruisci mappa: menuItemId -> ingredienti non disponibili
  const itemUnavailableMap = new Map<string, typeof unavailableResult.data>()
  
  for (const ing of unavailableResult.data || []) {
    for (const match of ing.menuItemMatches || []) {
      if (!itemUnavailableMap.has(match.menuItemId)) {
        itemUnavailableMap.set(match.menuItemId, [])
      }
      itemUnavailableMap.get(match.menuItemId)!.push({
        id: ing.id,
        name: ing.name,
        nameEn: ing.nameEn,
        nameFr: ing.nameFr,
        nameEs: ing.nameEs,
        nameHe: ing.nameHe
      })
    }
  }

  // Set di ingredientId out-of-stock per filtrare modifiers
  const outOfStockIds = new Set(
    (unavailableResult.data || []).map(i => i.id)
  )

  // Filtra e arricchisci le categorie
  const filteredCategories = categoriesResult.data.map(category => ({
    ...category,
    items: (category.items || [])
      .filter(item => item.available)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(item => ({
        ...item,
        // Aggiungi ingredienti non disponibili (da tabella pre-calcolata)
        unavailableIngredients: itemUnavailableMap.get(item.id) || [],
        // Filtra modifiers
        modifierGroups: item.modifierGroups?.map(group => ({
          ...group,
          modifiers: group.modifiers?.filter(mod => {
            if (!mod.available) return false
            if (mod.ingredientId && outOfStockIds.has(mod.ingredientId)) return false
            return true
          })
        }))
      }))
  }))

  return new Response(JSON.stringify(filteredCategories), {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=300'
    }
  })
}
`;

export { MIGRATION_SQL, PRISMA_MODEL, INGREDIENTS_PATCH_CODE, MENU_OPTIMIZED_CODE }
