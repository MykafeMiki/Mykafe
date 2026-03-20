/**
 * Ingredient Substitution System
 * Stores a global mapping: ingredientId → substitute ingredient data
 * Used when an ingredient is out of stock → show substitute instead in menu descriptions
 */

const SUBSTITUTES_KEY = "mykafe-ingredient-substitutes";

export interface SubstituteIngredient {
  id: string;
  name: string;
  nameEn?: string;
  nameFr?: string;
  nameEs?: string;
  nameHe?: string;
}

export type SubstituteMap = Record<string, SubstituteIngredient>;

export function getIngredientSubstitutes(): SubstituteMap {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem(SUBSTITUTES_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

export function setIngredientSubstitute(
  ingredientId: string,
  substitute: SubstituteIngredient | null
): void {
  if (typeof window === "undefined") return;
  try {
    const current = getIngredientSubstitutes();
    if (substitute === null) {
      delete current[ingredientId];
    } else {
      current[ingredientId] = substitute;
    }
    localStorage.setItem(SUBSTITUTES_KEY, JSON.stringify(current));
  } catch (e) {
    console.error("Error saving ingredient substitute:", e);
  }
}

export function clearIngredientSubstitutes(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SUBSTITUTES_KEY);
}
