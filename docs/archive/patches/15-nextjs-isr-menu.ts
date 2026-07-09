/**
 * SOLUZIONE: Next.js ISR (Incremental Static Regeneration)
 * 
 * Il menu viene cachato lato server e rigenerato ogni 60 secondi.
 * Prima richiesta: ~300ms (fetch da Supabase)
 * Richieste successive: ~20ms (servito da cache)
 * 
 * Vantaggi:
 * - Veloce come statico ma si aggiorna automaticamente
 * - Non richiede webhook o script manuali
 * - Built-in in Next.js
 */

// ============================================================
// File: apps/web/src/app/api/menu/route.ts
// ============================================================

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Usa service role per bypassare RLS
)

export const revalidate = 60 // Rigenera ogni 60 secondi

export async function GET() {
  try {
    // Query parallele
    const [categoriesResult, ingredientsResult] = await Promise.all([
      supabase
        .from('Category')
        .select(`
          id, name, nameEn, nameFr, nameEs, nameHe,
          description, descriptionEn, descriptionFr, descriptionEs, descriptionHe,
          imageUrl, sortOrder, active,
          items:MenuItem(
            id, name, nameEn, nameFr, nameEs, nameHe,
            description, descriptionEn, descriptionFr, descriptionEs, descriptionHe,
            price, priceTakeaway, priceTakeawayRemote,
            imageUrl, available, sortOrder, categoryId,
            modifierGroups:ModifierGroup(
              id, name, nameEn, nameFr, nameEs, nameHe,
              required, multiSelect, minSelect, maxSelect, menuItemId,
              modifiers:Modifier(
                id, name, nameEn, nameFr, nameEs, nameHe,
                price, available, modifierGroupId, ingredientId
              )
            )
          )
        `)
        .eq('active', true)
        .order('sortOrder', { ascending: true }),

      supabase
        .from('Ingredient')
        .select('id')
        .eq('inStock', false)
    ])

    if (categoriesResult.error) throw categoriesResult.error

    const outOfStockIds = new Set((ingredientsResult.data || []).map(i => i.id))

    // Filtra
    const menu = (categoriesResult.data || []).map(category => ({
      ...category,
      items: (category.items || [])
        .filter((item: { available: boolean }) => item.available)
        .sort((a: { sortOrder: number }, b: { sortOrder: number }) => a.sortOrder - b.sortOrder)
        .map((item: { modifierGroups?: { modifiers?: { available: boolean; ingredientId?: string }[] }[] }) => ({
          ...item,
          modifierGroups: item.modifierGroups?.map(group => ({
            ...group,
            modifiers: group.modifiers?.filter(mod =>
              mod.available && (!mod.ingredientId || !outOfStockIds.has(mod.ingredientId))
            )
          }))
        }))
    }))

    return NextResponse.json(menu, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      }
    })

  } catch (error) {
    console.error('Menu API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch menu' },
      { status: 500 }
    )
  }
}

// ============================================================
// File: apps/web/src/lib/api.ts - Aggiorna getMenu
// ============================================================

/**
 * GET MENU - Da Next.js API Route con ISR
 * Prima chiamata: ~300ms, successive: ~20ms
 */
export async function getMenu(): Promise<Category[]> {
  // Usa URL relativo per chiamare la nostra API route
  const res = await fetch('/api/menu', {
    next: { revalidate: 60 } // ISR: rigenera ogni 60s
  })

  if (!res.ok) {
    throw new Error('Failed to fetch menu')
  }

  return res.json()
}


// ============================================================
// BONUS: Revalidazione on-demand quando admin modifica menu
// File: apps/web/src/app/api/revalidate-menu/route.ts
// ============================================================

import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

export async function POST(request: Request) {
  // Verifica secret per sicurezza
  const secret = request.headers.get('x-revalidate-secret')
  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 })
  }

  // Invalida la cache del menu
  revalidatePath('/api/menu')

  return NextResponse.json({ revalidated: true, now: Date.now() })
}

// Chiama questo endpoint dall'admin quando salvi modifiche:
// await fetch('/api/revalidate-menu', {
//   method: 'POST',
//   headers: { 'x-revalidate-secret': process.env.REVALIDATE_SECRET }
// })
