/**
 * Utility functions for getting translated menu content
 * Based on the current locale
 */

type Locale = 'it' | 'en' | 'fr' | 'es' | 'he'

interface TranslatableItem {
  name: string
  nameEn?: string | null
  nameFr?: string | null
  nameEs?: string | null
  nameHe?: string | null
  description?: string | null
  descriptionEn?: string | null
  descriptionFr?: string | null
  descriptionEs?: string | null
  descriptionHe?: string | null
}

/**
 * Get the translated name for a menu item, category, or modifier
 * Falls back to Italian (default) if translation is not available
 */
export function getTranslatedName(item: TranslatableItem, locale: string): string {
  const loc = locale as Locale

  switch (loc) {
    case 'en':
      return item.nameEn || item.name
    case 'fr':
      return item.nameFr || item.name
    case 'es':
      return item.nameEs || item.name
    case 'he':
      return item.nameHe || item.name
    case 'it':
    default:
      return item.name
  }
}

/**
 * Get the translated description for a menu item or category
 * Falls back to Italian (default) if translation is not available
 */
export function getTranslatedDescription(item: TranslatableItem, locale: string): string | undefined {
  const loc = locale as Locale

  switch (loc) {
    case 'en':
      return item.descriptionEn || item.description || undefined
    case 'fr':
      return item.descriptionFr || item.description || undefined
    case 'es':
      return item.descriptionEs || item.description || undefined
    case 'he':
      return item.descriptionHe || item.description || undefined
    case 'it':
    default:
      return item.description || undefined
  }
}

/**
 * Helper to get both name and description translated
 */
export function getTranslatedContent(item: TranslatableItem, locale: string): {
  name: string
  description?: string
} {
  return {
    name: getTranslatedName(item, locale),
    description: getTranslatedDescription(item, locale)
  }
}
