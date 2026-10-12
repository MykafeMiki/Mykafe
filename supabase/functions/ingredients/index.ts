import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getSecretKey } from "../_shared/keys.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAdminToken, unauthorizedResponse } from "../_shared/validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
};

// ============================================================
// Helper functions per description matching pre-calcolato
// ============================================================

/**
 * Genera varianti italiano singolare/plurale
 */
function getItalianVariants(word: string): string[] {
  const variants = [word];

  // -o → -i (pomodoro → pomodori)
  if (word.endsWith("o")) {
    variants.push(word.slice(0, -1) + "i");
  }
  // -i → -o (pomodori → pomodoro)
  else if (word.endsWith("i")) {
    variants.push(word.slice(0, -1) + "o");
  }
  // -a → -e (mozzarella → mozzarelle)
  else if (word.endsWith("a")) {
    variants.push(word.slice(0, -1) + "e");
  }
  // -e → -a/-i (melanzane → melanzana)
  else if (word.endsWith("e")) {
    variants.push(word.slice(0, -1) + "a");
    variants.push(word.slice(0, -1) + "i");
  }

  return variants;
}

function generateCuid(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 9);
  return `c${timestamp}${randomPart}`;
}

/**
 * Calcola quali piatti contengono un ingrediente (tramite description matching)
 * e salva i risultati nella tabella MenuItemUnavailableIngredient
 */
async function calculateIngredientMatches(
  supabase: ReturnType<typeof createClient>,
  ingredientId: string,
  ingredientName: string,
  // Stessa logica per due usi: ingrediente esaurito (barrato nella descrizione)
  // e ingrediente che nasconde i piatti dal menu
  table: "MenuItemUnavailableIngredient" | "IngredientHiddenItem" = "MenuItemUnavailableIngredient"
): Promise<number> {
  // Genera varianti singolare/plurale italiano
  const variants = getItalianVariants(ingredientName.toLowerCase());

  // Prendi tutti i menu items con le loro descrizioni
  const { data: menuItems } = await supabase
    .from("MenuItem")
    .select("id, description, descriptionEn, descriptionFr, descriptionEs, descriptionHe");

  if (!menuItems) return 0;

  const matches: { menuItemId: string; matchedText: string }[] = [];

  for (const item of menuItems) {
    // Concatena tutte le descrizioni
    const allDescriptions = [
      item.description || "",
      item.descriptionEn || "",
      item.descriptionFr || "",
      item.descriptionEs || "",
      item.descriptionHe || "",
    ]
      .join(" ")
      .toLowerCase();

    // Cerca ogni variante
    for (const variant of variants) {
      if (allDescriptions.includes(variant)) {
        matches.push({
          menuItemId: item.id,
          matchedText: variant,
        });
        break; // Una volta trovato, passa al prossimo item
      }
    }
  }

  // Inserisci i match (upsert per evitare duplicati)
  if (matches.length > 0) {
    const records = matches.map((m) => ({
      id: generateCuid(),
      menuItemId: m.menuItemId,
      ingredientId: ingredientId,
      matchedText: m.matchedText,
    }));

    // Batch insert con ON CONFLICT DO NOTHING
    await supabase.from(table).upsert(records, {
      onConflict: "menuItemId,ingredientId",
      ignoreDuplicates: true,
    });
  }

  return matches.length;
}

/**
 * Rimuove i match quando l'ingrediente torna disponibile
 */
async function clearIngredientMatches(
  supabase: ReturnType<typeof createClient>,
  ingredientId: string,
  table: "MenuItemUnavailableIngredient" | "IngredientHiddenItem" = "MenuItemUnavailableIngredient"
): Promise<void> {
  await supabase.from(table).delete().eq("ingredientId", ingredientId);
}

/**
 * Prezzo in centesimi: intero >= 0. null/"" = nessun prezzo.
 * Ritorna undefined se il valore non e' valido.
 */
function normalizePrice(value: unknown): number | null | undefined {
  if (value === null || value === "") return null;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) return undefined;
  return value;
}

/**
 * Sostituisce l'insieme delle categorie ammesse per un ingrediente
 * (aggiunge le nuove, toglie quelle deselezionate).
 */
async function setIngredientCategories(
  supabase: ReturnType<typeof createClient>,
  ingredientId: string,
  categoryIds: string[]
): Promise<void> {
  const wanted = [...new Set(categoryIds)];

  const { data: existing, error: readError } = await supabase
    .from("IngredientCategory")
    .select("categoryId")
    .eq("ingredientId", ingredientId);
  if (readError) throw readError;

  const current = new Set((existing || []).map((r: { categoryId: string }) => r.categoryId));
  const toAdd = wanted.filter((id) => !current.has(id));
  const toRemove = [...current].filter((id) => !wanted.includes(id));

  if (toAdd.length > 0) {
    const { error } = await supabase
      .from("IngredientCategory")
      .insert(toAdd.map((categoryId) => ({ ingredientId, categoryId })));
    if (error) throw error;
  }
  if (toRemove.length > 0) {
    const { error } = await supabase
      .from("IngredientCategory")
      .delete()
      .eq("ingredientId", ingredientId)
      .in("categoryId", toRemove);
    if (error) throw error;

    // Deselezionato da una categoria: i piatti di quella categoria perdono
    // l'ingrediente (il prodotto non lo mantiene).
    const { data: itemsInRemoved, error: itemsError } = await supabase
      .from("MenuItem")
      .select("id")
      .in("categoryId", toRemove);
    if (itemsError) throw itemsError;

    const itemIds = (itemsInRemoved || []).map((i: { id: string }) => i.id);
    if (itemIds.length > 0) {
      const { error: unlinkError } = await supabase
        .from("MenuItemIngredient")
        .delete()
        .eq("ingredientId", ingredientId)
        .in("menuItemId", itemIds);
      if (unlinkError) throw unlinkError;
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      getSecretKey()
    );

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    // Path: /functions/v1/ingredients/... -> find 'ingredients' and take everything after
    const ingIndex = pathParts.indexOf("ingredients");
    const subPath = ingIndex >= 0 ? pathParts.slice(ingIndex + 1) : [];

    // Le letture sono pubbliche (menu); ogni modifica richiede l'admin.
    if (["POST", "PATCH", "DELETE", "PUT"].includes(req.method)) {
      if (!(await verifyAdminToken(req))) return unauthorizedResponse(corsHeaders);
    }

    // GET /ingredients - Get all ingredients (opzionale ?menuType=CLASSIC|SUSHI)
    if (req.method === "GET" && subPath.length === 0) {
      const menuType = url.searchParams.get("menuType");

      let query = supabase
        .from("Ingredient")
        .select(
          `
          *,
          menuItems:MenuItemIngredient(
            id,
            isPrimary,
            menuItem:MenuItem(id, name)
          ),
          modifiers:Modifier(id, name),
          categories:IngredientCategory(categoryId)
        `
        )
        .order("name", { ascending: true });

      if (menuType) {
        query = query.eq("menuType", menuType);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Appiattisce la relazione in categoryIds: e' quello che usa il frontend
      const ingredients = (data || []).map(
        ({ categories, ...ing }: { categories?: { categoryId: string }[] }) => ({
          ...ing,
          categoryIds: (categories || []).map((c) => c.categoryId),
        })
      );

      return new Response(JSON.stringify(ingredients), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PUT /ingredients/substitutes - Salva l'intera mappa ingrediente esaurito → sostituto.
    // Vive qui perche' AppSettings e' in sola lettura per la anon key (RLS):
    // serve la secret key, che su Vercel non c'e'.
    if (req.method === "PUT" && subPath[0] === "substitutes" && !subPath[1]) {
      const body = await req.json();
      if (!body || typeof body !== "object" || Array.isArray(body)) {
        return new Response(JSON.stringify({ error: "Invalid substitutes payload" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabase.from("AppSettings").upsert({
        key: "ingredient_substitutes",
        value: body,
        updatedAt: new Date().toISOString(),
      });

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /ingredients - Create ingredient
    if (req.method === "POST" && subPath.length === 0) {
      const body = await req.json();
      const { name, nameEn, nameFr, nameEs, nameHe, menuType, price, categoryIds } = body;

      const { data: created, error } = await supabase
        .from("Ingredient")
        .insert({
          name,
          nameEn: nameEn || null,
          nameFr: nameFr || null,
          nameEs: nameEs || null,
          nameHe: nameHe || null,
          inStock: true,
          menuType: menuType || "CLASSIC",
          price: normalizePrice(price) ?? null,
        })
        .select()
        .single();

      if (error) throw error;

      // Senza categorie esplicite il nuovo ingrediente parte ammesso ovunque
      // (come il backfill), cosi' non sparisce dai menu finche' non lo si spunta.
      let finalCategoryIds: string[];
      if (Array.isArray(categoryIds)) {
        finalCategoryIds = categoryIds;
      } else {
        const { data: allCategories, error: catError } = await supabase
          .from("Category")
          .select("id");
        if (catError) throw catError;
        finalCategoryIds = (allCategories || []).map((c: { id: string }) => c.id);
      }
      await setIngredientCategories(supabase, created.id, finalCategoryIds);

      const ingredient = { ...created, categoryIds: finalCategoryIds };

      return new Response(JSON.stringify(ingredient), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PATCH /ingredients/:id - Update ingredient (principalmente per inStock)
    if (req.method === "PATCH" && subPath[0]) {
      const ingredientId = subPath[0];
      const body = await req.json();
      const { name, nameEn, nameFr, nameEs, nameHe, inStock, menuType, price, categoryIds, hideDishes } = body;

      // Prima recupera l'ingrediente attuale per avere il nome e lo stato precedente
      const { data: currentIngredient } = await supabase
        .from("Ingredient")
        .select("name, inStock, hideDishes")
        .eq("id", ingredientId)
        .single();

      if (!currentIngredient) {
        return new Response(JSON.stringify({ error: "Ingredient not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const updateData: Record<string, unknown> = {};
      if (name !== undefined) updateData.name = name;
      if (nameEn !== undefined) updateData.nameEn = nameEn;
      if (nameFr !== undefined) updateData.nameFr = nameFr;
      if (nameEs !== undefined) updateData.nameEs = nameEs;
      if (nameHe !== undefined) updateData.nameHe = nameHe;
      if (inStock !== undefined) updateData.inStock = inStock;
      if (menuType !== undefined) updateData.menuType = menuType;
      if (hideDishes !== undefined) {
        if (typeof hideDishes !== "boolean") {
          return new Response(JSON.stringify({ error: "Invalid hideDishes" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        updateData.hideDishes = hideDishes;
      }

      // price: numero in centesimi, oppure null per toglierlo
      let newPrice: number | null | undefined;
      if (price !== undefined) {
        newPrice = normalizePrice(price);
        if (newPrice === undefined) {
          return new Response(JSON.stringify({ error: "Invalid price" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        updateData.price = newPrice;
      }

      if (categoryIds !== undefined && !Array.isArray(categoryIds)) {
        return new Response(JSON.stringify({ error: "Invalid categoryIds" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update ingredient (se c'e' qualcosa da aggiornare: con solo categoryIds
      // updateData e' vuoto e un UPDATE senza colonne fallirebbe)
      const { data: ingredient, error } =
        Object.keys(updateData).length > 0
          ? await supabase
              .from("Ingredient")
              .update(updateData)
              .eq("id", ingredientId)
              .select()
              .single()
          : await supabase.from("Ingredient").select().eq("id", ingredientId).single();

      if (error) throw error;

      if (Array.isArray(categoryIds)) {
        await setIngredientCategories(supabase, ingredientId, categoryIds);
      }

      // ===== Nascondi/ripristina i piatti con questo ingrediente =====
      // I piatti associati all'ingrediente si nascondono dal flag stesso (letto dal menu);
      // quelli che lo citano solo nella descrizione si pre-calcolano qui, come per gli esauriti.
      if (typeof hideDishes === "boolean" && hideDishes !== currentIngredient.hideDishes) {
        if (hideDishes) {
          const hiddenCount = await calculateIngredientMatches(
            supabase,
            ingredientId,
            name || currentIngredient.name,
            "IngredientHiddenItem"
          );
          console.log(`Ingredient ${ingredient.name} hides dishes: ${hiddenCount} via description`);
        } else {
          await clearIngredientMatches(supabase, ingredientId, "IngredientHiddenItem");
        }
      }

      // Il prezzo dell'ingrediente diventa il prezzo di tutte le sue aggiunte:
      // l'ordine legge Modifier.price, quindi va tenuto allineato qui.
      if (typeof newPrice === "number") {
        const { error: modPriceError } = await supabase
          .from("Modifier")
          .update({ price: newPrice })
          .eq("ingredientId", ingredientId);
        if (modPriceError) throw modPriceError;
      }

      // ===== Gestione description matching pre-calcolato =====
      // Se lo stock è cambiato, aggiorna i match nella tabella pre-calcolata
      if (inStock !== undefined && inStock !== currentIngredient.inStock) {
        if (inStock === false) {
          // Ingrediente esaurito: calcola i match nelle descrizioni
          const ingredientName = name || currentIngredient.name;
          const matchCount = await calculateIngredientMatches(
            supabase,
            ingredientId,
            ingredientName
          );
          console.log(
            `Ingredient ${ingredientName} out of stock: found ${matchCount} menu items via description`
          );
        } else {
          // Ingrediente tornato disponibile: rimuovi i match
          await clearIngredientMatches(supabase, ingredientId);
          console.log(`Ingredient ${ingredient.name} back in stock: cleared description matches`);
        }
      }

      // Note: Do NOT modify Modifier.available based on ingredient stock.
      // Modifiers are filtered in the menu API based on outOfStockIds.
      // MenuItem should always remain available if available: true.

      // Restituisce sempre le categorie aggiornate, cosi' il frontend resta coerente
      const { data: catRows } = await supabase
        .from("IngredientCategory")
        .select("categoryId")
        .eq("ingredientId", ingredientId);

      return new Response(
        JSON.stringify({
          ...ingredient,
          categoryIds: (catRows || []).map((c: { categoryId: string }) => c.categoryId),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST /ingredients/:id/menu-items - Associate ingredient with menu item
    if (req.method === "POST" && subPath[0] && subPath[1] === "menu-items") {
      const ingredientId = subPath[0];
      const body = await req.json();
      const { menuItemId, isPrimary } = body;

      const { data: association, error } = await supabase
        .from("MenuItemIngredient")
        .insert({
          ingredientId,
          menuItemId,
          isPrimary: isPrimary || false,
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(association), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DELETE /ingredients/:ingredientId/menu-items/:menuItemId - Remove association
    if (req.method === "DELETE" && subPath[0] && subPath[1] === "menu-items" && subPath[2]) {
      const ingredientId = subPath[0];
      const menuItemId = subPath[2];

      const { error } = await supabase
        .from("MenuItemIngredient")
        .delete()
        .eq("ingredientId", ingredientId)
        .eq("menuItemId", menuItemId);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DELETE /ingredients/:id - Delete ingredient
    if (req.method === "DELETE" && subPath[0] && !subPath[1]) {
      const ingredientId = subPath[0];

      const { error } = await supabase.from("Ingredient").delete().eq("id", ingredientId);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /ingredients/:id/modifiers - Associate ingredient with modifier
    if (req.method === "POST" && subPath[0] && subPath[1] === "modifiers") {
      const ingredientId = subPath[0];
      const body = await req.json();
      const { modifierId } = body;

      const { data: modifier, error } = await supabase
        .from("Modifier")
        .update({ ingredientId })
        .eq("id", modifierId)
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(modifier), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
