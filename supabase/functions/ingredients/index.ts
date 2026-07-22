import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getSecretKey } from "../_shared/keys.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAdminToken, unauthorizedResponse } from "../_shared/validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
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
  ingredientName: string
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
    await supabase.from("MenuItemUnavailableIngredient").upsert(records, {
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
  ingredientId: string
): Promise<void> {
  await supabase.from("MenuItemUnavailableIngredient").delete().eq("ingredientId", ingredientId);
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
          modifiers:Modifier(id, name)
        `
        )
        .order("name", { ascending: true });

      if (menuType) {
        query = query.eq("menuType", menuType);
      }

      const { data: ingredients, error } = await query;

      if (error) throw error;

      return new Response(JSON.stringify(ingredients), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /ingredients - Create ingredient
    if (req.method === "POST" && subPath.length === 0) {
      const body = await req.json();
      const { name, nameEn, nameFr, nameEs, nameHe, menuType } = body;

      const { data: ingredient, error } = await supabase
        .from("Ingredient")
        .insert({
          name,
          nameEn: nameEn || null,
          nameFr: nameFr || null,
          nameEs: nameEs || null,
          nameHe: nameHe || null,
          inStock: true,
          menuType: menuType || "CLASSIC",
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(ingredient), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PATCH /ingredients/:id - Update ingredient (principalmente per inStock)
    if (req.method === "PATCH" && subPath[0]) {
      const ingredientId = subPath[0];
      const body = await req.json();
      const { name, nameEn, nameFr, nameEs, nameHe, inStock, menuType } = body;

      // Prima recupera l'ingrediente attuale per avere il nome e lo stato precedente
      const { data: currentIngredient } = await supabase
        .from("Ingredient")
        .select("name, inStock")
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

      // Update ingredient
      const { data: ingredient, error } = await supabase
        .from("Ingredient")
        .update(updateData)
        .eq("id", ingredientId)
        .select()
        .single();

      if (error) throw error;

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

      return new Response(JSON.stringify(ingredient), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
