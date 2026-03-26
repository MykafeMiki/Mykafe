# MyKafe - Note di Setup

> **Aggiornato**: Marzo 2026

## Panoramica Progetto
Sistema di ordinazione digitale per ristoranti con:
- Menu interattivo via QR code
- Kitchen Display per la cucina
- Print-server per stampanti termiche (3 stampanti: Sushi, Panini, Caffetteria)
- Pannello Admin per gestione menu e cassa

## Struttura Progetto
```
MyKafe/
├── apps/
│   ├── web/           # Frontend Next.js 14 (porta 3000)
│   ├── api/           # Backend Express + Socket.io (porta 3001)
│   └── print-server/  # Server stampanti termiche (Node.js ESM)
├── packages/
│   └── shared/        # Tipi TypeScript e utility condivisi
│       └── src/
│           ├── index.ts    # Enum, interfacce
│           └── pricing.ts  # Logica pricing centralizzata
└── supabase/
    ├── functions/     # Edge Functions Deno (produzione)
    └── migrations/    # Migrazioni database
```

## Requisiti
- **Node.js** ≥ 20
- **pnpm** ≥ 9
- Account **Supabase** con progetto attivo
- Account **Vercel** collegato al repository

## Variabili d'Ambiente

### apps/api/.env
```
DATABASE_URL=postgresql://...
SUPABASE_URL=https://....supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service role key>
SUPABASE_ANON_KEY=<anon key>
ADMIN_PASSWORD=<password sicura>
JWT_SECRET=<segreto JWT lungo e casuale>
PORT=3001
CORS_ORIGIN=http://localhost:3000
```

### apps/web/.env.local
```
NEXT_PUBLIC_SUPABASE_URL=https://....supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
NEXT_PUBLIC_API_URL=https://....supabase.co/functions/v1
```

### apps/print-server/.env
```
API_URL=http://localhost:3001
RESTAURANT_NAME=MyKafe
PRINTER_SUSHI_IP=192.168.1.100
PRINTER_SUSHI_PORT=9100
PRINTER_PANINI_IP=192.168.1.101
PRINTER_PANINI_PORT=9100
PRINTER_CAFFETTERIA_IP=192.168.1.102
PRINTER_CAFFETTERIA_PORT=9100
SUSHI_CATEGORIES=Sushi,Sashimi,Roll,Nigiri
PANINI_CATEGORIES=Panini,Panino,Sandwich,Toast
CAFFETTERIA_CATEGORIES=Caffetteria,Bevande,Caffe,Drink,Bibite,Dolci,Dessert
```

> ⚠️ **NON committare mai file .env nel repository** – sono tutti in .gitignore

## Comandi Utili

### Avviare tutto in locale
```bash
pnpm dev
```

### Avviare solo frontend
```bash
pnpm dev:web
```

### Avviare solo backend
```bash
pnpm dev:api
```

### Build di produzione
```bash
pnpm build
```

### Gestione Database (via Prisma)
```bash
pnpm db:push      # Applica schema al database
pnpm db:studio    # Apre interfaccia grafica database
```

### Supabase Edge Functions (deploy)
```bash
supabase functions deploy menu
supabase functions deploy orders
# ... etc.
```

### Segreti Supabase (credenziali per le edge functions)
```bash
supabase secrets set JWT_SECRET=<valore>
supabase secrets set ADMIN_PASSWORD=<valore>
```

## URL Locali
| Pagina | URL |
|--------|-----|
| Homepage | http://localhost:3000 |
| Menu Tavolo 1 | http://localhost:3000/menu/tavolo-1 |
| Kitchen Display | http://localhost:3000/kitchen |
| Cassa | http://localhost:3000/cassa |
| Admin | http://localhost:3000/admin |
| Banco | http://localhost:3000/banco |
| Ordini online | http://localhost:3000/ordina |
| API Health | http://localhost:3001/api/health |

## Stack Tecnologico
- **Frontend**: Next.js 14, React 18, Tailwind CSS, Zustand, next-intl
- **Backend**: Express.js, Socket.io, Prisma ORM
- **Database**: PostgreSQL (Supabase)
- **Edge Functions**: Deno (Supabase Functions)
- **Deployment**: Vercel (web) + Supabase (DB + Functions)
- **Linguaggio**: TypeScript 5.4

## Flusso Ordini
1. Cliente scansiona QR code del tavolo → si apre menu con identificazione tavolo
2. Cliente seleziona piatti e modificatori, sceglie metodo di pagamento
3. Conferma ordine → ordine appare in tempo reale su Kitchen Display
4. Cucina aggiorna stato: `PENDING` → `PREPARING` → `READY` → `SERVED`
5. Il print-server stampa automaticamente i comandi sulle stampanti di settore
6. Cassa marca l'ordine come pagato (`isPaid = true`)

## Status Ordini Validi
`PENDING` | `PREPARING` | `READY` | `SERVED` | `CANCELLED`

> ⚠️ Non usare `COMPLETED` o `PAID` — non esistono nell'enum `OrderStatus`

## Note Architetturali
- La logica di **pricing** (sovrapprezzo carta +3%) è centralizzata in `packages/shared/src/pricing.ts` — non duplicarla
- Il **print-server** usa TCP raw (non la libreria `escpos`) — i file `printer.ts`, `receipt.ts`, `types.ts` sono legacy e non inclusi nel build TypeScript
- Le **edge functions** gestiscono la propria autenticazione admin via `_shared/validation.ts` (`verifyAdminToken`)
