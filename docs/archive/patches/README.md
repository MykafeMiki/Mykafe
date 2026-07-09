# Patch per la gestione tavoli - MyKafe

Queste patch risolvono i problemi identificati nella logica dei tavoli.

## Riepilogo Fix

| # | File | Problema | Soluzione |
|---|------|----------|-----------|
| 01 | `tables.ts` | Race condition su isHost | Transaction serializable |
| 02 | `table-sessions/index.ts` | Nessuna validazione tavoli | Validazione completa server-side |
| 03 | `cleanup-stale/index.ts` | Nessun cleanup automatico | Cron job ogni ora |
| 04 | `orders/index.ts` | Bypass blocco client-side | Validazione server-side |
| 05 | `*.sql` | PartySession deprecated ma attivo | Migration di deprecazione |
| 06 | `config.toml` | Manca config cron | Configurazione schedule |

---

## Come applicare le patch

### 1. Fix Race Condition (01)

Modifica `apps/api/src/routes/tables.ts`:
- Sostituisci il blocco `router.post('/:id/customers', ...)` con il codice in `01-fix-race-condition-tables.ts`

### 2. Validazione Table Sessions (02)

Modifica `supabase/functions/table-sessions/index.ts`:
- Sostituisci il blocco `if (req.method === 'POST' && subPath.length === 0)` con il codice in `02-validate-table-sessions.ts`

### 3. Cleanup Automatico (03)

1. Crea la nuova Edge Function:
```bash
mkdir -p supabase/functions/cleanup-stale
cp 03-cleanup-stale-function.ts supabase/functions/cleanup-stale/index.ts
```

2. Aggiungi al `supabase/config.toml` il contenuto di `06-supabase-cron-config.toml`

3. Deploya:
```bash
supabase functions deploy cleanup-stale
```

### 4. Validazione Ordini (04)

Modifica `supabase/functions/orders/index.ts`:
- Aggiungi il blocco di validazione da `04-validate-orders-table-access.ts` PRIMA della creazione dell'ordine

### 5. Deprecazione PartySession (05)

```bash
# Applica la migration
npx prisma migrate dev --name deprecate_party_session

# Oppure esegui manualmente l'SQL
psql $DATABASE_URL -f 05-deprecate-party-session.sql
```

---

## Test consigliati

Dopo aver applicato le patch, testa questi scenari:

### Race condition
```bash
# Simula 2 scan simultanei sullo stesso tavolo
curl -X POST http://localhost:3001/api/tables/TABLE_ID/customers \
  -H "Content-Type: application/json" \
  -d '{"name": "Cliente A"}' &

curl -X POST http://localhost:3001/api/tables/TABLE_ID/customers \
  -H "Content-Type: application/json" \
  -d '{"name": "Cliente B"}' &

wait

# Verifica che solo uno sia host
curl http://localhost:3001/api/tables/TABLE_ID/customers
```

### Validazione merge tavoli
```bash
# Prova a unire un tavolo che non esiste
curl -X POST http://localhost:54321/functions/v1/table-sessions \
  -H "Content-Type: application/json" \
  -d '{"hostTableId": "...", "linkedTableNumbers": [999]}'
# Deve restituire errore 400
```

### Cleanup
```bash
# Esegui manualmente
curl -X POST http://localhost:54321/functions/v1/cleanup-stale

# Controlla i log
supabase functions logs cleanup-stale
```

---

## Note

- Il cleanup di default usa 4 ore per i clienti e 6 ore per le sessioni
- Puoi modificare `CUSTOMER_STALE_HOURS` e `SESSION_STALE_HOURS` nel file 03
- La validazione ordini blocca sia ordini senza sessione (quando il tavolo è in gruppo) che ordini con sessione sbagliata
