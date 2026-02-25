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
// Note: alcune immagini usano placeholder temporanei (panini.jpg o piatti.jpg)
export const menuSections: MenuSection[] = [
  {
    id: 'toast',
    name: 'Toast',
    nameEn: 'Toast',
    nameFr: 'Toast',
    nameEs: 'Tostadas',
    nameHe: 'טוסט',
    image: '/sections/panini.jpg',
    categoryIds: [] // Panini, Bagel, Focaccia Farcita
  },
  {
    id: 'piadine',
    name: 'Piadine',
    nameEn: 'Piadinas',
    nameFr: 'Piadines',
    nameEs: 'Piadinas',
    nameHe: 'פיאדינות',
    image: '/sections/panini.jpg', // placeholder
    categoryIds: [] // Piadina
  },
  {
    id: 'pizze-focacce',
    name: 'Pizze e Focacce',
    nameEn: 'Pizza & Focaccia',
    nameFr: 'Pizzas et Focaccias',
    nameEs: 'Pizzas y Focaccias',
    nameHe: 'פיצה ופוקאצ\'ה',
    image: '/sections/piatti.jpg', // placeholder
    categoryIds: [] // Focaccia e Pizza
  },
  {
    id: 'bruschette',
    name: 'Bruschette',
    nameEn: 'Bruschetta',
    nameFr: 'Bruschetta',
    nameEs: 'Bruschetta',
    nameHe: 'ברוסקטה',
    image: '/sections/piatti.jpg', // placeholder
    categoryIds: [] // Bruschetta
  },
  {
    id: 'affumicato',
    name: 'Affumicato',
    nameEn: 'Smoked',
    nameFr: 'Fumé',
    nameEs: 'Ahumado',
    nameHe: 'מעושן',
    image: '/sections/piatti.jpg', // placeholder
    categoryIds: [] // Affumicato
  },
  {
    id: 'caprese',
    name: 'Caprese',
    nameEn: 'Caprese',
    nameFr: 'Caprese',
    nameEs: 'Caprese',
    nameHe: 'קפרזה',
    image: '/sections/piatti.jpg', // placeholder
    categoryIds: [] // Caprese
  },
  {
    id: 'salad',
    name: 'Salad',
    nameEn: 'Salad',
    nameFr: 'Salade',
    nameEs: 'Ensalada',
    nameHe: 'סלט',
    image: '/sections/piatti.jpg', // placeholder
    categoryIds: [] // Insalate
  },
  {
    id: 'bibite',
    name: 'Bibite',
    nameEn: 'Beverages',
    nameFr: 'Boissons',
    nameEs: 'Bebidas',
    nameHe: 'משקאות',
    image: '/sections/bibite.jpg',
    categoryIds: [] // Bibite, Bevande
  },
  {
    id: 'caffetteria',
    name: 'Caffetteria',
    nameEn: 'Coffee',
    nameFr: 'Café',
    nameEs: 'Cafetería',
    nameHe: 'קפה',
    image: '/sections/caffetteria.jpg',
    categoryIds: [] // Caffetteria
  },
  {
    id: 'sushi',
    name: 'Sushi',
    nameEn: 'Sushi',
    nameFr: 'Sushi',
    nameEs: 'Sushi',
    nameHe: 'סושי',
    image: '/sections/sushi.jpg',
    categoryIds: [] // Sushi
  }
]

// Mappa per associare le categorie alle sezioni basandosi sul nome della categoria
export const categoryToSectionMap: Record<string, string> = {
  // Sezione Toast (panini, bagel, focacce farcite)
  'Toast': 'toast',
  'Panini': 'toast',
  'Panino': 'toast',
  'Bagel': 'toast',
  'Focaccia Farcita': 'toast',
  'Ciabatte': 'toast',
  'Ciabatta': 'toast',
  'Club Sandwich': 'toast',
  // Sezione Piadine
  'Piadina': 'piadine',
  'Piadine': 'piadine',
  // Sezione Pizze e Focacce
  'Focaccia e Pizza': 'pizze-focacce',
  'Pizza': 'pizze-focacce',
  'Focaccia': 'pizze-focacce',
  // Sezione Bruschette
  'Bruschetta': 'bruschette',
  'Bruschette': 'bruschette',
  // Sezione Affumicato
  'Affumicato': 'affumicato',
  // Sezione Caprese
  'Caprese': 'caprese',
  // Sezione Salad
  'Insalate': 'salad',
  'Salad': 'salad',
  // Sezione Bibite
  'Bibite': 'bibite',
  'Bevande': 'bibite',
  // Caffetteria
  'Caffetteria': 'caffetteria',
  // Sushi
  'Sushi': 'sushi'
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
  // Categorie già filtrate (attive + nel range orario): usate per capire quali sezioni mostrare
  activeCategories?: { name: string }[]
}

export function MenuSections({ onSelectSection, activeCategories }: MenuSectionsProps) {
  const locale = useLocale()

  const visibleSections = menuSections.filter(section => {
    // Se non abbiamo le categorie, mostriamo tutto tranne sushi (comportamento sicuro)
    if (!activeCategories) return section.id !== 'sushi'

    // Una sezione è visibile se esiste almeno una categoria attiva che vi appartiene
    const sectionCategoryNames = Object.entries(categoryToSectionMap)
      .filter(([, sectionId]) => sectionId === section.id)
      .map(([catName]) => catName.toLowerCase())

    return activeCategories.some(cat =>
      sectionCategoryNames.includes(cat.name.toLowerCase())
    )
  })

  return (
    <div className="p-4 grid grid-cols-3 gap-3">
      {visibleSections.map((section) => (
        <button
          key={section.id}
          onClick={() => onSelectSection(section.id)}
          className="relative aspect-square rounded-2xl overflow-hidden shadow-lg group active:scale-95 transition-transform"
        >
          {/* Background Image */}
          <Image
            src={section.image}
            alt={section.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 33vw"
          />

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
