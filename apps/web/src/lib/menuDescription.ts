import type { DishChanges, MenuItem, UnavailableIngredient } from '@shared/types'
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

// La voce della descrizione contiene il nome (anche al plurale)
function partMentions(partLower: string, name: string): boolean {
  const needle = name.trim().toLowerCase()
  return !!needle && getVariants(needle).some((variant) => partLower.includes(variant))
}

interface ShownPart {
  text: string
  // Ingrediente esaurito al cui posto c'e' questa voce (il suo sostituto)
  replaces?: UnavailableIngredient
}

// Voci della descrizione senza gli ingredienti esauriti, con al loro posto il
// sostituto configurato in admin (se c'e').
function applyUnavailableIngredients(
  description: string,
  unavailableIngredients: UnavailableIngredient[],
  locale: string
): ShownPart[] {
  const parts = description.split(',').map((p) => p.trim())

  const resultParts: ShownPart[] = []
  for (const part of parts) {
    const partLower = part.toLowerCase()
    const partKey = foldName(part)
    let replaced = false

    for (const ing of unavailableIngredients) {
      // Voce che e' un altro ingrediente col nome simile (Pomodorini ciliegia
      // con Pomodoro esaurito): non si tocca
      if (ing.similarNames?.includes(partKey)) continue
      const matchedLocal = partMentions(partLower, getUnavailableIngredientName(ing, locale))
      // Se la descrizione non si traduce il cliente straniero vede l'italiano:
      // li' l'ingrediente esaurito compare con il nome italiano
      const matchedItalian = !matchedLocal && locale !== 'it' && partMentions(partLower, ing.name)
      if (matchedLocal || matchedItalian) {
        const sub = ing.substitute
        if (sub) {
          // Nella stessa lingua della voce; una traduzione rovinata ("????") non si mostra
          const localName = getUnavailableIngredientName(sub, locale)
          resultParts.push({
            text: matchedLocal && !isBrokenTranslation(localName) ? localName : sub.name,
            replaces: ing,
          })
        }
        replaced = true
        break
      }
    }

    if (!replaced) {
      resultParts.push({ text: part })
    }
  }

  return resultParts
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
  return applyUnavailableIngredients(description, unavailableIngredients, locale)
    .map((p) => p.text)
    .join(', ')
}

// Descrizione da mostrare al cliente: tradotta e senza ingredienti esauriti.
// Card e modale devono usare la stessa, altrimenti la card nasconde
// l'ingrediente finito e il dettaglio lo mostra ancora.
export function getDisplayDescription(item: MenuItem, locale: string): string | undefined {
  const translated = getTranslatedDescription(item, locale)
  if (!translated) return undefined
  return removeUnavailableIngredients(translated, item.unavailableIngredients || [], locale)
}

// Un ingrediente come compare nel dettaglio del piatto
export interface DishIngredient {
  label: string // come lo vede il cliente
  kitchenName: string // in italiano, per scontrino e schermo cucina
  replaces?: string // ingrediente esaurito (in italiano) al cui posto c'e' questo
}

const shownParts = (item: MenuItem, locale: string): ShownPart[] => {
  const translated = getTranslatedDescription(item, locale)
  if (!translated) return []
  return applyUnavailableIngredients(translated, item.unavailableIngredients || [], locale)
    .map((p) => ({ ...p, text: p.text.replace(/\.$/, '') }))
    .filter((p) => p.text)
}

// Ingredienti del piatto come li vede il cliente (gia' senza gli esauriti e con i
// sostituti), ognuno con il nome italiano per la cucina. Le traduzioni generate
// hanno le stesse voci dell'italiano nello stesso ordine; se una traduzione
// salvata ne ha un numero diverso, alla cucina arriva la voce tradotta.
export function getDishIngredients(item: MenuItem, locale: string): DishIngredient[] {
  const local = shownParts(item, locale)
  const italian = locale === 'it' ? local : shownParts(item, 'it')
  const aligned = italian.length === local.length
  return local.map((part, i) => ({
    label: part.text,
    kitchenName: part.replaces?.substitute?.name ?? (aligned ? italian[i].text : part.text),
    replaces: part.replaces?.name,
  }))
}

// Cosa deve sapere la cucina: i sostituti mostrati al cliente e gli ingredienti
// che ha tolto (posizioni in `ingredients`). Un sostituto tolto vale come tolto.
export function getDishChanges(ingredients: DishIngredient[], removed: ReadonlySet<number> = new Set()): DishChanges {
  const changes: DishChanges = {}
  const substitutions = ingredients
    .filter((ing, i) => ing.replaces && !removed.has(i))
    .map((ing) => ({ from: ing.replaces!, to: ing.kitchenName }))
  const removedIngredients = ingredients
    .filter((_, i) => removed.has(i))
    .map((ing) => ({ name: ing.kitchenName, label: ing.label }))
  if (substitutions.length) changes.substitutions = substitutions
  if (removedIngredients.length) changes.removedIngredients = removedIngredients
  return changes
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

// Confronto tollerante: senza accenti, maiuscole, spazi ("Cream cheese" = "Creamcheese")
// e punteggiatura ai bordi ("Pesto." a fine descrizione = "Pesto")
const foldName = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/^[\s.;:!]+|[\s.;:!]+$/g, '').replace(/\s+/g, '')

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

// Riempie le descrizioni tradotte a partire dagli ingredienti, ma solo se TUTTE
// le voci sono ingredienti tradotti: vince sulla traduzione salvata (spesso rimasta
// indietro rispetto all'italiano). Se manca anche una sola voce resta la traduzione
// salvata o l'italiano: meglio di un testo mezzo italiano e mezzo tradotto.
export function fillDescriptionTranslations<T extends DescribedItem>(item: T, index: Map<string, IngredientNames>): T {
  if (!item.description?.trim() || index.size === 0) return item
  const result = { ...item }
  for (const { locale, descKey } of DESCRIPTION_LOCALES) {
    const generated = translateDescriptionFromIngredients(item.description, locale, index)
    if (generated?.complete) result[descKey] = generated.text
  }
  return result
}

// ============ INGREDIENTI ESAURITI CITATI NELLE DESCRIZIONI ============

const descriptionTexts = (item: DescribedItem) =>
  [item.description, item.descriptionEn, item.descriptionFr, item.descriptionEs, item.descriptionHe]
    .filter((d): d is string => !!d)

const allNames = (ing: IngredientNames) =>
  [ing.name, ing.nameEn, ing.nameFr, ing.nameEs, ing.nameHe].filter((n): n is string => !!n?.trim())

// Nomi normalizzati di ALTRI ingredienti che contengono il nome di questo, in
// qualunque lingua: per Pomodoro "Pomodorini ciliegia", "Passata pomodoro"...
// Una voce che e' uno di questi e' quell'ingrediente, non questo: con il
// Pomodoro esaurito i Pomodorini ciliegia restano nel menu.
export function similarIngredientNames(
  ing: IngredientNames & { id: string },
  all: (IngredientNames & { id: string })[]
): string[] {
  const names = allNames(ing)
  // "Pomodori" e' ancora il Pomodoro, anche se un altro ingrediente si chiama cosi'
  const own = new Set(names.flatMap(n => getVariants(foldName(n))))
  const similar = new Set<string>()
  for (const other of all) {
    if (!other || other.id === ing.id) continue
    for (const otherName of allNames(other)) {
      if (!names.some(n => partMentions(otherName.toLowerCase(), n))) continue
      for (const key of getVariants(foldName(otherName))) {
        if (key && !own.has(key)) similar.add(key)
      }
    }
  }
  return [...similar]
}

// Voci normalizzate delle descrizioni del piatto, in tutte le lingue
export function descriptionPartKeys(item: DescribedItem): Set<string> {
  return new Set(descriptionTexts(item).flatMap(d => d.split(',').map(foldName)).filter(Boolean))
}

// Il piatto cita l'ingrediente nella descrizione, in qualunque lingua (escluse le
// voci che sono altri ingredienti col nome simile). Ricalcolata a ogni lettura del
// menu, vale anche per piatti creati, descrizioni cambiate o ingredienti rinominati
// dopo che l'ingrediente e' finito.
export function descriptionMentions(item: DescribedItem, ing: { name: string; similarNames?: string[] }): boolean {
  const similar = new Set(ing.similarNames || [])
  return descriptionTexts(item).some(d => d.split(',').some(part =>
    !similar.has(foldName(part)) && partMentions(part.toLowerCase(), ing.name)
  ))
}

// Voci della descrizione che non corrispondono a nessun ingrediente:
// in admin avvisano che la descrizione non verra' tradotta automaticamente.
export function findUnmatchedDescriptionParts(description: string, index: Map<string, IngredientNames>): string[] {
  return description.split(',').map(p => p.trim()).filter(Boolean).filter(part => {
    if (index.has(foldName(part))) return false
    const halves = part.split(/\s+e\s+/i)
    return !(halves.length === 2 && halves.every(h => index.has(foldName(h))))
  }).map(p => p.replace(/[.;:!]+$/, ''))
}

// Traduzione mancante o rovinata (salvataggi da terminale avevano trasformato
// l'ebraico in "????" e gli accenti in "�")
export const isBrokenTranslation = (value?: string | null) => !value?.trim() || /\?{2,}|\uFFFD/.test(value)
