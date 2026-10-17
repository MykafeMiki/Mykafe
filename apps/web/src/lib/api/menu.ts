import { fetchApi, fetchApiAuth, API_URL, supabase, getAuthToken } from './core'
import type { Category, MenuItem, ModifierGroup, Modifier, UnavailableIngredient } from '@shared/types'
import {
  buildIngredientIndex,
  descriptionMentions,
  descriptionPartKeys,
  fillDescriptionTranslations,
  similarIngredientNames
} from '@/lib/menuDescription'
import { buildIngredientCategoryMap, isIngredientAllowedInCategory, isModifierAllowedInCategory } from '@/lib/ingredientCategories'
import { HIDING_INGREDIENTS_SELECT, buildHiddenItemIds } from '@/lib/hiddenDishes'
import { buildLiveIngredientMap, resolveSubstitute } from '@/lib/menuSubstitutes'

// ============ MENU BASIC ============

// Bypass Edge Function (deployed version has outdated filter logic) — query Supabase directly
export const getMenu = () => fetchMenuDirect()
export const getMenuItem = (id: string) => fetchApi<MenuItem>(`/menu/items/${id}`)

// ============ MENU CACHING (Query Diretta Supabase) ============

interface CachedMenu {
  data: Category[]
  timestamp: number
}

const MENU_CACHE_KEY = 'mykafe_menu_cache_v2' // v2: invalidate old corrupt caches
const MENU_CACHE_TTL = 60 * 1000 // 1 minuto (più breve perché query è veloce)

// Validate cache data - ensure categories have items
function isValidMenuCache(data: Category[]): boolean {
  if (!data || data.length < 5) return false // Should have at least 5 categories
  // Check that at least some categories have items
  const categoriesWithItems = data.filter(c => c.items && c.items.length > 0)
  return categoriesWithItems.length >= 3
}

// Get menu with local caching - QUERY DIRETTA (~100ms invece di ~400ms)
export const getMenuCached = async (): Promise<Category[]> => {
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(MENU_CACHE_KEY)
      if (cached) {
        const { data, timestamp }: CachedMenu = JSON.parse(cached)
        const age = Date.now() - timestamp

        // Validate cache data - if invalid, fetch fresh
        if (!isValidMenuCache(data)) {
          console.log('Menu cache invalid, fetching fresh data')
          localStorage.removeItem(MENU_CACHE_KEY)
          return fetchMenuDirect()
        }

        // If cache is fresh, return immediately and revalidate in background
        if (age < MENU_CACHE_TTL) {
          revalidateMenu().catch(console.error)
          return data
        }
      }
    } catch {
      // Cache read failed, clear and fetch fresh
      localStorage.removeItem(MENU_CACHE_KEY)
    }
  }

  return fetchMenuDirect()
}

// Query diretta a Supabase (bypassa Edge Function)
export async function fetchMenuDirect(): Promise<Category[]> {
  // Query parallele per massima velocità
  const [categoriesResult, outOfStockResult, substitutesResult, ingredientsResult, ingredientCategoriesResult, hidingResult] = await Promise.all([
    // Menu principale
    supabase
      .from('Category')
      .select(`
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
      `)
      .eq('active', true)
      .order('sortOrder', { ascending: true }),

    // Ingredienti non disponibili. I piatti che li citano si cercano qui sotto a
    // ogni lettura: la tabella pre-calcolata MenuItemUnavailableIngredient usa la
    // regola vecchia (Pomodoro trovava anche i Pomodorini ciliegia)
    supabase
      .from('Ingredient')
      .select('id, name, nameEn, nameFr, nameEs, nameHe')
      .eq('inStock', false),

    // Mappa sostituti ingredienti
    supabase
      .from('AppSettings')
      .select('value')
      .eq('key', 'ingredient_substitutes')
      .single(),

    // Tutti gli ingredienti: servono a tradurre le descrizioni voce per voce
    // e a mostrare i sostituti con nome, traduzioni e disponibilita' attuali
    supabase
      .from('Ingredient')
      .select('id, name, nameEn, nameFr, nameEs, nameHe, inStock'),

    // Destinazioni d'uso: in quali categorie e' ammesso ogni ingrediente
    supabase
      .from('IngredientCategory')
      .select('ingredientId, categoryId'),

    // Ingredienti con "nascondi piatti" attivo: query a parte, cosi' se la
    // migrazione non e' applicata il menu funziona comunque (senza nascondere)
    supabase
      .from('Ingredient')
      .select(HIDING_INGREDIENTS_SELECT)
      .eq('hideDishes', true)
  ])

  if (hidingResult.error) {
    console.error('Hidden dishes fetch error:', hidingResult.error)
  }
  const hiddenItemIds = buildHiddenItemIds(hidingResult.error ? null : hidingResult.data)

  if (categoriesResult.error) {
    console.error('Menu fetch error:', categoriesResult.error)
    throw categoriesResult.error
  }

  // Se la lettura delle destinazioni fallisce (migrazione non ancora applicata,
  // RLS) non si filtra: meglio mostrare tutte le aggiunte che nasconderle tutte.
  const ingredientCategoryMap = ingredientCategoriesResult.error
    ? null
    : buildIngredientCategoryMap(ingredientCategoriesResult.data || [])
  if (ingredientCategoriesResult.error) {
    console.error('IngredientCategory fetch error:', ingredientCategoriesResult.error)
  }

  const categories = categoriesResult.data || []
  const ingredientIndex = buildIngredientIndex(ingredientsResult.data || [])
  // Se la lettura fallisce i sostituti restano con i nomi salvati nella mappa
  const liveIngredients = ingredientsResult.error ? null : buildLiveIngredientMap(ingredientsResult.data || [])

  // Mappa sostituti: ingredientId -> { id, name, ... } (nomi di quando e' stato scelto)
  const substituteMap: Record<string, { id: string; name: string; nameEn?: string; nameFr?: string; nameEs?: string; nameHe?: string }> =
    (substitutesResult.data as { value?: Record<string, unknown> } | null)?.value as Record<string, { id: string; name: string }> || {}

  // Ingredienti esauriti, ognuno con i nomi degli altri ingredienti che lo
  // contengono (Pomodorini ciliegia per Pomodoro): quelle voci non si toccano
  const outOfStockIds = new Set<string>()
  const outOfStockIngredients: UnavailableIngredient[] = []
  for (const ing of outOfStockResult.data || []) {
    outOfStockIds.add(ing.id)
    outOfStockIngredients.push({
      id: ing.id,
      name: ing.name,
      nameEn: ing.nameEn,
      nameFr: ing.nameFr,
      nameEs: ing.nameEs,
      nameHe: ing.nameHe,
      similarNames: similarIngredientNames(ing, ingredientsResult.data || [])
    })
  }
  const outOfStockById = new Map(outOfStockIngredients.map(ing => [ing.id, ing]))

  // Filtra items e modifiers
  const filtered = categories.map(category => ({
    ...category,
    items: (category.items || [])
      // Via i piatti disattivati e quelli con un ingrediente che nasconde i piatti
      .filter((item: { id: string; available: boolean }) => item.available && !hiddenItemIds.has(item.id))
      .sort((a: { sortOrder: number }, b: { sortOrder: number }) => a.sortOrder - b.sortOrder)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((item: any) => {
        const described = fillDescriptionTranslations(item, ingredientIndex)

        // Tutti gli ingredienti associati che sono esauriti
        const explicitUnavailable: UnavailableIngredient[] = (item.ingredients || [])
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((assoc: any) => assoc.ingredient && !assoc.ingredient.inStock)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((assoc: any) => outOfStockById.get(assoc.ingredient.id) ?? {
            id: assoc.ingredient.id,
            name: assoc.ingredient.name,
            nameEn: assoc.ingredient.nameEn,
            nameFr: assoc.ingredient.nameFr,
            nameEs: assoc.ingredient.nameEs,
            nameHe: assoc.ingredient.nameHe
          })

        // ...e quelli citati nella descrizione: ricontrollati a ogni lettura, cosi'
        // valgono anche per piatti creati o modificati dopo (e ingredienti rinominati)
        const descriptionMatches = outOfStockIngredients.filter(ing => descriptionMentions(described, ing))

        // Merge, deduplica e attacca sostituti se configurati
        const partKeys = descriptionPartKeys(described)
        const seenIds = new Set<string>()
        const unavailableIngredients: UnavailableIngredient[] = []
        for (const ing of [...explicitUnavailable, ...descriptionMatches]) {
          if (!seenIds.has(ing.id)) {
            seenIds.add(ing.id)
            unavailableIngredients.push({
              ...ing,
              // Solo i nomi simili che compaiono in questo piatto
              similarNames: ing.similarNames?.filter(key => partKeys.has(key)),
              // Il sostituto vale solo se ammesso nella categoria di questo piatto
              substitute: resolveSubstitute(substituteMap[ing.id], liveIngredients, (subId) =>
                !ingredientCategoryMap || isIngredientAllowedInCategory(ingredientCategoryMap, subId, category.id)
              )
            })
          }
        }

        return {
          ...described,
          unavailableIngredients,
          ingredients: undefined, // Rimuovi raw ingredients dalla risposta
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          modifierGroups: item.modifierGroups?.map((group: any) => ({
            ...group,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            modifiers: group.modifiers?.filter((mod: any) =>
              mod.available &&
              (!mod.ingredientId || !outOfStockIds.has(mod.ingredientId)) &&
              // Solo aggiunte il cui ingrediente e' ammesso nella categoria del piatto
              (!ingredientCategoryMap || isModifierAllowedInCategory(ingredientCategoryMap, mod, category.id))
            )
          }))
        }
      })
  }))

  // Salva in cache
  saveMenuCache(filtered as unknown as Category[])

  return filtered as unknown as Category[]
}

function saveMenuCache(data: Category[]) {
  if (typeof window !== 'undefined') {
    try {
      const cache: CachedMenu = { data, timestamp: Date.now() }
      localStorage.setItem(MENU_CACHE_KEY, JSON.stringify(cache))
    } catch {
      // localStorage full or unavailable
    }
  }
}

async function revalidateMenu() {
  try {
    await fetchMenuDirect()
  } catch {
    // Background revalidation failed, ignore
  }
}

// Clear menu cache (call when admin updates menu)
export const clearMenuCache = async () => {
  // Clear local cache
  if (typeof window !== 'undefined') {
    localStorage.removeItem(MENU_CACHE_KEY)
  }

  // Trigger ISR revalidation (non-blocking)
  try {
    await fetch('/api/revalidate-menu', { method: 'POST' })
  } catch {
    // Revalidation failed, ignore - will refresh on next ISR cycle
  }
}

// GET MENU via Next.js ISR API Route (~20ms after first request)
// Use this for SSR/SSG pages
export const getMenuISR = async (): Promise<Category[]> => {
  const baseUrl = typeof window !== 'undefined'
    ? ''
    : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const res = await fetch(`${baseUrl}/api/menu`, {
    next: { revalidate: 60 }
  })

  if (!res.ok) {
    throw new Error('Failed to fetch menu')
  }

  return res.json()
}

// Preload menu on app start (non-blocking)
export const preloadMenu = () => {
  if (typeof window !== 'undefined') {
    if ('requestIdleCallback' in window) {
      (window as Window & { requestIdleCallback: (cb: () => void) => void })
        .requestIdleCallback(() => {
          getMenuCached().catch(console.error)
        })
    } else {
      setTimeout(() => {
        getMenuCached().catch(console.error)
      }, 100)
    }
  }
}

// ============ ADMIN MENU ============

export const getAdminCategories = () => fetchApi<Category[]>('/menu/admin/categories')

// Le mutazioni del menu richiedono il token admin (guard lato edge function):
// con fetchApi passerebbe solo la anon key e la risposta sarebbe sempre 401.
export const createCategory = (data: { name: string; description?: string; imageUrl?: string; sortOrder?: number }) =>
  fetchApiAuth<Category>('/menu/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const updateCategory = (id: string, data: { name?: string; description?: string; imageUrl?: string; sortOrder?: number; active?: boolean }) =>
  fetchApiAuth<Category>(`/menu/categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })

export const createMenuItem = (data: { name: string; description?: string; price: number; categoryId: string; imageUrl?: string; sortOrder?: number }) =>
  fetchApiAuth<MenuItem>('/menu/items', {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const updateMenuItem = (id: string, data: { name?: string; description?: string; price?: number; priceTakeaway?: number | null; priceTakeawayRemote?: number | null; priceTakeawayCard?: number | null; imageUrl?: string; sortOrder?: number; available?: boolean }) =>
  fetchApiAuth<MenuItem>(`/menu/items/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })

export const updateItemAvailability = (id: string, available: boolean) =>
  fetchApiAuth<MenuItem>(`/menu/items/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ available }),
  })

export const deleteMenuItem = (id: string) =>
  fetchApiAuth<{ success: boolean }>(`/menu/items/${id}`, {
    method: 'DELETE',
  })

// ============ MODIFIER GROUPS & MODIFIERS ============

export const addModifierGroup = (menuItemId: string, data: {
  name: string
  required?: boolean
  multiSelect?: boolean
  minSelect?: number
  maxSelect?: number
  modifiers?: { name: string; price?: number; ingredientId?: string }[]
}) =>
  fetchApiAuth<ModifierGroup>(`/menu/items/${menuItemId}/modifier-groups`, {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const addModifier = (modifierGroupId: string, data: {
  name: string
  price?: number
  ingredientId?: string
}) =>
  fetchApiAuth<Modifier>(`/menu/modifier-groups/${modifierGroupId}/modifiers`, {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const updateModifier = (id: string, data: {
  name?: string
  price?: number
  available?: boolean
  ingredientId?: string
}) =>
  fetchApiAuth<Modifier>(`/menu/modifiers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })

export const deleteModifier = (id: string) =>
  fetchApiAuth<{ success: boolean }>(`/menu/modifiers/${id}`, {
    method: 'DELETE',
  })

export const deleteModifierGroup = (id: string) =>
  fetchApiAuth<{ success: boolean }>(`/menu/modifier-groups/${id}`, {
    method: 'DELETE',
  })

// ============ IMAGE UPLOADS ============

export interface UploadResult {
  url: string
  path: string
}

export const uploadItemImage = async (file: File): Promise<UploadResult> => {
  const token = getAuthToken()
  const formData = new FormData()
  formData.append('image', file)

  const res = await fetch(`${API_URL}/upload/items`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  })

  if (!res.ok) {
    throw new Error(`Upload Error: ${res.status}`)
  }

  return res.json()
}

export const uploadCategoryImage = async (file: File): Promise<UploadResult> => {
  const token = getAuthToken()
  const formData = new FormData()
  formData.append('image', file)

  const res = await fetch(`${API_URL}/upload/categories`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  })

  if (!res.ok) {
    throw new Error(`Upload Error: ${res.status}`)
  }

  return res.json()
}

export const uploadSectionImage = async (sectionId: string, file: File): Promise<UploadResult> => {
  const token = getAuthToken()
  const formData = new FormData()
  formData.append('image', file)

  const res = await fetch(`${API_URL}/upload/sections/${sectionId}`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  })

  if (!res.ok) {
    throw new Error(`Upload Error: ${res.status}`)
  }

  return res.json()
}

export const deleteImage = async (url: string): Promise<void> => {
  const token = getAuthToken()
  const res = await fetch(`${API_URL}/upload`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({ url }),
  })

  if (!res.ok) {
    throw new Error(`Delete Error: ${res.status}`)
  }
}
