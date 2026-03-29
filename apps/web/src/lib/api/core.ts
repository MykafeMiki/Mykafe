import { createClient } from '@supabase/supabase-js'

// Normalize known env var typo: supabase.con → supabase.co
function fixSupabaseUrl(url: string): string {
  return url.replace('supabase.con', 'supabase.co')
}

export const API_URL = fixSupabaseUrl(process.env.NEXT_PUBLIC_API_URL || 'https://biefwzrprjqusjynqwus.supabase.co/functions/v1')
const SUPABASE_URL = fixSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://biefwzrprjqusjynqwus.supabase.co')
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpZWZ3enJwcmpxdXNqeW5xd3VzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxMDgzMTgsImV4cCI6MjA3OTY4NDMxOH0.CfLbUJa3znC9zNYXdYa0zrFzZM4ASvgw9Ousq27ZqCw'

// Client Supabase per query dirette (bypassa Edge Functions = ~100ms invece di ~400ms)
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Token management
let authToken: string | null = null

export function setAuthToken(token: string | null) {
  authToken = token
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('admin_token', token)
    } else {
      localStorage.removeItem('admin_token')
    }
  }
}

export function getAuthToken(): string | null {
  if (authToken) return authToken
  if (typeof window !== 'undefined') {
    authToken = localStorage.getItem('admin_token')
  }
  return authToken
}

export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      ...options?.headers,
    },
  })

  if (!res.ok) {
    const errorBody = await res.text()
    console.error('API Error Response:', errorBody)
    throw new Error(`API Error: ${res.status} - ${errorBody}`)
  }

  return res.json()
}

export async function fetchApiAuth<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = getAuthToken()
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token || SUPABASE_ANON_KEY}`,
      ...options?.headers,
    },
  })

  if (!res.ok) {
    if (res.status === 401) {
      setAuthToken(null)
    }
    throw new Error(`API Error: ${res.status}`)
  }

  return res.json()
}
