"use client";

import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { getTranslatedName } from "@/lib/translations";
import type { Category } from "@shared/types";

// Definizione delle sezioni del menu con le categorie che contengono
interface MenuSectionDef {
  id: string;
  label: Record<string, string>;
  categories: string[]; // Nomi delle categorie che appartengono a questa sezione
}

const menuSectionDefs: MenuSectionDef[] = [
  {
    id: "sushi",
    label: { it: "Sushi", en: "Sushi", fr: "Sushi", es: "Sushi", he: "סושי" },
    categories: ["Sushi"],
  },
  {
    id: "toast",
    label: { it: "Toast", en: "Toast", fr: "Toast", es: "Tostadas", he: "טוסט" },
    categories: ["Panini", "Bagel", "Focaccia Farcita", "Focaccia e Pizza"],
  },
  {
    id: "piadine",
    label: { it: "Piadine", en: "Piadinas", fr: "Piadines", es: "Piadinas", he: "פיאדינות" },
    categories: ["Piadina"],
  },
  {
    id: "piatti",
    label: { it: "Piatti", en: "Dishes", fr: "Plats", es: "Platos", he: "מנות" },
    categories: ["Insalate", "Caprese", "Affumicato", "Bruschetta"],
  },
  {
    id: "caffetteria",
    label: { it: "Caffetteria", en: "Coffee", fr: "Café", es: "Cafetería", he: "קפה" },
    categories: ["Caffetteria"],
  },
  {
    id: "bevande",
    label: { it: "Bevande", en: "Beverages", fr: "Boissons", es: "Bebidas", he: "משקאות" },
    categories: ["Bibite", "Bevande"],
  },
];

// Funzione per ottenere la sezione di una categoria
function getCategorySection(categoryName: string): MenuSectionDef | undefined {
  return menuSectionDefs.find((section) =>
    section.categories.some((cat) => categoryName.toLowerCase().includes(cat.toLowerCase()))
  );
}

interface CategoryNavProps {
  categories: Category[];
  activeCategory: string;
  onSelect: (categoryId: string) => void;
}

export function CategoryNav({ categories, activeCategory, onSelect }: CategoryNavProps) {
  const locale = useLocale();

  // Raggruppa le categorie per sezione
  const groupedCategories: { section: MenuSectionDef | null; categories: Category[] }[] = [];
  let currentSection: MenuSectionDef | undefined = undefined;

  categories.forEach((category) => {
    const section = getCategorySection(category.name);

    if (section !== currentSection) {
      groupedCategories.push({ section: section || null, categories: [category] });
      currentSection = section;
    } else {
      const lastGroup = groupedCategories[groupedCategories.length - 1];
      if (lastGroup) {
        lastGroup.categories.push(category);
      }
    }
  });

  return (
    <nav className="sticky top-0 z-10 bg-white border-b border-gray-200 overflow-x-auto scrollbar-hide">
      <div className="flex gap-2 p-3 items-center">
        {groupedCategories.map((group, groupIndex) => (
          <div key={groupIndex} className="flex gap-2 items-center">
            {/* Separatore sezione */}
            {group.section && groupIndex > 0 && <div className="h-6 w-px bg-gray-300 mx-1" />}
            {/* Label sezione */}
            {group.section && (
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap pr-1">
                {group.section.label[locale] || group.section.label.it}
              </span>
            )}
            {/* Categorie della sezione */}
            {group.categories.map((category) => (
              <button
                key={category.id}
                onClick={() => onSelect(category.id)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition",
                  activeCategory === category.id
                    ? "bg-primary-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                )}
              >
                {getTranslatedName(category, locale)}
              </button>
            ))}
          </div>
        ))}
      </div>
    </nav>
  );
}
