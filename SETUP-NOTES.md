# MyKafe - Note di Setup

## Panoramica Progetto
Sistema di ordinazione digitale per ristoranti con:
- Menu interattivo via QR code
- Kitchen Display per la cucina
- Pannello Admin per gestione menu

## Struttura Progetto
```
MyKafe/
├── apps/
│   ├── web/          # Frontend Next.js (porta 3000)
│   └── api/          # Backend Express + Socket.io (porta 3001)
├── packages/
│   └── shared/       # Tipi TypeScript condivisi
└── menu-ita.pdf      # Menu originale MyKafe
```

## Comandi Utili

### Avviare l'app in locale
```bash
cd C:\Users\dario\OneDrive\Desktop\MyKafe
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

### Gestione Database
```bash
pnpm db:push      # Applica schema al database
pnpm db:studio    # Apre interfaccia grafica database
```

### Seed database (popola con menu)
```bash
cd apps/api
npx tsx prisma/seed.ts
```

## URL Locali
| Pagina | URL |
|--------|-----|
| Homepage | http://localhost:3000 |
| Menu Tavolo 1 | http://localhost:3000/menu/tavolo-1 |
| Menu Tavolo 2 | http://localhost:3000/menu/tavolo-2 |
| ... | ... (fino a tavolo-15) |
| Kitchen Display | http://localhost:3000/kitchen |
| Admin | http://localhost:3000/admin |
| API Health | http://localhost:3001/api/health |

## Menu Importato
Categorie:
1. Toast (17 varianti, €8.90 - €10.90)
2. Salad (5 varianti, €9.50 - €11.90)
3. Piadina (5 varianti, €9.90)
4. Affumicato (€13.50)
5. Caprese (2 varianti, €10.90)
6. Bruschetta (2 varianti, €7.00 - €8.00)
7. Pizza e Focaccia (€4.90)
8. Bevande (7 items, €1.50 - €4.50)
9. Caffetteria (8 items, €3.00 - €9.00)

Tutti con modificatori extra (+mozzarella, +avocado, +tonno, etc.)

## Prossimi Passi per Deploy

### 1. Creare account Supabase
- URL: https://supabase.com
- Email: Michael@mykafe.it
- Creare progetto "mykafe"
- Region: Central EU (Frankfurt)
- Copiare Connection String da: Project Settings → Database

### 2. Creare account GitHub
- URL: https://github.com
- Email: Michael@mykafe.it
- Creare repository "mykafe"

### 3. Creare account Vercel
- URL: https://vercel.com
- Registrarsi con GitHub
- Collegare repository mykafe

### 4. Configurazione necessaria
Dopo aver creato Supabase, fornire:
- DATABASE_URL (connection string PostgreSQL)
- SUPABASE_URL
- SUPABASE_ANON_KEY

## Stack Tecnologico
- **Frontend**: Next.js 14, React 18, Tailwind CSS
- **Backend**: Express.js, Socket.io
- **Database**: SQLite (locale) → PostgreSQL/Supabase (produzione)
- **ORM**: Prisma
- **State Management**: Zustand
- **Linguaggio**: TypeScript

## Configurazione Tavoli
- 15 tavoli configurati
- Tavoli 1-5: 2 posti
- Tavoli 6-10: 4 posti
- Tavoli 11-15: 6 posti
- QR Code format: `tavolo-{numero}`

## Flusso Ordini
1. Cliente scansiona QR code del tavolo
2. Si apre menu con identificazione tavolo
3. Cliente seleziona piatti e modificatori
4. Conferma ordine
5. Ordine appare in tempo reale su Kitchen Display
6. Cucina aggiorna stato: In attesa → In preparazione → Pronto → Servito

---
Data creazione: 25 Novembre 2024
