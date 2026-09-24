'use client'

/**
 * SidebarMenuLayout
 *
 * Layout ufficiale del menu: le aree stanno in una sidebar fissa a sinistra,
 * il centro scorre con tutte le categorie in sequenza. Cliccando un'area si
 * scrolla alla sua prima categoria; scrollando a mano la sidebar segue.
 *
 * Condiviso da tavolo/kiosk, asporto (/ordina) e banco: ognuno passa il proprio
 * header e, come children, carrello, modale piatto e messaggio di conferma.
 */

import { ArrowLeft } from 'lucide-react'
import { useRef, useEffect, useState, useMemo, useCallback, type ReactNode } from 'react'
import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { MenuItemCard } from '@/components/menu/MenuItemCard'
import { menuSections, categoryToSectionMap, getSectionName } from '@/components/menu/MenuSections'
import { getTranslatedName, getTranslatedDescription } from '@/lib/translations'
import { cn, type PriceContext } from '@/lib/utils'
import type { Category, MenuItem } from '@shared/types'

const MERGED_TOAST_ID = 'panini-merged'

// Area di una categoria: match esatto sul nome, poi per contenimento (es.
// "Panini del giorno" finisce comunque nell'area Panini).
function getAreaIdForCategory(categoryName: string): string | undefined {
  const exact = categoryToSectionMap[categoryName]
  if (exact) return exact
  const lower = categoryName.toLowerCase()
  const entry = Object.entries(categoryToSectionMap).find(([key]) => lower.includes(key.toLowerCase()))
  return entry?.[1]
}

// Le categorie dell'area "toast" (Panini, Bagel, Focaccia farcita...) si
// mostrano come un'unica lista "Panini" ordinata per numero nel nome.
function mergeToastCategories(categories: Category[]): Category[] {
  const toast = categories.filter((c) => categoryToSectionMap[c.name] === 'toast')
  if (toast.length === 0) return categories

  const items = toast.flatMap((c) => c.items || [])
  items.sort((a, b) => {
    const numA = parseInt(a.name.match(/\d+/)?.[0] ?? '')
    const numB = parseInt(b.name.match(/\d+/)?.[0] ?? '')
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB
    if (!isNaN(numA)) return -1
    if (!isNaN(numB)) return 1
    return a.name.localeCompare(b.name)
  })

  const merged: Category = {
    ...toast[0],
    id: MERGED_TOAST_ID,
    name: 'Panini',
    nameEn: 'Sandwiches',
    nameFr: 'Sandwichs',
    nameEs: 'Sándwiches',
    nameHe: 'כריכות',
    items,
  }

  return categories.flatMap((c) => (c === toast[0] ? [merged] : toast.includes(c) ? [] : [c]))
}

interface RailEntry {
  key: string
  label: string
  image?: string
  firstCategoryId: string
  categoryIds: string[]
}

export function SidebarBackButton({ onClick }: { onClick: () => void }) {
  const tc = useTranslations('common')
  return (
    <button
      onClick={onClick}
      aria-label={tc('back')}
      className="flex items-center gap-2 px-4 py-2.5 -ml-1 rounded-xl bg-white/15 hover:bg-white/25 active:bg-white/30 transition font-semibold text-base shadow-sm backdrop-blur-sm"
    >
      <ArrowLeft className="w-5 h-5" />
      <span className="hidden sm:inline">{tc('back')}</span>
    </button>
  )
}

interface SidebarMenuLayoutProps {
  header: ReactNode
  categories: Category[]
  activeCategory: string
  onCategorySelect: (categoryId: string) => void
  onAddItem: (item: MenuItem) => void
  priceContext?: PriceContext
  children?: ReactNode
}

export function SidebarMenuLayout({
  header,
  categories,
  activeCategory,
  onCategorySelect,
  onAddItem,
  priceContext,
  children,
}: SidebarMenuLayoutProps) {
  const locale = useLocale()
  const categoryRefs = useRef<Record<string, HTMLElement | null>>({})
  const headerRef = useRef<HTMLElement | null>(null)
  const railRef = useRef<HTMLElement | null>(null)
  const entryRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [headerHeight, setHeaderHeight] = useState(96)

  const displayCategories = useMemo(() => mergeToastCategories(categories), [categories])

  useEffect(() => {
    const el = headerRef.current
    if (!el) return
    const update = () => setHeaderHeight(el.offsetHeight)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Una voce per area (le categorie non mappate ne hanno una propria), nello
  // stesso ordine con cui compaiono nel menu.
  const entries = useMemo(() => {
    const list: RailEntry[] = []
    for (const cat of displayCategories) {
      const areaId = getAreaIdForCategory(cat.name)
      const area = areaId ? menuSections.find((a) => a.id === areaId) : undefined
      const key = area ? area.id : `cat-${cat.id}`
      const existing = list.find((e) => e.key === key)
      if (existing) {
        existing.categoryIds.push(cat.id)
        continue
      }
      list.push({
        key,
        label: area ? getSectionName(area, locale) : getTranslatedName(cat, locale),
        image: area?.image,
        firstCategoryId: cat.id,
        categoryIds: [cat.id],
      })
    }
    return list
  }, [displayCategories, locale])

  const activeEntryKey = entries.find((e) => e.categoryIds.includes(activeCategory))?.key

  const scrollToCategory = useCallback(
    (categoryId: string) => {
      onCategorySelect(categoryId)
      categoryRefs.current[categoryId]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    },
    [onCategorySelect]
  )

  // Scrollspy: la categoria attiva e' l'ultima il cui inizio ha superato la
  // linea appena sotto l'header.
  useEffect(() => {
    if (displayCategories.length === 0) return

    const triggerOffset = headerHeight + 24
    let ticking = false

    const updateActive = () => {
      ticking = false

      // A fondo pagina l'ultima sezione puo' non raggiungere mai la linea
      // soglia se non c'e' abbastanza scroll residuo: in quel caso vince lei.
      const scrolledToBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2

      let currentId = displayCategories[0].id
      for (const category of displayCategories) {
        const el = categoryRefs.current[category.id]
        if (!el) continue
        if (el.getBoundingClientRect().top <= triggerOffset) currentId = category.id
        else break
      }
      onCategorySelect(scrolledToBottom ? displayCategories[displayCategories.length - 1].id : currentId)
    }

    const onScroll = () => {
      if (!ticking) {
        ticking = true
        requestAnimationFrame(updateActive)
      }
    }

    updateActive()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [displayCategories, headerHeight, onCategorySelect])

  // Se le aree non stanno tutte in altezza, tiene visibile quella attiva.
  useEffect(() => {
    const rail = railRef.current
    const btn = activeEntryKey ? entryRefs.current[activeEntryKey] : null
    if (!rail || !btn) return
    const top = btn.offsetTop
    const bottom = top + btn.offsetHeight
    if (top < rail.scrollTop) rail.scrollTop = Math.max(0, top - 8)
    else if (bottom > rail.scrollTop + rail.clientHeight) rail.scrollTop = bottom - rail.clientHeight + 8
  }, [activeEntryKey])

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-primary-50/40 pb-24">
      <header
        ref={headerRef}
        className="sticky top-0 z-40 bg-gradient-to-r from-primary-500 to-primary-600 text-white p-4 sm:p-5 md:px-8 shadow-lg rounded-b-2xl sm:rounded-b-3xl"
      >
        {header}
      </header>

      <div className="flex items-start">
        <aside
          ref={railRef}
          className="sticky shrink-0 w-20 sm:w-24 md:w-32 lg:w-36 overflow-y-auto bg-white/90 backdrop-blur-sm shadow-[2px_0_12px_-4px_rgba(0,0,0,0.1)] z-30 [scrollbar-width:thin] [scrollbar-color:theme(colors.primary.300)_transparent] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-primary-300 [&::-webkit-scrollbar-button]:hidden"
          style={{
            top: headerHeight,
            maxHeight: `calc(100vh - ${headerHeight}px)`,
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
          }}
        >
          <div className="flex flex-col gap-1.5 px-2 md:px-3 py-4">
            {entries.map((entry) => {
              const isActive = activeEntryKey === entry.key
              return (
                <button
                  key={entry.key}
                  ref={(el) => {
                    entryRefs.current[entry.key] = el
                  }}
                  onClick={() => scrollToCategory(entry.firstCategoryId)}
                  className={cn(
                    'group w-full flex flex-col items-center gap-2 py-3 px-1 rounded-2xl text-center transition-all duration-200',
                    isActive ? 'bg-primary-50 shadow-sm' : 'hover:bg-gray-50 active:bg-gray-100'
                  )}
                >
                  <div
                    className={cn(
                      'relative w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-[4.5rem] lg:h-[4.5rem] rounded-full overflow-hidden bg-gray-100 shrink-0 transition-all duration-200 flex items-center justify-center',
                      isActive
                        ? 'ring-[3px] ring-primary-500 ring-offset-2 shadow-md scale-105'
                        : 'ring-1 ring-black/5 group-hover:ring-primary-200 group-hover:scale-[1.03]'
                    )}
                  >
                    {entry.image ? (
                      <Image src={entry.image} alt="" fill className="object-cover" sizes="72px" />
                    ) : (
                      <span className="text-lg font-display font-bold text-primary-600">
                        {entry.label.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-[11px] md:text-xs leading-tight line-clamp-2 break-words transition-colors',
                      isActive ? 'font-semibold text-primary-700' : 'font-medium text-gray-500'
                    )}
                  >
                    {entry.label}
                  </span>
                </button>
              )
            })}
          </div>
          {/* Sfumatura in fondo: segnala che sotto ci sono altre aree da scrollare */}
          <div className="sticky bottom-0 left-0 right-0 h-8 -mt-8 bg-gradient-to-t from-white/95 to-transparent pointer-events-none" />
        </aside>

        <main className="flex-1 min-w-0 flex justify-center px-4 sm:px-6 md:px-8 py-6">
          <div className="w-full max-w-3xl">
            {displayCategories.map((category, index) => {
              const description = getTranslatedDescription(category, locale)
              return (
                <section
                  key={category.id}
                  ref={(el) => {
                    categoryRefs.current[category.id] = el
                  }}
                  style={{ scrollMarginTop: headerHeight + 8 }}
                  className={cn('pb-8 md:pb-10', index > 0 && 'pt-8 md:pt-10 border-t border-gray-200/70')}
                >
                  <div className="flex items-baseline justify-between gap-2.5 mb-1">
                    <div className="flex items-baseline gap-2.5">
                      <span className="w-1.5 h-5 md:h-6 rounded-full bg-primary-500 shrink-0" />
                      <h2 className="text-xl sm:text-2xl font-display font-bold text-gray-900">
                        {getTranslatedName(category, locale)}
                      </h2>
                    </div>
                    {category.items && category.items.length > 0 && (
                      <span className="text-xs font-medium text-primary-600 bg-primary-50 px-2.5 py-1 rounded-full shrink-0">
                        {category.items.length}
                      </span>
                    )}
                  </div>
                  {description && <p className="text-gray-500 text-sm mb-4 pl-4">{description}</p>}

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 pt-1">
                    {category.items?.map((item) => (
                      <MenuItemCard key={item.id} item={item} onAdd={onAddItem} priceContext={priceContext} />
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        </main>
      </div>

      {children}
    </div>
  )
}
