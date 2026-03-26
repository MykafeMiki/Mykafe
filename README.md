# MyKafe - Patch per le 4 funzionalità richieste

## Panoramica delle modifiche

Questo pacchetto contiene le patch per implementare:

1. **Toggle Takeaway ON/OFF** + **Giorni di chiusura**
2. **Upload foto da dispositivo** (fix mobile)
3. **Gestione ingredienti migliorata** (primari/secondari)

---

## 1. Toggle Takeaway ON/OFF + Giorni di chiusura

### File da modificare: `apps/web/src/lib/menuTimers.ts`

**Sostituire l'intero file** con `menuTimers.ts` incluso in questa patch.

### Modifiche principali:
- Aggiunto `enabled: boolean` alla config takeaway
- Aggiunto `closedDays: number[]` per i giorni di chiusura
- Nuove funzioni: `isTakeawayAvailable()`, `getTakeawayStatus()`, `getAvailableDates()`

### File da modificare: `apps/web/src/app/admin/page.tsx`

Nel componente `TimerModal`, **dopo** la sezione "Orari Ritiro Takeaway", **sostituire** con il codice in `TakeawayConfigSection.tsx`:

```tsx
// Trova questa sezione:
{/* Takeaway Pickup Hours Configuration */}
<div className="space-y-4 border-t pt-6">
  ...
</div>

// Sostituiscila con il contenuto di TakeawayConfigSection.tsx
```

### File da modificare: `apps/web/src/app/ordina/page.tsx`

All'inizio del componente, **aggiungere**:

```tsx
import { getTakeawayStatus, DAYS_OF_WEEK } from '@/lib/menuTimers'

// Nel componente:
const takeawayStatus = getTakeawayStatus()
```

Nel render, **aggiungere questo check** prima del contenuto esistente:

```tsx
if (!takeawayStatus.isAvailable) {
  return <TakeawayUnavailableMessage status={takeawayStatus} />
}
```

Vedi `TakeawayUnavailableMessage.tsx` per il componente da aggiungere.

---

## 2. Upload foto da dispositivo (fix mobile)

### Problema
Su iOS/Safari, l'input file con `accept="image/*"` non funziona correttamente per alcuni utenti.

### Soluzione
Sostituire **tutti** gli input file per immagini con questa versione:

```tsx
<input
  ref={fileInputRef}
  type="file"
  accept="image/jpeg,image/png,image/gif,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.gif,.webp,.heic,.heif"
  onChange={handleFileChange}
  className="hidden"
/>
```

### File da modificare:

1. `apps/web/src/app/admin/page.tsx` - Ci sono **4** input file:
   - Nel `CategoryModal`
   - Nel `ItemModal`
   - Nella lista piatti (inline upload)
   - Nella griglia sezioni

2. **Per ognuno**, aggiornare:
   - L'attributo `accept` come sopra
   - La funzione `handleFileChange` per validare anche HEIC/HEIF

Vedi `ImageUploadInput.tsx` per il codice completo della validazione.

---

## 3. Gestione ingredienti migliorata

### Problema attuale
- L'UI per selezionare primario/secondario non è intuitiva
- Non è chiaro cosa succede quando si toglie la disponibilità
- Difficile creare ingredienti rapidamente

### Soluzione

#### File da modificare: `apps/web/src/app/admin/page.tsx`

**Nel modal ItemModal**, sostituire la sezione ingredienti con `ImprovedIngredientsSelector` da `ImprovedIngredientsComponents.tsx`.

**Nel tab Ingredients**, sostituire `IngredientsTab` con `ImprovedIngredientsTab`.

### Codice da aggiungere

1. Importa i nuovi componenti:
```tsx
import { ImprovedIngredientsSelector, ImprovedIngredientsTab } from './components/ImprovedIngredientsComponents'
```

2. Nel `ItemModal`, trova:
```tsx
{/* Ingredients */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    {t('ingredients')}
  </label>
  ...
</div>
```

3. Sostituisci con:
```tsx
{/* Ingredients */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    {t('ingredients')}
  </label>
  <ImprovedIngredientsSelector
    allIngredients={allIngredients}
    selectedIngredients={selectedIngredients}
    onSelectionChange={setSelectedIngredients}
    onCreateIngredient={async (name) => {
      const newIng = await createIngredient({ name })
      setAllIngredients(prev => [...prev, newIng])
      return newIng
    }}
    loading={loadingIngredients}
    t={t}
    tc={tc}
  />
</div>
```

---

## Dipendenze da aggiungere ai file di traduzione

### `apps/web/messages/it.json` e altri

Aggiungi queste chiavi nella sezione `admin`:

```json
{
  "admin": {
    ...
    "takeawayService": "Servizio Takeaway",
    "takeawayEnabled": "I clienti possono ordinare online per il ritiro",
    "takeawayDisabled": "Servizio temporaneamente sospeso",
    "closedDays": "Giorni di chiusura",
    "closedDaysDesc": "Seleziona i giorni in cui il ristorante è chiuso. Il takeaway non sarà disponibile in questi giorni.",
    "takeawayDisabledWarning": "I clienti che visitano /ordina vedranno un messaggio che indica che il servizio è temporaneamente sospeso.",
    "primaryIngredient": "Primario",
    "secondaryIngredient": "Secondario",
    "ingredientPrimaryDesc": "Se esaurito, nasconde il piatto",
    "ingredientSecondaryDesc": "Se esaurito, mostra barrato"
  }
}
```

---

## Ordine di applicazione consigliato

1. **Prima** applica le modifiche a `menuTimers.ts` (backend logic)
2. **Poi** applica le modifiche all'admin page (UI configurazione)
3. **Poi** applica le modifiche alla pagina /ordina (check disponibilità)
4. **Infine** applica le modifiche agli input file (fix upload mobile)

---

## Test consigliati

1. **Toggle Takeaway:**
   - Disabilita takeaway → verifica che /ordina mostri messaggio
   - Riabilita → verifica che funzioni normalmente

2. **Giorni di chiusura:**
   - Seleziona oggi come chiuso → verifica messaggio
   - Rimuovi → verifica che funzioni

3. **Upload mobile:**
   - Testa su iPhone Safari
   - Testa su Android Chrome
   - Verifica che fotocamera e galleria siano entrambe accessibili

4. **Ingredienti:**
   - Crea nuovo ingrediente dal selector
   - Assegna come primario → metti esaurito → verifica che piatto sparisca
   - Assegna come secondario → metti esaurito → verifica che appaia barrato
