import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(Boolean)
    const subPath = pathParts.slice(2) // Remove 'functions' and 'upload'

    // POST /upload/items - Upload image for menu items
    // POST /upload/categories - Upload image for categories
    if (req.method === 'POST' && (subPath[0] === 'items' || subPath[0] === 'categories')) {
      const folder = subPath[0]

      const formData = await req.formData()
      const file = formData.get('image') as File | null

      if (!file) {
        return new Response(JSON.stringify({ error: 'No image file provided' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      if (!ALLOWED_TYPES.includes(file.type)) {
        return new Response(JSON.stringify({ error: 'Invalid file type. Only JPEG, PNG, GIF and WebP are allowed.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      if (file.size > MAX_SIZE) {
        return new Response(JSON.stringify({ error: 'File too large. Maximum size is 5MB.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Generate unique filename
      const ext = file.name.split('.').pop() || 'jpg'
      const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('menu-images')
        .upload(fileName, file, {
          contentType: file.type,
          upsert: false
        })

      if (error) throw error

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('menu-images')
        .getPublicUrl(data.path)

      return new Response(JSON.stringify({
        url: urlData.publicUrl,
        path: data.path
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // DELETE /upload - Delete image
    if (req.method === 'DELETE') {
      const body = await req.json()
      const { url: imageUrl } = body

      if (!imageUrl) {
        return new Response(JSON.stringify({ error: 'No URL provided' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Extract path from URL
      const urlObj = new URL(imageUrl)
      const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/menu-images\/(.+)/)

      if (!pathMatch) {
        return new Response(JSON.stringify({ error: 'Invalid image URL' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const filePath = pathMatch[1]

      const { error } = await supabase.storage
        .from('menu-images')
        .remove([filePath])

      if (error) throw error

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
