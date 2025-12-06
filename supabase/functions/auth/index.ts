import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

const JWT_SECRET = Deno.env.get('JWT_SECRET') || 'mykafe-secret-key-change-in-production'
const ADMIN_PASSWORD = Deno.env.get('ADMIN_PASSWORD') || 'Mykafe2010!'

// Base64URL encode
function base64UrlEncode(str: string): string {
  const base64 = btoa(str)
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

// Base64URL decode
function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  while (base64.length % 4) {
    base64 += '='
  }
  return atob(base64)
}

async function generateToken(): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    role: 'admin',
    iat: now,
    exp: now + 86400 // 24 hours
  }

  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  const message = `${encodedHeader}.${encodedPayload}`

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(JWT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message))
  const signatureArray = new Uint8Array(signature)
  const signatureStr = String.fromCharCode(...signatureArray)
  const encodedSignature = base64UrlEncode(signatureStr)

  return `${message}.${encodedSignature}`
}

async function verifyToken(token: string): Promise<boolean> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return false

    const [encodedHeader, encodedPayload, encodedSignature] = parts
    const message = `${encodedHeader}.${encodedPayload}`

    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(JWT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )

    const signatureStr = base64UrlDecode(encodedSignature)
    const signatureArray = new Uint8Array(signatureStr.length)
    for (let i = 0; i < signatureStr.length; i++) {
      signatureArray[i] = signatureStr.charCodeAt(i)
    }

    const isValid = await crypto.subtle.verify('HMAC', key, signatureArray, encoder.encode(message))
    if (!isValid) return false

    // Check expiration
    const payload = JSON.parse(base64UrlDecode(encodedPayload))
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp && payload.exp < now) return false

    return true
  } catch {
    return false
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(Boolean)
    // Path: /functions/v1/auth/... -> find 'auth' and take everything after
    const authIndex = pathParts.indexOf('auth')
    const subPath = authIndex >= 0 ? pathParts.slice(authIndex + 1) : []

    // POST /auth/login - Login admin
    if (req.method === 'POST' && subPath[0] === 'login') {
      const body = await req.json()
      const { password } = body

      if (!password) {
        return new Response(JSON.stringify({ error: 'Password richiesta' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      if (password !== ADMIN_PASSWORD) {
        return new Response(JSON.stringify({ error: 'Password non valida' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const token = await generateToken()
      return new Response(JSON.stringify({ token }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // GET /auth/verify - Verify token
    if (req.method === 'GET' && subPath[0] === 'verify') {
      const authHeader = req.headers.get('authorization')
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ valid: false, error: 'No token provided' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const token = authHeader.substring(7)
      const isValid = await verifyToken(token)

      if (!isValid) {
        return new Response(JSON.stringify({ valid: false, error: 'Invalid token' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      return new Response(JSON.stringify({ valid: true }), {
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
