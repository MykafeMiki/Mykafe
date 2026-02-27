import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://biefwzrprjqusjynqwus.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )
}

export async function GET() {
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('AppSettings')
      .select('value')
      .eq('key', 'ingredient_substitutes')
      .single()

    if (error) {
      if (error.code === 'PGRST116') return NextResponse.json({})
      throw error
    }

    return NextResponse.json(data?.value || {})
  } catch (error) {
    console.error('Error fetching substitutes:', error)
    return NextResponse.json({ error: 'Failed to fetch substitutes' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = getSupabase()
    const body = await request.json()

    const { error } = await supabase
      .from('AppSettings')
      .upsert({
        key: 'ingredient_substitutes',
        value: body,
        updatedAt: new Date().toISOString()
      })

    if (error) throw error

    console.log('[SUBSTITUTE] Saved substitutes, now re-enabling menu items...')
    console.log('[SUBSTITUTE] Body:', JSON.stringify(body))

    // Quando salvi un sostituto, riabilita i MenuItem che erano stati disabilitati
    // Itera su ogni ingrediente che ha ora un sostituto
    for (const [ingredientId, substituteData] of Object.entries(body)) {
      console.log(`[SUBSTITUTE] Processing ingredient ${ingredientId}, substituteData:`, substituteData)

      if (substituteData) {
        // Trova tutti i MenuItem dove questo ingrediente è PRIMARY
        const { data: primaryItems, error: queryError } = await supabase
          .from('MenuItemIngredient')
          .select('menuItemId')
          .eq('ingredientId', ingredientId)
          .eq('isPrimary', true)

        if (queryError) {
          console.error(`[SUBSTITUTE] Error querying primary items for ${ingredientId}:`, queryError)
          continue
        }

        console.log(`[SUBSTITUTE] Found ${primaryItems?.length || 0} primary menu items for ingredient ${ingredientId}`)

        if (primaryItems && primaryItems.length > 0) {
          const menuItemIds = primaryItems.map((item: { menuItemId: string }) => item.menuItemId)
          console.log(`[SUBSTITUTE] Enabling menu items:`, menuItemIds)

          // Riabilita i MenuItem (perché adesso hanno un sostituto)
          const { error: updateError, data: updateData } = await supabase
            .from('MenuItem')
            .update({ available: true })
            .in('id', menuItemIds)
            .select()

          if (updateError) {
            console.error(`[SUBSTITUTE] Error enabling menu items:`, updateError)
          } else {
            console.log(`[SUBSTITUTE] Successfully re-enabled ${updateData?.length || 0} menu items for ingredient ${ingredientId}`)
          }
        }
      }
    }

    console.log('[SUBSTITUTE] Re-enable operation complete')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving substitutes:', error)
    return NextResponse.json({ error: 'Failed to save substitutes' }, { status: 500 })
  }
}
