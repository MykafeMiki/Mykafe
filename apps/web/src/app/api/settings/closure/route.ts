import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://biefwzrprjqusjynqwus.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('AppSettings')
      .select('value')
      .eq('key', 'closure_config')
      .single()

    if (error) throw error

    return NextResponse.json(data.value)
  } catch (error) {
    console.error('Error fetching closure config:', error)
    return NextResponse.json({ error: 'Failed to fetch closure config' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    const { error } = await supabase
      .from('AppSettings')
      .upsert({
        key: 'closure_config',
        value: body,
        updatedAt: new Date().toISOString()
      })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving closure config:', error)
    return NextResponse.json({ error: 'Failed to save closure config' }, { status: 500 })
  }
}
