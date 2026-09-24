export interface MenuSection {
  id: string;
  name: string;
  nameEn: string;
  nameFr: string;
  nameEs: string;
  nameHe: string;
  image: string;
  categoryIds: string[]; // IDs delle categorie che appartengono a questa sezione
}

// Definizione delle macro-sezioni del menu
// Note: alcune immagini usano placeholder temporanei (panini.jpg o piatti.jpg)
export const menuSections: MenuSection[] = [
  {
    id: "toast",
    name: "MyPanino",
    nameEn: "MyPanino",
    nameFr: "MyPanino",
    nameEs: "MyPanino",
    nameHe: "MyPanino",
    image: "/sections/panini.jpg",
    categoryIds: [], // Panini, Bagel, Focaccia Farcita
  },
  {
    id: "piadine",
    name: "MyPiadina",
    nameEn: "MyPiadina",
    nameFr: "MyPiadina",
    nameEs: "MyPiadina",
    nameHe: "MyPiadina",
    image: "/sections/panini.jpg", // placeholder
    categoryIds: [], // Piadina
  },
  {
    id: "pizze-focacce",
    name: "MyFocaccia e MyPizza",
    nameEn: "MyFocaccia e MyPizza",
    nameFr: "MyFocaccia e MyPizza",
    nameEs: "MyFocaccia e MyPizza",
    nameHe: "MyFocaccia e MyPizza",
    image: "/sections/piatti.jpg", // placeholder
    categoryIds: [], // Focaccia e Pizza
  },
  {
    id: "bruschette",
    name: "MyBruschetta",
    nameEn: "MyBruschetta",
    nameFr: "MyBruschetta",
    nameEs: "MyBruschetta",
    nameHe: "MyBruschetta",
    image: "/sections/piatti.jpg", // placeholder
    categoryIds: [], // Bruschetta
  },
  {
    id: "affumicato",
    name: "MyAffumicato",
    nameEn: "MyAffumicato",
    nameFr: "MyAffumicato",
    nameEs: "MyAffumicato",
    nameHe: "MyAffumicato",
    image: "/sections/piatti.jpg", // placeholder
    categoryIds: [], // Affumicato
  },
  {
    id: "caprese",
    name: "MyCaprese",
    nameEn: "MyCaprese",
    nameFr: "MyCaprese",
    nameEs: "MyCaprese",
    nameHe: "MyCaprese",
    image: "/sections/piatti.jpg", // placeholder
    categoryIds: [], // Caprese
  },
  {
    id: "salad",
    name: "MyInsalata",
    nameEn: "MyInsalata",
    nameFr: "MyInsalata",
    nameEs: "MyInsalata",
    nameHe: "MyInsalata",
    image: "/sections/piatti.jpg", // placeholder
    categoryIds: [], // Insalate
  },
  {
    id: "bibite",
    name: "Bibite",
    nameEn: "Beverages",
    nameFr: "Boissons",
    nameEs: "Bebidas",
    nameHe: "משקאות",
    image: "/sections/bibite.jpg",
    categoryIds: [], // Bibite, Bevande
  },
  {
    id: "caffetteria",
    name: "Caffetteria",
    nameEn: "Coffee",
    nameFr: "Café",
    nameEs: "Cafetería",
    nameHe: "קפה",
    image: "/sections/caffetteria.jpg",
    categoryIds: [], // Caffetteria
  },
  {
    id: "sushi",
    name: "MySushi",
    nameEn: "MySushi",
    nameFr: "MySushi",
    nameEs: "MySushi",
    nameHe: "MySushi",
    image: "/sections/sushi.jpg",
    categoryIds: [], // Sushi
  },
];

// Mappa per associare le categorie alle sezioni basandosi sul nome della categoria
export const categoryToSectionMap: Record<string, string> = {
  // Sezione Panini (categoria unificata nel DB si chiama "Panini"; "Toast" mantenuto per retrocompatibilità)
  Panini: "toast",
  Toast: "toast",
  Panino: "toast",
  Bagel: "toast",
  "Focaccia Farcita": "toast",
  Ciabatte: "toast",
  Ciabatta: "toast",
  "Club Sandwich": "toast",
  // Sezione Piadine
  Piadina: "piadine",
  Piadine: "piadine",
  // Sezione Pizze e Focacce
  "Focaccia e Pizza": "pizze-focacce",
  Pizza: "pizze-focacce",
  Focaccia: "pizze-focacce",
  // Sezione Bruschette
  Bruschetta: "bruschette",
  Bruschette: "bruschette",
  // Sezione Affumicato
  Affumicato: "affumicato",
  // Sezione Caprese
  Caprese: "caprese",
  // Sezione Salad
  Insalate: "salad",
  Salad: "salad",
  // Sezione Bibite
  Bibite: "bibite",
  Bevande: "bibite",
  // Caffetteria
  Caffetteria: "caffetteria",
  // Sushi
  Sushi: "sushi",
  // Nomi "My..." (rinomina categorie)
  MyPanino: "toast",
  MyPiadina: "piadine",
  "MyFocaccia e MyPizza": "pizze-focacce",
  MyBruschetta: "bruschette",
  MyAffumicato: "affumicato",
  MyCaprese: "caprese",
  MyInsalata: "salad",
  MySushi: "sushi",
};

export function getSectionName(section: MenuSection, locale: string): string {
  switch (locale) {
    case "en":
      return section.nameEn;
    case "fr":
      return section.nameFr;
    case "es":
      return section.nameEs;
    case "he":
      return section.nameHe;
    default:
      return section.name;
  }
}
