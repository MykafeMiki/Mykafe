import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buildIngredientIndex, fillDescriptionTranslations } from "@/lib/menuDescription";
import { buildIngredientCategoryMap, isModifierAllowedInCategory } from "@/lib/ingredientCategories";
import { HIDING_INGREDIENTS_SELECT, buildHiddenItemIds } from "@/lib/hiddenDishes";

// Force dynamic: evita pre-rendering a build time (env vars non disponibili)
export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(
    (process.env.NEXT_PUBLIC_SUPABASE_URL || "https://biefwzrprjqusjynqwus.supabase.co").replace("supabase.con", "supabase.co"),
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  );
}

export async function GET() {
  const supabase = getSupabase();

  try {
    // Query parallele per massima velocità
    const [categoriesResult, outOfStockResult, ingredientsResult, ingredientCategoriesResult, hidingResult] = await Promise.all([
      // Menu principale con ingredienti
      supabase
        .from("Category")
        .select(
          `
          id, name, nameEn, nameFr, nameEs, nameHe,
          description, descriptionEn, descriptionFr, descriptionEs, descriptionHe,
          imageUrl, sortOrder, active,
          items:MenuItem(
            id, name, nameEn, nameFr, nameEs, nameHe,
            description, descriptionEn, descriptionFr, descriptionEs, descriptionHe,
            price, priceTakeaway, priceTakeawayRemote, priceTakeawayCard,
            imageUrl, available, sortOrder, categoryId,
            modifierGroups:ModifierGroup(
              id, name, nameEn, nameFr, nameEs, nameHe,
              required, multiSelect, minSelect, maxSelect, menuItemId,
              modifiers:Modifier(
                id, name, nameEn, nameFr, nameEs, nameHe,
                price, available, modifierGroupId, ingredientId
              )
            ),
            ingredients:MenuItemIngredient(
              ingredient:Ingredient(id, name, nameEn, nameFr, nameEs, nameHe, inStock)
            )
          )
        `
        )
        .eq("active", true)
        .order("sortOrder", { ascending: true }),

      // Ingredienti non disponibili con match pre-calcolati
      supabase
        .from("Ingredient")
        .select(
          `
          id, name, nameEn, nameFr, nameEs, nameHe,
          menuItemMatches:MenuItemUnavailableIngredient(menuItemId)
        `
        )
        .eq("inStock", false),

      // Tutti gli ingredienti: servono a tradurre le descrizioni voce per voce
      supabase.from("Ingredient").select("name, nameEn, nameFr, nameEs, nameHe"),

      // Destinazioni d'uso: in quali categorie e' ammesso ogni ingrediente
      supabase.from("IngredientCategory").select("ingredientId, categoryId"),

      // Ingredienti con "nascondi piatti" attivo (query a parte: senza migrazione il menu funziona comunque)
      supabase.from("Ingredient").select(HIDING_INGREDIENTS_SELECT).eq("hideDishes", true),
    ]);

    if (categoriesResult.error) throw categoriesResult.error;

    if (hidingResult.error) {
      console.error("Hidden dishes fetch error:", hidingResult.error);
    }
    const hiddenItemIds = buildHiddenItemIds(hidingResult.error ? null : hidingResult.data);

    // Se la lettura fallisce (migrazione non applicata) non si filtra: meglio
    // mostrare tutte le aggiunte che nasconderle tutte.
    const ingredientCategoryMap = ingredientCategoriesResult.error
      ? null
      : buildIngredientCategoryMap(ingredientCategoriesResult.data || []);
    if (ingredientCategoriesResult.error) {
      console.error("IngredientCategory fetch error:", ingredientCategoriesResult.error);
    }

    const categories = categoriesResult.data || [];
    const ingredientIndex = buildIngredientIndex(ingredientsResult.data || []);

    // Mappa sostituti: ingredientId -> { id, name, ... } — query separata per non rompere i tipi
    const substitutesRes = await supabase
      .from("AppSettings")
      .select("value")
      .eq("key", "ingredient_substitutes")
      .single();

    if (substitutesRes.error && substitutesRes.error.code !== "PGRST116") {
      throw substitutesRes.error;
    }

    const substituteMap: Record<
      string,
      {
        id: string;
        name: string;
        nameEn?: string;
        nameFr?: string;
        nameEs?: string;
        nameHe?: string;
      }
    > =
      ((substitutesRes.data as { value?: Record<string, unknown> } | null)?.value as Record<
        string,
        { id: string; name: string }
      >) || {};

    // Mappa: menuItemId -> ingredienti non disponibili (da description matching pre-calcolato)
    const itemUnavailableMap = new Map<
      string,
      {
        id: string;
        name: string;
        nameEn?: string;
        nameFr?: string;
        nameEs?: string;
        nameHe?: string;
      }[]
    >();
    const outOfStockIds = new Set<string>();

    for (const ing of outOfStockResult.data || []) {
      outOfStockIds.add(ing.id);
      for (const match of ing.menuItemMatches || []) {
        if (!itemUnavailableMap.has(match.menuItemId)) {
          itemUnavailableMap.set(match.menuItemId, []);
        }
        itemUnavailableMap.get(match.menuItemId)!.push({
          id: ing.id,
          name: ing.name,
          nameEn: ing.nameEn,
          nameFr: ing.nameFr,
          nameEs: ing.nameEs,
          nameHe: ing.nameHe,
        });
      }
    }

    // Supabase nested select can return relation fields as object or single-item array.
    // Normalize access once to avoid brittle runtime/type errors.
    const getIngredientFromAssoc = (
      assoc: { ingredient?: unknown } | null | undefined
    ): {
      id: string;
      name: string;
      nameEn?: string;
      nameFr?: string;
      nameEs?: string;
      nameHe?: string;
      inStock: boolean;
    } | null => {
      const raw = assoc?.ingredient;
      const ingredient = Array.isArray(raw) ? raw[0] : raw;
      if (!ingredient || typeof ingredient !== "object") return null;
      return ingredient as {
        id: string;
        name: string;
        nameEn?: string;
        nameFr?: string;
        nameEs?: string;
        nameHe?: string;
        inStock: boolean;
      };
    };

    // Filtra items e modifiers
    const menu = categories.map((category) => ({
      ...category,
      items: (category.items || [])
        // Via i piatti disattivati e quelli con un ingrediente che nasconde i piatti
        .filter((item) => item.available && !hiddenItemIds.has(item.id))
        .sort((a: { sortOrder: number }, b: { sortOrder: number }) => a.sortOrder - b.sortOrder)
        .map((item) => {
          // Ingredienti non disponibili da due fonti:
          // 1. Associazioni dirette (MenuItemIngredient dove ingredient.inStock = false)
          const explicitUnavailable: Array<{
            id: string;
            name: string;
            nameEn?: string;
            nameFr?: string;
            nameEs?: string;
            nameHe?: string;
          }> = [];

          for (const assoc of item.ingredients || []) {
            const ingredient = getIngredientFromAssoc(assoc);
            if (ingredient && !ingredient.inStock) {
              explicitUnavailable.push({
                id: ingredient.id,
                name: ingredient.name,
                nameEn: ingredient.nameEn,
                nameFr: ingredient.nameFr,
                nameEs: ingredient.nameEs,
                nameHe: ingredient.nameHe,
              });
            }
          }

          // 2. Description matching pre-calcolato (ingredienti citati nella descrizione)
          const descriptionMatches = itemUnavailableMap.get(item.id) || [];

          // Merge e deduplica per ingredientId
          const seenIds = new Set<string>();
          const unavailableIngredients: {
            id: string;
            name: string;
            nameEn?: string;
            nameFr?: string;
            nameEs?: string;
            nameHe?: string;
            substitute?: {
              id: string;
              name: string;
              nameEn?: string;
              nameFr?: string;
              nameEs?: string;
              nameHe?: string;
            };
          }[] = [];

          for (const ing of [...explicitUnavailable, ...descriptionMatches]) {
            if (!seenIds.has(ing.id)) {
              seenIds.add(ing.id);
              const sub = substituteMap[ing.id];
              unavailableIngredients.push({
                ...ing,
                // Il sostituto vale solo se ammesso nella categoria di questo piatto
                substitute:
                  sub &&
                  (!ingredientCategoryMap ||
                    isModifierAllowedInCategory(ingredientCategoryMap, { ingredientId: sub.id }, category.id))
                    ? sub
                    : undefined,
              });
            }
          }

          // Note: Return all modifiers regardless of ingredient stock.
          // Modifiers with unavailable ingredients should be shown to the frontend,
          // which can mark them as disabled/unavailable. The backend never hides menu items
          // or modifiers based on ingredient availability — substitutes handle that instead.
          // Unico filtro: le aggiunte il cui ingrediente non e' ammesso nella
          // categoria del piatto (es. cetriolini in caffetteria) non si mostrano.
          const normalizedModifierGroups = item.modifierGroups?.map((group) => ({
            ...group,
            modifiers: ingredientCategoryMap
              ? group.modifiers?.filter((mod: { ingredientId?: string | null }) =>
                  isModifierAllowedInCategory(ingredientCategoryMap, mod, category.id)
                )
              : group.modifiers,
          }));

          return {
            ...fillDescriptionTranslations(item, ingredientIndex),
            unavailableIngredients,
            ingredients: undefined, // Rimuovi raw ingredients
            modifierGroups: normalizedModifierGroups,
          };
        }),
    }));

    return NextResponse.json(menu, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error("Menu API error:", error);
    return NextResponse.json({ error: "Failed to fetch menu" }, { status: 500 });
  }
}
