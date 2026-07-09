# Velocizzare il Caricamento Menu

Il problema è che le Edge Functions di Supabase hanno cold start di 200-500ms.
Ecco 3 soluzioni, dalla più semplice alla più veloce:

## Confronto

| Soluzione | Latenza | Freschezza | Complessità | File |
|-----------|---------|------------|-------------|------|
| Query diretta Supabase | ~100ms | Real-time | ⭐ Bassa | `13-direct-supabase-query.ts` |
| Next.js ISR | ~20-50ms* | 60 secondi | ⭐⭐ Media | `15-nextjs-isr-menu.ts` |
| Menu statico | ~20ms | Manuale | ⭐⭐⭐ Alta | `14-static-menu-generation.ts` |

*Prima richiesta ~300ms, successive ~20ms

---

## Opzione 1: Query Diretta (Consigliata)

**Cosa fa:** Bypassa le Edge Functions, chiama Supabase direttamente dal browser.

**Pro:**
- Semplice da implementare
- Dati sempre freschi
- Nessuna infrastruttura aggiuntiva

**Contro:**
- Ancora ~100ms di latenza

**Come implementare:**
1. Installa `@supabase/supabase-js` nel frontend (già presente probabilmente)
2. Sostituisci `getMenu()` con il codice in `13-direct-supabase-query.ts`

```typescript
// Prima
const menu = await getMenu() // → Edge Function → 400ms

// Dopo
const menu = await getMenuFast() // → Supabase diretto → 100ms
```

---

## Opzione 2: Next.js ISR (Miglior Compromesso)

**Cosa fa:** Next.js cacha il menu lato server e lo rigenera ogni 60 secondi.

**Pro:**
- Velocissimo dopo prima richiesta (~20ms)
- Si aggiorna automaticamente
- Nessun webhook necessario

**Contro:**
- Ritardo fino a 60 secondi per modifiche
- Richiede Next.js App Router

**Come implementare:**
1. Crea `apps/web/src/app/api/menu/route.ts` con il codice in `15-nextjs-isr-menu.ts`
2. Aggiorna `getMenu()` per chiamare `/api/menu`

**Bonus:** Aggiungi revalidazione on-demand per aggiornamenti immediati dall'admin.

---

## Opzione 3: Menu Statico (Massima Velocità)

**Cosa fa:** Genera un file `menu.json` statico servito da CDN.

**Pro:**
- Velocità massima (~20ms sempre)
- Zero carico sul database
- Funziona anche se Supabase è down

**Contro:**
- Devi rigenerare manualmente o con webhook
- Più complesso da configurare

**Come implementare:**
1. Crea lo script `scripts/generate-menu.ts`
2. Eseguilo con `npx ts-node scripts/generate-menu.ts`
3. Il file viene salvato in `public/menu.json`
4. Configura un webhook per rigenerare quando cambia il menu

---

## Raccomandazione

Per il tuo caso (ristorante, menu cambia raramente ma ingredienti possono esaurirsi):

1. **Inizia con Opzione 1** (query diretta) - 5 minuti di lavoro, -75% latenza
2. **Se serve più velocità**, passa a Opzione 2 (ISR) con revalidazione on-demand
3. **Opzione 3** solo se hai esigenze estreme di performance

---

## Quick Start: Opzione 1

```typescript
// apps/web/src/lib/api.ts

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function getMenu(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('Category')
    .select(`
      *, 
      items:MenuItem(*, modifierGroups:ModifierGroup(*, modifiers:Modifier(*)))
    `)
    .eq('active', true)
    .order('sortOrder')

  if (error) throw error
  
  // ... filtra available items/modifiers ...
  
  return data
}
```

Fatto! Da ~400ms a ~100ms con 10 righe di codice.
