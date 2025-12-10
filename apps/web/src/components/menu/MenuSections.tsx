'use client'

import { useLocale } from 'next-intl'
import Image from 'next/image'

export interface MenuSection {
  id: string
  name: string
  nameEn: string
  nameFr: string
  nameEs: string
  nameHe: string
  image: string
  categoryIds: string[] // IDs delle categorie che appartengono a questa sezione
}

// Definizione delle macro-sezioni del menu
export const menuSections: MenuSection[] = [
  {
    id: 'panini',
    name: 'Panini Farciti',
    nameEn: 'Stuffed Sandwiches',
    nameFr: 'Sandwichs Garnis',
    nameEs: 'Bocadillos Rellenos',
    nameHe: 'כריכים ממולאים',
    image: '/sections/panini.jpg',
    categoryIds: [] // Verrà popolato dinamicamente basandosi sui nomi delle categorie
  },
  {
    id: 'piatti',
    name: 'Piatti',
    nameEn: 'Dishes',
    nameFr: 'Plats',
    nameEs: 'Platos',
    nameHe: 'מנות',
    image: '/sections/piatti.jpg',
    categoryIds: []
  },
  {
    id: 'caffetteria',
    name: 'Caffetteria',
    nameEn: 'Coffee Shop',
    nameFr: 'Café',
    nameEs: 'Cafeteria',
    nameHe: 'בית קפה',
    image: '/sections/caffetteria.jpg',
    categoryIds: []
  },
  {
    id: 'bibite',
    name: 'Bibite',
    nameEn: 'Beverages',
    nameFr: 'Boissons',
    nameEs: 'Bebidas',
    nameHe: 'משקאות',
    image: '/sections/bibite.jpg',
    categoryIds: []
  }
]

// Mappa per associare le categorie alle sezioni basandosi sul nome della categoria
export const categoryToSectionMap: Record<string, string> = {
  // Panini Farciti
  'Toast': 'panini',
  'Piadina': 'panini',
  'Pizza e Focaccia': 'panini',
  // Piatti
  'Salad': 'piatti',
  'Affumicato': 'piatti',
  'Caprese': 'piatti',
  'Bruschetta': 'piatti',
  // Caffetteria
  'Caffetteria': 'caffetteria',
  // Bibite
  'Bevande': 'bibite'
}

export function getSectionName(section: MenuSection, locale: string): string {
  switch (locale) {
    case 'en': return section.nameEn
    case 'fr': return section.nameFr
    case 'es': return section.nameEs
    case 'he': return section.nameHe
    default: return section.name
  }
}

interface MenuSectionsProps {
  onSelectSection: (sectionId: string) => void
}

export function MenuSections({ onSelectSection }: MenuSectionsProps) {
  const locale = useLocale()

  return (
    <div className="p-4 grid grid-cols-2 gap-4">
      {menuSections.map((section) => (
        <button
          key={section.id}
          onClick={() => onSelectSection(section.id)}
          className="relative aspect-square rounded-2xl overflow-hidden shadow-lg group active:scale-95 transition-transform"
        >
          {/* Background Image or Placeholder */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary-400 to-primary-600">
            {/* Placeholder icon based on section */}
            <div className="absolute inset-0 flex items-center justify-center opacity-20">
              {section.id === 'panini' && (
                <svg className="w-24 h-24 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
              )}
              {section.id === 'piatti' && (
                <svg className="w-24 h-24 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z"/>
                </svg>
              )}
              {section.id === 'caffetteria' && (
                <svg className="w-24 h-24 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.11 0 2-.89 2-2V5c0-1.11-.89-2-2-2zm0 5h-2V5h2v3zM4 19h16v2H4z"/>
                </svg>
              )}
              {section.id === 'bibite' && (
                <svg className="w-24 h-24 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 2l2.01 18.23C5.13 21.23 5.97 22 7 22h10c1.03 0 1.87-.77 1.99-1.77L21 2H3zm9 17c-1.66 0-3-1.34-3-3 0-2 3-5.4 3-5.4s3 3.4 3 5.4c0 1.66-1.34 3-3 3zm6.33-11H5.67l-.44-4h13.53l-.43 4z"/>
                </svg>
              )}
            </div>
          </div>

          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          {/* Section Name */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="text-white text-2xl font-display font-semibold text-center drop-shadow-lg italic">
              {getSectionName(section, locale)}
            </h3>
          </div>

          {/* Hover/Active effect */}
          <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors" />
        </button>
      ))}
    </div>
  )
}
