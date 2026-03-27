/**
 * OPTIMIZATION: Frontend caching and lazy loading
 * File: apps/web/src/lib/api.ts
 * 
 * Aggiungi queste funzioni al file api.ts esistente
 */

// ============ MENU CACHING ============

interface CachedMenu {
  data: Category[]
  timestamp: number
  etag?: string
}

const MENU_CACHE_KEY = 'mykafe_menu_cache'
const MENU_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// Get menu with local caching
export const getMenuCached = async (): Promise<Category[]> => {
  // Check localStorage cache first
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(MENU_CACHE_KEY)
      if (cached) {
        const { data, timestamp, etag }: CachedMenu = JSON.parse(cached)
        const age = Date.now() - timestamp

        // If cache is fresh, return immediately
        if (age < MENU_CACHE_TTL) {
          // Revalidate in background (stale-while-revalidate pattern)
          revalidateMenu(etag).catch(console.error)
          return data
        }

        // Cache is stale but we have an etag - try conditional request
        if (etag) {
          const fresh = await fetchMenuWithEtag(etag)
          if (fresh === null) {
            // 304 Not Modified - cache is still valid
            updateCacheTimestamp()
            return data
          }
          return fresh
        }
      }
    } catch {
      // Cache read failed, fetch fresh
    }
  }

  // No cache or expired - fetch fresh
  return fetchAndCacheMenu()
}

async function fetchMenuWithEtag(etag: string): Promise<Category[] | null> {
  const res = await fetch(`${API_URL}/menu`, {
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'If-None-Match': etag
    }
  })

  if (res.status === 304) {
    return null // Not modified
  }

  if (!res.ok) {
    throw new Error(`API Error: ${res.status}`)
  }

  const data = await res.json()
  const newEtag = res.headers.get('ETag') || undefined

  // Update cache
  saveMenuCache(data, newEtag)

  return data
}

async function fetchAndCacheMenu(): Promise<Category[]> {
  const res = await fetch(`${API_URL}/menu`, {
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    }
  })

  if (!res.ok) {
    throw new Error(`API Error: ${res.status}`)
  }

  const data = await res.json()
  const etag = res.headers.get('ETag') || undefined

  saveMenuCache(data, etag)

  return data
}

function saveMenuCache(data: Category[], etag?: string) {
  if (typeof window !== 'undefined') {
    try {
      const cache: CachedMenu = {
        data,
        timestamp: Date.now(),
        etag
      }
      localStorage.setItem(MENU_CACHE_KEY, JSON.stringify(cache))
    } catch {
      // localStorage full or unavailable
    }
  }
}

function updateCacheTimestamp() {
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(MENU_CACHE_KEY)
      if (cached) {
        const cache: CachedMenu = JSON.parse(cached)
        cache.timestamp = Date.now()
        localStorage.setItem(MENU_CACHE_KEY, JSON.stringify(cache))
      }
    } catch {
      // Ignore
    }
  }
}

async function revalidateMenu(etag?: string) {
  try {
    if (etag) {
      await fetchMenuWithEtag(etag)
    } else {
      await fetchAndCacheMenu()
    }
  } catch {
    // Background revalidation failed, ignore
  }
}

// ============ LAZY LOADING MODIFIERS ============

// Cache for modifier groups (loaded on demand)
const modifierCache = new Map<string, ModifierGroup[]>()

export const getItemModifiers = async (itemId: string): Promise<ModifierGroup[]> => {
  // Check cache
  if (modifierCache.has(itemId)) {
    return modifierCache.get(itemId)!
  }

  // Fetch from API
  const item = await getMenuItem(itemId)
  const modifiers = item.modifierGroups || []

  // Cache result
  modifierCache.set(itemId, modifiers)

  return modifiers
}

// Prefetch modifiers for visible items
export const prefetchModifiers = (itemIds: string[]) => {
  // Only prefetch items not already cached
  const uncached = itemIds.filter(id => !modifierCache.has(id))
  
  // Limit concurrent requests
  const batch = uncached.slice(0, 5)
  
  batch.forEach(id => {
    getItemModifiers(id).catch(() => {
      // Prefetch failed, will retry on demand
    })
  })
}

// ============ PRELOAD MENU ON APP START ============

// Call this in _app.tsx or layout.tsx
export const preloadMenu = () => {
  if (typeof window !== 'undefined') {
    // Use requestIdleCallback for non-blocking preload
    if ('requestIdleCallback' in window) {
      (window as Window & { requestIdleCallback: (cb: () => void) => void })
        .requestIdleCallback(() => {
          getMenuCached().catch(console.error)
        })
    } else {
      // Fallback: preload after 100ms
      setTimeout(() => {
        getMenuCached().catch(console.error)
      }, 100)
    }
  }
}

// ============ CLEAR CACHE (for admin updates) ============

export const clearMenuCache = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(MENU_CACHE_KEY)
  }
  modifierCache.clear()
}
