'use client'

/**
 * TEMP: harness locale con dati finti per verificare visivamente
 * MenuStepSidebar senza dover parlare col backend. Da cancellare.
 */

import { useState } from 'react'
import { MenuStep } from '@/components/menu/steps/MenuStep'
import type { Category, MenuItem } from '@shared/types'

function item(id: string, categoryId: string, name: string, price: number): MenuItem {
  return {
    id,
    name,
    price,
    available: true,
    sortOrder: 0,
    categoryId,
    description: 'Pomodoro, mozzarella, basilico, olio evo',
  }
}

const categories: Category[] = [
  { id: 'c1', name: 'Panini', sortOrder: 1, active: true, items: Array.from({ length: 6 }, (_, i) => item(`p${i}`, 'c1', `Panino ${i + 1}`, 550 + i * 50)) },
  { id: 'c2', name: 'Piadina', sortOrder: 2, active: true, items: Array.from({ length: 4 }, (_, i) => item(`pi${i}`, 'c2', `Piadina ${i + 1}`, 600 + i * 50)) },
  { id: 'c3', name: 'Focaccia e Pizza', sortOrder: 3, active: true, items: Array.from({ length: 5 }, (_, i) => item(`f${i}`, 'c3', `Focaccia ${i + 1}`, 700 + i * 50)) },
  { id: 'c4', name: 'Insalate', sortOrder: 4, active: true, items: Array.from({ length: 4 }, (_, i) => item(`s${i}`, 'c4', `Insalata ${i + 1}`, 750 + i * 50)) },
  { id: 'c5', name: 'Caffetteria', sortOrder: 5, active: true, items: Array.from({ length: 8 }, (_, i) => item(`cf${i}`, 'c5', `Caffè ${i + 1}`, 150 + i * 30)) },
  { id: 'c6', name: 'Bibite', sortOrder: 6, active: true, items: Array.from({ length: 6 }, (_, i) => item(`b${i}`, 'c6', `Bibita ${i + 1}`, 300 + i * 20)) },
  { id: 'c8', name: 'Bagel', sortOrder: 8, active: true, items: [item('bg2','c8','Bagel 2',600), item('bg1','c8','Bagel 1',550)] },
  { id: 'c9', name: 'Dolci', sortOrder: 9, active: true, items: [item('d1','c9','Tiramisu',400)] },
  { id: 'c7', name: 'Sushi', sortOrder: 7, active: true, items: Array.from({ length: 5 }, (_, i) => item(`su${i}`, 'c7', `Sushi ${i + 1}`, 900 + i * 50)) },
]

export default function MenuV2Preview() {
  const [activeCategory, setActiveCategory] = useState('c1')
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)

  return (
    <MenuStep
      tableNumber={4}
      tableSession={null}
      categories={categories}
      activeCategory={activeCategory}
      selectedItem={selectedItem}
      isCartOpen={isCartOpen}
      orderSuccess={false}
      estimatedWait={undefined}
      onGoBack={() => {}}
      onCategorySelect={setActiveCategory}
      onAddItem={setSelectedItem}
      onAddWithModifiers={() => setSelectedItem(null)}
      onSelectItemClose={() => setSelectedItem(null)}
      onCartOpen={setIsCartOpen}
      onOrderSuccess={() => {}}
    />
  )
}
