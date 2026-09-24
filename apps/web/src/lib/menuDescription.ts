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
