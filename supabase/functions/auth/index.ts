import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import * as jose from "https://deno.land/x/jose@v5.2.0/index.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

const JWT_SECRET = Deno.env.get('JWT_SECRET') || 'mykafe-secret-key-change-in-production'
const ADMIN_PASSWORD = Deno.env.get('ADMIN_PASSWORD') || 'Mykafe2010!'

async function generateToken(): Promise<string> {
  const secret = new TextEncoder().encode(JWT_SECRET)
  const jwt = await new jose.SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret)
  return jwt
}

async function verifyToken(token: string): Promise<boolean> {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET)
    await jose.jwtVerify(token, secret)
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
