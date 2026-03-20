/**
 * Utility functions for getting translated menu content
 * Based on the current locale
 */

type Locale = "it" | "en" | "fr" | "es" | "he";

interface TranslatableItem {
  name: string;
  nameEn?: string | null;
  nameFr?: string | null;
  nameEs?: string | null;
  nameHe?: string | null;
  description?: string | null;
  descriptionEn?: string | null;
  descriptionFr?: string | null;
  descriptionEs?: string | null;
  descriptionHe?: string | null;
}

/**
 * Get the translated name for a menu item, category, or modifier
 * Falls back to Italian (default) if translation is not available
 */
export function getTranslatedName(item: TranslatableItem, locale: string): string {
  const loc = locale as Locale;

  switch (loc) {
    case "en":
      return item.nameEn || item.name;
    case "fr":
      return item.nameFr || item.name;
    case "es":
      return item.nameEs || item.name;
    case "he":
      return item.nameHe || item.name;
    case "it":
    default:
      return item.name;
  }
}

/**
 * Get the translated description for a menu item or category
 * Falls back to Italian (default) if translation is not available
 */
export function getTranslatedDescription(
  item: TranslatableItem,
  locale: string
): string | undefined {
  const loc = locale as Locale;

  switch (loc) {
    case "en":
      return item.descriptionEn || item.description || undefined;
    case "fr":
      return item.descriptionFr || item.description || undefined;
    case "es":
      return item.descriptionEs || item.description || undefined;
    case "he":
      return item.descriptionHe || item.description || undefined;
    case "it":
    default:
      return item.description || undefined;
  }
}

/**
 * Helper to get both name and description translated
 */
export function getTranslatedContent(
  item: TranslatableItem,
  locale: string
): {
  name: string;
  description?: string;
} {
  return {
    name: getTranslatedName(item, locale),
    description: getTranslatedDescription(item, locale),
  };
}

/**
 * Cache for translations to avoid repeated API calls
 */
const translationCache = new Map<string, { text: string; timestamp: number }>();
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

/**
 * Detect if text contains non-Italian characters or words
 * Returns true if the text might need translation
 */
export function mightNeedTranslation(text: string): boolean {
  if (!text || text.trim().length === 0) return false;

  // Check for non-Latin scripts (Hebrew, Arabic, Chinese, Japanese, Korean, Cyrillic, Greek)
  const nonLatinPattern =
    /[\u0590-\u05FF\u0600-\u06FF\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF\u0400-\u04FF\u0370-\u03FF]/;
  if (nonLatinPattern.test(text)) return true;

  // Check for common non-Italian words/patterns
  const nonItalianPatterns = [
    /\b(please|without|extra|more|less|no|with|and|the|for)\b/i, // English
    /\b(sans|avec|plus|moins|pas de|svp|s'il vous plaît)\b/i, // French
    /\b(sin|con|más|menos|por favor)\b/i, // Spanish
    /\b(ohne|mit|mehr|weniger|bitte)\b/i, // German
  ];

  return nonItalianPatterns.some((pattern) => pattern.test(text));
}

/**
 * Translate text to Italian using MyMemory free translation API
 * Falls back to original text if translation fails
 */
export async function translateToItalian(text: string): Promise<string> {
  if (!text || text.trim().length === 0) return text;

  // Check cache first
  const cacheKey = text.toLowerCase().trim();
  const cached = translationCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.text;
  }

  // Don't translate if it looks like Italian already
  if (!mightNeedTranslation(text)) {
    return text;
  }

  try {
    // Use MyMemory API - free, no API key required
    const response = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=autodetect|it`
    );

    if (!response.ok) {
      console.warn("Translation API error:", response.status);
      return text;
    }

    const data = await response.json();

    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      const translated = data.responseData.translatedText;

      // Cache the result
      translationCache.set(cacheKey, {
        text: translated,
        timestamp: Date.now(),
      });

      return translated;
    }

    return text;
  } catch (error) {
    console.warn("Translation failed:", error);
    return text;
  }
}

/**
 * Hook-friendly translation state type
 */
export interface TranslatedNote {
  original: string;
  translated: string | null;
  isTranslating: boolean;
  needsTranslation: boolean;
}
