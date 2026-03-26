import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts"

// ---------------------------------------------------------------------------
// Admin token verification (shared across all edge functions)
// ---------------------------------------------------------------------------
export async function verifyAdminToken(req: Request): Promise<boolean> {
  const JWT_SECRET = Deno.env.get('JWT_SECRET')
  if (!JWT_SECRET) return false

  const authHeader = req.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false

  const token = authHeader.substring(7)
  const parts = token.split('.')
  if (parts.length !== 3) return false

  try {
    const [encodedHeader, encodedPayload, encodedSignature] = parts
    const message = `${encodedHeader}.${encodedPayload}`

    const base64UrlDecode = (str: string): string => {
      let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
      while (base64.length % 4) base64 += '='
      return atob(base64)
    }

    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(JWT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    )
    const signatureStr = base64UrlDecode(encodedSignature)
    const signatureArray = new Uint8Array(signatureStr.length)
    for (let i = 0; i < signatureStr.length; i++) signatureArray[i] = signatureStr.charCodeAt(i)

    const isValid = await crypto.subtle.verify('HMAC', key, signatureArray, encoder.encode(message))
    if (!isValid) return false

    const payload = JSON.parse(base64UrlDecode(encodedPayload))
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp && payload.exp < now) return false
    if (payload.role !== 'admin') return false

    return true
  } catch {
    return false
  }
}

export function unauthorizedResponse(corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ error: 'Autenticazione richiesta' }),
    { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// Order item schema
export const OrderItemSchema = z.object({
  menuItemId: z.string().min(1, "Menu item ID required"),
  quantity: z.number().int().positive("Quantity must be positive"),
  notes: z.string().max(500).optional(),
  modifierIds: z.array(z.string()).optional(),
  consumeMode: z.enum(['DINE_IN', 'TAKEAWAY']).optional()
})

// Create order schema
export const CreateOrderSchema = z.object({
  tableId: z.string().min(1, "Table ID required"),
  items: z.array(OrderItemSchema).min(1, "At least one item required"),
  notes: z.string().max(1000).optional(),
  orderType: z.enum(['DINE_IN', 'TAKEAWAY', 'COUNTER']).optional(),
  paymentMethod: z.enum(['CASH', 'CARD']).optional(),
  customerName: z.string().max(100).optional(),
  customerPhone: z.string().max(20).optional(),
  partyCode: z.string().max(10).optional(),
  tableSessionId: z.string().optional()
})

// Update order status schema
export const UpdateOrderStatusSchema = z.object({
  status: z.enum(['PENDING', 'PREPARING', 'READY', 'SERVED', 'CANCELLED'])
})

// Payment schema
export const PaymentSchema = z.object({
  paymentMethod: z.enum(['CASH', 'CARD']).optional()
})

// Table status schema
export const TableStatusSchema = z.object({
  status: z.enum(['AVAILABLE', 'OCCUPIED', 'RESERVED'])
})

// Menu item schema
export const MenuItemSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  price: z.number().nonnegative(),
  categoryId: z.string().min(1),
  available: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  imageUrl: z.string().url().optional().nullable()
})

// Category schema
export const CategorySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  imageUrl: z.string().url().optional().nullable()
})

// Helper to validate and return errors
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  const errorMessages = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
  return { success: false, error: errorMessages }
}
