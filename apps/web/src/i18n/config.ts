export const locales = ['it', 'en', 'fr', 'es', 'he'] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'it'

export const localeNames: Record<Locale, string> = {
  it: 'Italiano',
  en: 'English',
  fr: 'Français',
  es: 'Español',
  he: 'עברית'
}

export const rtlLocales: Locale[] = ['he']

export function isRtl(locale: Locale): boolean {
  return rtlLocales.includes(locale)
}
