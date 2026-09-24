/**
 * Verifica del token admin per le route API di Next.
 *
 * Il token dello staff non e' un token Supabase: e' un JWT HS256 firmato dalla
 * edge function `auth` con payload { role: "admin" }. Passarlo a
 * `supabase.auth.getUser()` lo rifiuta sempre, perche' quella si aspetta un
 * utente GoTrue.
 *
 * Invece di riscrivere qui la verifica HMAC (servirebbe JWT_SECRET anche su
 * Vercel, con il rischio che le due copie divergano) si delega alla stessa
 * funzione che il token lo ha emesso: GET /auth/verify.
 */

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "").replace("supabase.con", "supabase.co");

export async function isAdminRequest(request: Request): Promise<boolean> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  if (!API_URL) {
    console.error("NEXT_PUBLIC_API_URL non configurato: impossibile verificare il token admin");
    return false;
  }

  try {
    const res = await fetch(`${API_URL}/auth/verify`, {
      headers: { Authorization: authHeader },
      cache: "no-store",
    });
    if (!res.ok) return false;
    const body = (await res.json()) as { valid?: boolean };
    return body.valid === true;
  } catch (error) {
    console.error("Verifica token admin fallita:", error);
    return false;
  }
}
