import type { MenuItem, UnavailableIngredient } from '@shared/types'
import { getTranslatedDescription } from '@/lib/translations'

function getUnavailableIngredientName(ing: UnavailableIngredient, locale: string): string {
  switch (locale) {
    case 'en':
      return ing.nameEn || ing.name
    case 'fr':
      return ing.nameFr || ing.name
    case 'es':
      return ing.nameEs || ing.name
    case 'he':
      return ing.nameHe || ing.name
    default:
      return ing.name
  }
}

// Singolare/plurale italiano: -o → -i, -a → -e, -e → -i
function getVariants(word: string): string[] {
  const variants = [word]
  if (word.endsWith('o')) {
    variants.push(word.slice(0, -1) + 'i')
  } else if (word.endsWith('i')) {
    variants.push(word.slice(0, -1) + 'o')
  } else if (word.endsWith('a')) {
    variants.push(word.slice(0, -1) + 'e')
  } else if (word.endsWith('e')) {
    variants.push(word.slice(0, -1) + 'a')
    variants.push(word.slice(0, -1) + 'i')
  }
  return variants
}

// Toglie dalla descrizione gli ingredienti esauriti, mettendo al loro posto il
// sostituto configurato in admin (se c'e').
export function removeUnavailableIngredients(
  description: string,
  unavailableIngredients: UnavailableIngredient[],
  locale: string
): string {
  if (!unavailableIngredients || unavailableIngredients.length === 0) {
    return description
  }

  const parts = description.split(',').map((p) => p.trim())

  const resultParts: string[] = []
  for (const part of parts) {
    const partLower = part.toLowerCase()
    let replaced = false

    for (const ing of unavailableIngredients) {
      const name = getUnavailableIngredientName(ing, locale).toLowerCase()
      const variants = getVariants(name)
      if (variants.some((variant) => partLower.includes(variant))) {
        const sub = ing.substitute
        if (sub) {
          const subName =
            (locale === 'en'
              ? sub.nameEn
              : locale === 'fr'
                ? sub.nameFr
                : locale === 'es'
                  ? sub.nameEs
                  : locale === 'he'
                    ? sub.nameHe
                    : null) || sub.name
          resultParts.push(subName)
        }
        replaced = true
        break
      }
    }

    if (!replaced) {
      resultParts.push(part)
    }
  }

  return resultParts.join(', ')
}

// Descrizione da mostrare al cliente: tradotta e senza ingredienti esauriti.
// Card e modale devono usare la stessa, altrimenti la card nasconde
// l'ingrediente finito e il dettaglio lo mostra ancora.
export function getDisplayDescription(item: MenuItem, locale: string): string | undefined {
  const translated = getTranslatedDescription(item, locale)
  if (!translated) return undefined
  return removeUnavailableIngredients(translated, item.unavailableIngredients || [], locale)
}

// ============ TRADUZIONE DESCRIZIONI DAGLI INGREDIENTI ============
// Le descrizioni sono elenchi di ingredienti ("Focaccia, Mozzarella, Pomodoro"):
// ogni voce che corrisponde a un ingrediente si traduce con le traduzioni
// dell'ingrediente, cosi' un piatto nuovo e' tradotto senza scrivere nulla.

type DescriptionLocale = 'en' | 'fr' | 'es' | 'he'

export interface IngredientNames {
  name: string
  nameEn?: string | null
  nameFr?: string | null
  nameEs?: string | null
  nameHe?: string | null
}

const DESCRIPTION_LOCALES: { locale: DescriptionLocale; nameKey: keyof IngredientNames; descKey: 'descriptionEn' | 'descriptionFr' | 'descriptionEs' | 'descriptionHe' }[] = [
  { locale: 'en', nameKey: 'nameEn', descKey: 'descriptionEn' },
  { locale: 'fr', nameKey: 'nameFr', descKey: 'descriptionFr' },
  { locale: 'es', nameKey: 'nameEs', descKey: 'descriptionEs' },
  { locale: 'he', nameKey: 'nameHe', descKey: 'descriptionHe' },
]

// "pomodoro e basilico" -> "tomato and basil"
const CONJUNCTIONS: Record<DescriptionLocale, (a: string, b: string) => string> = {
  en: (a, b) => `${a} and ${b}`,
  fr: (a, b) => `${a} et ${b}`,
  es: (a, b) => `${a} y ${b}`,
  he: (a, b) => `${a} ו${b}`,
}

const foldName = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

// Indice nome italiano normalizzato (anche singolare/plurale) -> ingrediente
export function buildIngredientIndex(ingredients: IngredientNames[]): Map<string, IngredientNames> {
  const index = new Map<string, IngredientNames>()
  for (const ing of ingredients) {
    if (!ing?.name) continue
    const folded = foldName(ing.name)
    // Il nome esatto vince sulle varianti di plurale di altri ingredienti
    index.set(folded, ing)
    for (const variant of getVariants(folded)) {
      if (!index.has(variant)) index.set(variant, ing)
    }
  }
  return index
}

function translateVoce(voce: string, nameKey: keyof IngredientNames, index: Map<string, IngredientNames>): string | null {
  const ing = index.get(foldName(voce))
  const translated = ing?.[nameKey]
  if (!translated) return null
  // Mantiene la maiuscola iniziale della voce originale
  return /^\p{Lu}/u.test(voce) ? translated.charAt(0).toUpperCase() + translated.slice(1) : translated
}

// Traduce una descrizione voce per voce. Ritorna il testo e se tutte le voci
// sono state riconosciute; null se nessuna voce corrisponde a un ingrediente.
export function translateDescriptionFromIngredients(
  description: string,
  locale: DescriptionLocale,
  index: Map<string, IngredientNames>
): { text: string; complete: boolean } | null {
  const nameKey = DESCRIPTION_LOCALES.find(l => l.locale === locale)!.nameKey
  let matched = 0
  let total = 0
  const parts = description.split(',').map(p => p.trim()).filter(Boolean).map(part => {
    // "Pomodoro e basilico": prima prova la voce intera, poi le due meta'
    total++
    const whole = translateVoce(part, nameKey, index)
    if (whole) {
      matched++
      return whole
    }
    const halves = part.split(/\s+e\s+/i)
    if (halves.length === 2) {
      const [a, b] = halves.map(h => translateVoce(h, nameKey, index))
      if (a && b) {
        matched++
        return CONJUNCTIONS[locale](a, b.charAt(0).toLowerCase() + b.slice(1))
      }
    }
    return part
  })
  if (matched === 0) return null
  return { text: parts.join(', '), complete: matched === total }
}

interface DescribedItem {
  description?: string | null
  descriptionEn?: string | null
  descriptionFr?: string | null
  descriptionEs?: string | null
  descriptionHe?: string | null
}

// Riempie le descrizioni tradotte a partire dagli ingredienti.
// - tutte le voci riconosciute: usa la traduzione generata (quelle salvate a mano
//   sono spesso rimaste indietro rispetto all'italiano)
// - solo alcune voci: la usa solo se non c'e' gia' una traduzione salvata
export function fillDescriptionTranslations<T extends DescribedItem>(item: T, index: Map<string, IngredientNames>): T {
  if (!item.description?.trim() || index.size === 0) return item
  const result = { ...item }
  for (const { locale, descKey } of DESCRIPTION_LOCALES) {
    const generated = translateDescriptionFromIngredients(item.description, locale, index)
    if (!generated) continue
    if (generated.complete || !item[descKey]?.trim()) {
      result[descKey] = generated.text
    }
  }
  return result
}
