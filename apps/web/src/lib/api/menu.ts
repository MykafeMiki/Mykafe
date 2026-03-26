import { fetchApi, fetchApiAuth, API_URL, supabase, getAuthToken } from './core'
import type { Category, MenuItem, ModifierGroup, Modifier } from '@shared/types'

// ============ MENU BASIC ============

export const getMenu = () => fetchApi<Category[]>('/menu')
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
  const [categoriesResult, outOfStockResult, substitutesResult] = await Promise.all([
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
          price, priceTakeaway, priceTakeawayRemote,
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

    // Ingredienti non disponibili con match pre-calcolati
    supabase
      .from('Ingredient')
      .select(`
        id, name, nameEn, nameFr, nameEs, nameHe,
        menuItemMatches:MenuItemUnavailableIngredient(menuItemId)
      `)
      .eq('inStock', false),

    // Mappa sostituti ingredienti
    supabase
      .from('AppSettings')
      .select('value')
      .eq('key', 'ingredient_substitutes')
      .single()
  ])

  if (categoriesResult.error) {
    console.error('Menu fetch error:', categoriesResult.error)
    throw categoriesResult.error
  }

  const categories = categoriesResult.data || []

  // Mappa sostituti: ingredientId -> { id, name, ... }
  const substituteMap: Record<string, { id: string; name: string; nameEn?: string; nameFr?: string; nameEs?: string; nameHe?: string }> =
    (substitutesResult.data as { value?: Record<string, unknown> } | null)?.value as Record<string, { id: string; name: string }> || {}

  // Mappa: menuItemId -> ingredienti non disponibili (da description matching)
  const itemUnavailableMap = new Map<string, { id: string, name: string, nameEn?: string, nameFr?: string, nameEs?: string, nameHe?: string }[]>()
  const outOfStockIds = new Set<string>()

  for (const ing of outOfStockResult.data || []) {
    outOfStockIds.add(ing.id)
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

  // Filtra items e modifiers
  const filtered = categories.map(category => ({
    ...category,
    items: (category.items || [])
      .filter((item: { available: boolean }) => item.available)
      .sort((a: { sortOrder: number }, b: { sortOrder: number }) => a.sortOrder - b.sortOrder)
      .map((item: {
        id: string,
        modifierGroups?: { modifiers?: { available: boolean; ingredientId?: string }[] }[],
        ingredients?: { ingredient: { id: string, name: string, nameEn?: string, nameFr?: string, nameEs?: string, nameHe?: string, inStock: boolean } }[]
      }) => {
        // Tutti gli ingredienti associati che sono esauriti
        const explicitUnavailable = (item.ingredients || [])
          .filter(assoc => assoc.ingredient && !assoc.ingredient.inStock)
          .map(assoc => ({
            id: assoc.ingredient.id,
            name: assoc.ingredient.name,
            nameEn: assoc.ingredient.nameEn,
            nameFr: assoc.ingredient.nameFr,
            nameEs: assoc.ingredient.nameEs,
            nameHe: assoc.ingredient.nameHe
          }))

        // Ingredienti non disponibili da description matching
        const descriptionMatches = itemUnavailableMap.get(item.id) || []

        // Merge, deduplica e attacca sostituti se configurati
        const seenIds = new Set<string>()
        const unavailableIngredients: { id: string, name: string, nameEn?: string, nameFr?: string, nameEs?: string, nameHe?: string, substitute?: { id: string, name: string, nameEn?: string, nameFr?: string, nameEs?: string, nameHe?: string } }[] = []
        for (const ing of [...explicitUnavailable, ...descriptionMatches]) {
          if (!seenIds.has(ing.id)) {
            seenIds.add(ing.id)
            unavailableIngredients.push({
              ...ing,
              substitute: substituteMap[ing.id] ?? undefined
            })
          }
        }

        return {
          ...item,
          unavailableIngredients,
          ingredients: undefined, // Rimuovi raw ingredients dalla risposta
          modifierGroups: item.modifierGroups?.map(group => ({
            ...group,
            modifiers: group.modifiers?.filter(mod =>
              mod.available && (!mod.ingredientId || !outOfStockIds.has(mod.ingredientId))
            )
          }))
        }
      })
  }))

  // Salva in cache
  saveMenuCache(filtered)

  return filtered
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

export const createCategory = (data: { name: string; description?: string; imageUrl?: string; sortOrder?: number }) =>
  fetchApi<Category>('/menu/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const updateCategory = (id: string, data: { name?: string; description?: string; imageUrl?: string; sortOrder?: number; active?: boolean }) =>
  fetchApi<Category>(`/menu/categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })

export const createMenuItem = (data: { name: string; description?: string; price: number; categoryId: string; imageUrl?: string; sortOrder?: number }) =>
  fetchApi<MenuItem>('/menu/items', {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const updateMenuItem = (id: string, data: { name?: string; description?: string; price?: number; priceTakeaway?: number | null; priceTakeawayRemote?: number | null; imageUrl?: string; sortOrder?: number; available?: boolean }) =>
  fetchApi<MenuItem>(`/menu/items/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })

export const updateItemAvailability = (id: string, available: boolean) =>
  fetchApi<MenuItem>(`/menu/items/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ available }),
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
