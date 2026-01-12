import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts"

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
