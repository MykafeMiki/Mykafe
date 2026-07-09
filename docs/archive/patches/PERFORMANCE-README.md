# Patch Performance Menu - MyKafe

## Problema
Il menu è lento a caricarsi per via di:
1. Query SQL con 5 livelli di join nested
2. Processing O(items × ingredients) per description matching
3. Chiamate API sequenziali nel frontend
4. Nessun caching effettivo

## Soluzioni

| # | File | Ottimizzazione | Impatto |
|---|------|----------------|---------|
| 07 | `menu/index.ts` | Query parallele, cache in-memory, no description matching | 🔴 Alto |
| 08 | `*.sql` | Indici database ottimizzati | 🔴 Alto |
| 09 | `api.ts` | Frontend caching con SWR pattern | 🟡 Medio |
| 10 | `MenuSkeleton.tsx` | Skeleton loader per UX percepita | 🟢 Basso |
| 11 | `page.tsx` | Chiamate API parallele | 🟡 Medio |

---

## Come applicare

### 1. Indici Database (FARE PRIMA)

```bash
# Esegui nel Supabase SQL Editor o via psql
psql $DATABASE_URL -f 08-database-indexes.sql
```

### 2. Ottimizzazione Backend

Sostituisci `supabase/functions/menu/index.ts` con il codice in `07-optimize-menu-query.ts`.

**Cambiamenti chiave:**
- Query parallele invece di nested joins
- Cache in-memory per ingredienti out-of-stock (5 min TTL)
- **RIMOSSO** il description matching (troppo costoso)
- ETag basato su timestamp (no SHA-256)
- Cache-Control: 5 min + stale-while-revalidate 30 min

### 3. Frontend Caching

Aggiungi le funzioni da `09-frontend-caching.ts` a `apps/web/src/lib/api.ts`.

Poi sostituisci le chiamate:
```typescript
// Prima
const menuData = await getMenu()

// Dopo
const menuData = await getMenuCached()
```

### 4. Skeleton Loader

Crea il file `apps/web/src/components/menu/MenuSkeleton.tsx` con il contenuto di `10-menu-skeleton.tsx`.

Usalo nella pagina:
```tsx
if (loading) {
  return <MenuSkeleton />
}
```

### 5. Chiamate Parallele

Applica le modifiche da `11-parallel-loading.tsx` alla pagina menu.

---

## Impatto stimato

| Metrica | Prima | Dopo | Miglioramento |
|---------|-------|------|---------------|
| Query time (DB) | ~500ms | ~150ms | 70% |
| Cold load | ~1.5s | ~400ms | 73% |
| Warm load (cache) | ~1.5s | ~50ms | 97% |
| UX percepita | Blank screen | Skeleton | ✅ |

---

## Note importanti

### Description matching rimosso
Il codice originale cercava ingredienti nelle descrizioni con varianti singolare/plurale italiano. Questo era **molto costoso** (O(items × ingredients × variants)).

La nuova versione usa **solo** le associazioni esplicite in `MenuItemIngredient`. Se hai bisogno del matching automatico, dovrai:
1. Eseguirlo come job batch offline
2. Salvare i risultati in `MenuItemIngredient`

### Cache invalidation
Quando modifichi il menu dall'admin, chiama:
```typescript
import { clearMenuCache } from '@/lib/api'
clearMenuCache()
```

### Monitoring
Aggiungi logging per monitorare:
```typescript
console.time('menu-query')
const result = await supabase.from('Category').select(...)
console.timeEnd('menu-query')
```
