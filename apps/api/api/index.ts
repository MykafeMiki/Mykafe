import type { VercelRequest, VercelResponse } from '@vercel/node'

export default function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  return res.status(200).json({
    name: 'MyKafe API',
    status: 'ok',
    version: '2.0',
    message: 'API migrata a Supabase Edge Functions',
    endpoints: {
      menu: 'https://biefwzrprjqusjynqwus.supabase.co/functions/v1/menu',
      orders: 'https://biefwzrprjqusjynqwus.supabase.co/functions/v1/orders',
      tables: 'https://biefwzrprjqusjynqwus.supabase.co/functions/v1/tables',
      auth: 'https://biefwzrprjqusjynqwus.supabase.co/functions/v1/auth',
      party: 'https://biefwzrprjqusjynqwus.supabase.co/functions/v1/party',
      ingredients: 'https://biefwzrprjqusjynqwus.supabase.co/functions/v1/ingredients',
    },
    documentation: 'Usa gli endpoint Supabase Edge Functions sopra elencati',
  })
}
