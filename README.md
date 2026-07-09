# MyKafe

Sistema di ordinazione digitale per ristoranti: menu via QR code, ordini in tempo reale, display cucina, cassa e stampa comande.

## Architettura

```
MyKafe/
├── apps/
│   ├── web/            # Frontend Next.js (Vercel) — porta 3000 in locale
│   └── print-server/   # Server di stampa termica (Supabase Realtime → ESC/POS via rete)
├── packages/
│   ├── shared/         # Tipi TypeScript e utility condivise (@shared/types)
│   └── db/             # Schema Prisma (riferimento modello dati, seed, Studio)
├── supabase/
│   ├── functions/      # Edge Functions (backend API: menu, orders, tables, cassa, ...)
│   └── migrations/     # Migrazioni SQL del database
└── docs/
    ├── assets/         # PDF dei menu, immagini di lavoro
    └── archive/        # Patch già applicate e SQL una-tantum già eseguiti
```

- **Backend**: Supabase Edge Functions (Deno) + PostgreSQL con RLS.
- **Realtime**: Supabase Realtime (`postgres_changes` sulla tabella `Order`) per kitchen display e print server.
- **Frontend**: Next.js, Tailwind CSS, Zustand, next-intl (it, en, es, fr, he).

## Pagine principali

| Pagina | URL | Uso |
| --- | --- | --- |
| Menu tavolo | `/menu/tavolo-{1..15}` | Cliente al tavolo (QR code) |
| Takeaway | `/ordina` | Ordini online per ritiro |
| Kitchen display | `/kitchen` | Cucina: stati ordine |
| Banco | `/banco` | Ordini al banco |
| Cassa | `/cassa` | Pagamenti e chiusura tavoli |
| Admin | `/admin` | Gestione menu, ingredienti, orari, tavoli, QR |

## Setup locale

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local   # compila con i valori del progetto Supabase
pnpm dev                                        # avvia il frontend su :3000
```

Variabili richieste in `apps/web/.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
NEXT_PUBLIC_API_URL=https://<project-ref>.supabase.co/functions/v1
```

**Non committare mai chiavi o password**: tutti i file `.env*` sono in `.gitignore`.

## Print server (comande in cucina)

Ascolta gli ordini via Supabase Realtime e stampa 3 scontrini separati (SUSHI / PANINI / CAFFETTERIA) su stampanti termiche di rete (porta 9100).

```bash
cd apps/print-server
cp .env.example .env      # SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, IP stampanti
pnpm dev                  # oppure: pnpm build && pnpm start
node test-print.mjs <IP>  # test rapido di una stampante
```

## Database e backend

```bash
supabase db push           # applica le migrazioni al DB remoto
supabase functions deploy  # deploy di tutte le Edge Functions
```

Lo schema Prisma in `packages/db` è il riferimento del modello dati (`pnpm db:studio` per esplorare il DB); le modifiche allo schema vanno fatte con migrazioni SQL in `supabase/migrations`.

## Deploy frontend

Il deploy su Vercel parte dalla root del repo (vedi `vercel.json`): build `pnpm --filter web build`, output `apps/web/.next`, dominio `mykafe-app.vercel.app`.

## Comandi utili

| Comando | Descrizione |
| --- | --- |
| `pnpm dev` | Frontend in sviluppo |
| `pnpm build` | Build di produzione del frontend |
| `pnpm dev:print` / `pnpm build:print` | Print server |
| `pnpm lint` / `pnpm format` | Lint e formattazione |
| `pnpm db:studio` | Prisma Studio sul DB |
