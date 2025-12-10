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
          {section.image && (section.id === 'panini' || section.id === 'piatti' || section.id === 'caffetteria') ? (
            <Image
              src={section.image}
              alt={section.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary-400 to-primary-600">
              {/* Placeholder icon based on section */}
              <div className="absolute inset-0 flex items-center justify-center opacity-20">
                {section.id === 'bibite' && (
                  <svg className="w-24 h-24 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 2l2.01 18.23C5.13 21.23 5.97 22 7 22h10c1.03 0 1.87-.77 1.99-1.77L21 2H3zm9 17c-1.66 0-3-1.34-3-3 0-2 3-5.4 3-5.4s3 3.4 3 5.4c0 1.66-1.34 3-3 3zm6.33-11H5.67l-.44-4h13.53l-.43 4z"/>
                  </svg>
                )}
              </div>
            </div>
          )}

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
