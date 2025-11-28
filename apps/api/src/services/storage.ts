import { createClient, SupabaseClient } from '@supabase/supabase-js'

const BUCKET_NAME = 'menu-images'

let supabase: SupabaseClient | null = null

function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.')
    }

    supabase = createClient(supabaseUrl, supabaseServiceKey)
  }
  return supabase
}

export interface UploadResult {
  url: string
  path: string
}

/**
 * Upload an image to Supabase Storage
 * @param file - The file buffer
 * @param fileName - Original file name
 * @param folder - Folder path (e.g., 'categories', 'items')
 */
export async function uploadImage(
  file: Buffer,
  fileName: string,
  folder: string
): Promise<UploadResult> {
  // Generate unique file name
  const timestamp = Date.now()
  const cleanName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
  const path = `${folder}/${timestamp}_${cleanName}`

  const client = getSupabaseClient()

  const { data, error } = await client.storage
    .from(BUCKET_NAME)
    .upload(path, file, {
      contentType: getContentType(fileName),
      upsert: false,
    })

  if (error) {
    console.error('Supabase upload error:', error)
    throw new Error(`Failed to upload image: ${error.message}`)
  }

  // Get public URL
  const { data: urlData } = client.storage
    .from(BUCKET_NAME)
    .getPublicUrl(path)

  return {
    url: urlData.publicUrl,
    path: data.path,
  }
}

/**
 * Delete an image from Supabase Storage
 * @param path - The file path in the bucket
 */
export async function deleteImage(path: string): Promise<void> {
  const client = getSupabaseClient()

  const { error } = await client.storage
    .from(BUCKET_NAME)
    .remove([path])

  if (error) {
    console.error('Supabase delete error:', error)
    throw new Error(`Failed to delete image: ${error.message}`)
  }
}

/**
 * Get content type from file extension
 */
function getContentType(fileName: string): string {
  const ext = fileName.toLowerCase().split('.').pop()
  const types: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
  }
  return types[ext || ''] || 'application/octet-stream'
}

/**
 * Extract path from public URL for deletion
 */
export function extractPathFromUrl(url: string): string | null {
  try {
    const bucketPath = `/storage/v1/object/public/${BUCKET_NAME}/`
    const index = url.indexOf(bucketPath)
    if (index === -1) return null
    return url.substring(index + bucketPath.length)
  } catch {
    return null
  }
}
