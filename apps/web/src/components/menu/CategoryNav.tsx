'use client'

import { cn } from '@/lib/utils'
import type { Category } from '@shared/types'

interface CategoryNavProps {
  categories: Category[]
  activeCategory: string
  onSelect: (categoryId: string) => void
}

export function CategoryNav({ categories, activeCategory, onSelect }: CategoryNavProps) {
  return (
    <nav className="sticky top-0 z-10 bg-white border-b border-gray-200 overflow-x-auto scrollbar-hide">
      <div className="flex gap-2 p-3">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onSelect(category.id)}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition',
              activeCategory === category.id
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            {category.name}
          </button>
        ))}
      </div>
    </nav>
  )
}
