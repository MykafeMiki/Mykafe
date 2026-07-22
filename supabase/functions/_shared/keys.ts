/**
 * Chiave segreta per il client Supabase con privilegi pieni (bypassa le RLS).
 *
 * Contesto: la vecchia `service_role` era finita nella git history di un repo
 * pubblico. Le nuove secret key (`sb_secret_…`) non sono JWT, si revocano
 * singolarmente e non dipendono dal JWT secret del progetto.
 *
 * La piattaforma inietta SUPABASE_SECRET_KEYS come dizionario JSON:
 *   {"default":"sb_secret_…"}
 * Si legge da li'. Il fallback sulla legacy serve solo durante la migrazione,
 * finche' le vecchie chiavi non vengono disattivate: dopo, resta inerte.
 */
export function getSecretKey(): string {
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");

  if (raw) {
    try {
      const keys = JSON.parse(raw);
      if (keys?.default) return keys.default;
    } catch {
      // Dizionario malformato: si ricade sulla legacy invece di far cadere
      // la funzione, cosi' il servizio resta in piedi.
    }
  }

  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
}
