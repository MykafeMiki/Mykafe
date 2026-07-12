# Runbook — Rotazione chiavi Supabase (post-incident)

Obiettivo: **invalidare la `service_role` legacy trapelata nella git history** migrando al
nuovo sistema di chiavi Supabase (publishable + secret). Progettata da Supabase per essere
**a downtime zero e reversibile** fino al passo di revoca finale.

> Farla quando l'incidente Supabase è chiuso e il locale è fuori servizio.
> Nessuna modifica al codice è necessaria: è solo uno swap di valori negli env.
> Il `JWT_SECRET` del login admin è un secret **separato** e NON va toccato.

## Dove sono usate le chiavi (tutti i punti da aggiornare)

| Dove | Variabile | Valore nuovo |
|---|---|---|
| Vercel (frontend) | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **publishable** key (`sb_publishable_…`) |
| Vercel (route /api/settings/*) | `SUPABASE_SERVICE_ROLE_KEY` | **secret** key (`sb_secret_…`) |
| Edge Functions (Supabase secrets) | `SUPABASE_SERVICE_ROLE_KEY` | **secret** key (`sb_secret_…`) |
| print-server `.env` (on-prem) | `SUPABASE_SERVICE_ROLE_KEY` | **secret** key (`sb_secret_…`) |

## Procedura (in quest'ordine = zero downtime)

1. **Dashboard → JWT Keys → JWT Signing Keys → "Migrate JWT secret"**
   Importa il secret legacy nel nuovo sistema e crea una standby key. Nessun effetto sul traffico.

2. **Dashboard → API Keys**: crea una **publishable key** e una **secret key**.
   (La secret key è mostrata una sola volta: salvala nel password manager.)

3. **Roll-out delle nuove chiavi** (le vecchie restano valide in parallelo, niente disservizio):
   - **Vercel** (io posso fare publishable+redeploy; la secret la imposti tu):
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = publishable key
     - `SUPABASE_SERVICE_ROLE_KEY` = secret key
     - redeploy (`vercel deploy --prod`) — necessario perché la anon è "baked" nel build
   - **Edge Functions**: `supabase secrets set SUPABASE_SERVICE_ROLE_KEY=sb_secret_… --project-ref biefwzrprjqusjynqwus`
     poi `supabase functions deploy` (le funzioni modificate o tutte)
   - **print-server**: aggiorna `apps/print-server/.env` e riavvia il processo
4. **Verifica "Last used"** sulle chiavi legacy in API Keys: deve fermarsi (nessun traffico residuo).
5. **Dashboard → JWT Signing Keys → "Rotate keys"** (firma i nuovi JWT con la standby key; anon/service_role esistenti restano valide).
6. **Revoke del Legacy JWT secret** → **da qui la `service_role` trapelata è morta.**

## Verifica finale
- Sito `mykafe-app.vercel.app` carica (200), menu pubblico OK.
- `/cassa` e `/reports` funzionano (login admin + operazioni).
- La vecchia service_role (dalla history) su `…/rest/v1/Order` deve dare 401.
- Print-server riceve gli ordini e stampa.

## Note
- Passi 1, 2, 5, 6 e l'inserimento dei valori **segreti** li esegui tu (impostazioni di sicurezza / credenziali).
- Io posso: aggiornare la publishable key (pubblica) su Vercel, i redeploy, il deploy delle edge function, la verifica.
- La password del database è già stata resettata (2026-07-09) — quella era la credenziale in chiaro nella history.
