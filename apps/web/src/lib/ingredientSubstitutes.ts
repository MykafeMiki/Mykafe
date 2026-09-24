/**
 * Ingredient Substitution System
 * Mappa globale: ingredientId → ingrediente sostitutivo.
 * Quando un ingrediente e' esaurito, nelle descrizioni del menu compare il
 * sostituto al suo posto.
 *
 * La mappa vive lato server in AppSettings['ingredient_substitutes'], che e'
 * l'unica fonte letta dal menu servito ai clienti. Prima esisteva anche una
 * copia in localStorage scritta dalla scheda piatto: quella non arrivava mai
 * al cliente, quindi e' stata rimossa.
 */

import { getAuthToken } from "./api/core";

export interface SubstituteIngredient {
  id: string;
  name: string;
  nameEn?: string;
  nameFr?: string;
  nameEs?: string;
  nameHe?: string;
}

export type SubstituteMap = Record<string, SubstituteIngredient>;

const ENDPOINT = "/api/settings/substitutes";

/** Mappa corrente. In caso di errore torna vuota: la UI resta usabile. */
export async function fetchIngredientSubstitutes(): Promise<SubstituteMap> {
  try {
    const res = await fetch(ENDPOINT, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return ((await res.json()) as SubstituteMap) || {};
  } catch (e) {
    console.error("Error fetching ingredient substitutes:", e);
    return {};
  }
}

/**
 * Salva l'intera mappa. Lancia se il server rifiuta, cosi' il chiamante non
 * puo' mostrare un successo che non c'e' stato.
 */
export async function saveIngredientSubstitutes(map: SubstituteMap): Promise<void> {
  const token = getAuthToken();
  if (!token) throw new Error("Sessione admin scaduta: rifai il login");

  const res = await fetch(ENDPOINT, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(map),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `HTTP ${res.status}`);
  }
}

/** Imposta (o rimuove, con null) il sostituto di un singolo ingrediente. */
export async function setIngredientSubstitute(
  ingredientId: string,
  substitute: SubstituteIngredient | null
): Promise<SubstituteMap> {
  const current = await fetchIngredientSubstitutes();
  if (substitute === null) {
    delete current[ingredientId];
  } else {
    current[ingredientId] = substitute;
  }
  await saveIngredientSubstitutes(current);
  return current;
}
