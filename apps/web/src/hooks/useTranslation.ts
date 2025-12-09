'use client'

import { useState, useEffect } from 'react'
import { translateToItalian, mightNeedTranslation } from '@/lib/translations'

interface TranslationState {
  translated: string
  isTranslating: boolean
  needsTranslation: boolean
}

/**
 * Hook to automatically translate text to Italian
 * Only translates if text appears to be in a foreign language
 */
export function useTranslation(text: string | null | undefined): TranslationState {
  const [state, setState] = useState<TranslationState>({
    translated: text || '',
    isTranslating: false,
    needsTranslation: false
  })

  useEffect(() => {
    if (!text) {
      setState({
        translated: '',
        isTranslating: false,
        needsTranslation: false
      })
      return
    }

    const needsTranslation = mightNeedTranslation(text)

    if (!needsTranslation) {
      setState({
        translated: text,
        isTranslating: false,
        needsTranslation: false
      })
      return
    }

    setState(prev => ({
      ...prev,
      isTranslating: true,
      needsTranslation: true
    }))

    translateToItalian(text).then(translated => {
      setState({
        translated,
        isTranslating: false,
        needsTranslation: true
      })
    })
  }, [text])

  return state
}

/**
 * Hook to translate multiple texts at once (for order items)
 */
export function useTranslations(texts: (string | null | undefined)[]): Map<string, TranslationState> {
  const [translations, setTranslations] = useState<Map<string, TranslationState>>(new Map())

  useEffect(() => {
    const newTranslations = new Map<string, TranslationState>()
    const toTranslate: string[] = []

    // Initialize states
    texts.forEach(text => {
      if (!text) return

      const needsTranslation = mightNeedTranslation(text)

      if (needsTranslation) {
        toTranslate.push(text)
        newTranslations.set(text, {
          translated: text,
          isTranslating: true,
          needsTranslation: true
        })
      } else {
        newTranslations.set(text, {
          translated: text,
          isTranslating: false,
          needsTranslation: false
        })
      }
    })

    setTranslations(new Map(newTranslations))

    // Translate all that need it
    Promise.all(
      toTranslate.map(async text => {
        const translated = await translateToItalian(text)
        return { original: text, translated }
      })
    ).then(results => {
      setTranslations(prev => {
        const updated = new Map(prev)
        results.forEach(({ original, translated }) => {
          updated.set(original, {
            translated,
            isTranslating: false,
            needsTranslation: true
          })
        })
        return updated
      })
    })
  }, [texts.join('|')])

  return translations
}
