# MyKafe Feature Patch - 16 Gennaio 2026

Questo documento contiene tutte le modifiche per implementare le 5 feature richieste.

---

## 📦 Feature 1: Ingrandire Menu Ingredienti

**File:** `apps/web/src/app/admin/page.tsx`

**Trova questo blocco:**
```tsx
<div className="max-h-48 overflow-y-auto border rounded-lg p-2 mb-2 space-y-1">
```

**Sostituisci con:**
```tsx
<div className="max-h-80 overflow-y-auto border rounded-lg p-2 mb-2 space-y-1">
```

> Questo aumenta l'altezza da 192px (h-48) a 320px (h-80), mostrando più ingredienti senza scroll.

---

## 📦 Feature 2: Riorganizzazione Categorie Menu

### 2.1 Migration SQL

**Crea file:** `supabase/migrations/20260116_unify_toast_category.sql`

```sql
-- ============================================
-- Unifica tutte le categorie panini in "Toast"
-- Mantiene Piadine e Focacce/Pizze separate
-- ============================================

-- 1. Verifica se esiste già la categoria Toast, altrimenti creala
INSERT INTO "Category" ("id", "name", "nameEn", "nameFr", "nameEs", "nameHe", "description", "descriptionEn", "sortOrder", "active", "createdAt", "updatedAt")
SELECT 
  'cat_toast_unified',
  'Toast',
  'Toast',
  'Toast',
  'Tostadas',
  'טוסט',
  'Panini, Bagel, Ciabatta e Focaccia Farcita',
  'Sandwiches, Bagels, Ciabatta and Stuffed Focaccia',
  1,
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "name" = 'Toast' AND "active" = true);

-- 2. Ottieni l'ID della categoria Toast (potrebbe essere nuovo o esistente)
DO $$
DECLARE
  toast_cat_id TEXT;
BEGIN
  -- Prova a trovare la categoria Toast attiva
  SELECT "id" INTO toast_cat_id FROM "Category" WHERE "name" = 'Toast' AND "active" = true LIMIT 1;
  
  -- Se non trovata, usa l'ID che abbiamo appena inserito
  IF toast_cat_id IS NULL THEN
    toast_cat_id := 'cat_toast_unified';
  END IF;
  
  -- 3. Sposta tutti gli item dalle vecchie categorie alla nuova Toast
  UPDATE "MenuItem" 
  SET "categoryId" = toast_cat_id
  WHERE "categoryId" IN (
    SELECT "id" FROM "Category" 
    WHERE "name" IN ('Panini', 'Bagel', 'Focaccia Farcita', 'Panini Farciti')
  );
  
  -- 4. Disattiva le vecchie categorie (non eliminare per sicurezza)
  UPDATE "Category" 
  SET "active" = false 
  WHERE "name" IN ('Panini', 'Bagel', 'Focaccia Farcita', 'Panini Farciti')
    AND "id" != toast_cat_id;

END $$;

-- 5. Aggiorna sortOrder delle categorie
UPDATE "Category" SET "sortOrder" = 1 WHERE "name" = 'Toast' AND "active" = true;
UPDATE "Category" SET "sortOrder" = 2 WHERE "name" = 'Piadina' AND "active" = true;
UPDATE "Category" SET "sortOrder" = 3 WHERE "name" = 'Piadine' AND "active" = true;
UPDATE "Category" SET "sortOrder" = 4 WHERE "name" = 'Focaccia e Pizza' AND "active" = true;
UPDATE "Category" SET "sortOrder" = 5 WHERE "name" = 'Focacce e Pizze' AND "active" = true;
UPDATE "Category" SET "sortOrder" = 6 WHERE "name" = 'Bruschetta' AND "active" = true;
UPDATE "Category" SET "sortOrder" = 7 WHERE "name" = 'Caprese' AND "active" = true;
UPDATE "Category" SET "sortOrder" = 8 WHERE "name" = 'Affumicato' AND "active" = true;
UPDATE "Category" SET "sortOrder" = 9 WHERE "name" = 'Insalate' AND "active" = true;
UPDATE "Category" SET "sortOrder" = 10 WHERE "name" = 'Caffetteria' AND "active" = true;
UPDATE "Category" SET "sortOrder" = 11 WHERE "name" = 'Bevande' AND "active" = true;
UPDATE "Category" SET "sortOrder" = 12 WHERE "name" = 'Sushi' AND "active" = true;

-- 6. Log delle modifiche
DO $$
DECLARE
  items_moved INTEGER;
BEGIN
  SELECT COUNT(*) INTO items_moved FROM "MenuItem" mi
  JOIN "Category" c ON mi."categoryId" = c."id"
  WHERE c."name" = 'Toast' AND c."active" = true;
  
  RAISE NOTICE 'Migration completata: % items nella categoria Toast', items_moved;
END $$;
```

### 2.2 Aggiorna MenuSections.tsx

**File:** `apps/web/src/components/menu/MenuSections.tsx`

**Sostituisci l'intero array `menuSections` con:**

```tsx
// Definizione delle macro-sezioni del menu
export const menuSections: MenuSection[] = [
  {
    id: 'toast',
    name: 'Toast',
    nameEn: 'Toast',
    nameFr: 'Toast',
    nameEs: 'Tostadas',
    nameHe: 'טוסט',
    image: '/sections/panini.jpg',
    categoryIds: [] // Toast (unificata: panini, bagel, ciabatta, focaccia farcita)
  },
  {
    id: 'piadine',
    name: 'Piadine',
    nameEn: 'Piadinas',
    nameFr: 'Piadines',
    nameEs: 'Piadinas',
    nameHe: 'פיאדינות',
    image: '/sections/piadine.jpg',
    categoryIds: [] // Piadina
  },
  {
    id: 'pizze-focacce',
    name: 'Pizze e Focacce',
    nameEn: 'Pizza & Focaccia',
    nameFr: 'Pizzas et Focaccias',
    nameEs: 'Pizzas y Focaccias',
    nameHe: 'פיצה ופוקאצ\'ה',
    image: '/sections/piatti.jpg',
    categoryIds: [] // Focaccia e Pizza (non farcite)
  },
  {
    id: 'bruschette',
    name: 'Bruschette',
    nameEn: 'Bruschetta',
    nameFr: 'Bruschetta',
    nameEs: 'Bruschetta',
    nameHe: 'ברוסקטה',
    image: '/sections/piatti.jpg',
    categoryIds: []
  },
  {
    id: 'affumicato',
    name: 'Affumicato',
    nameEn: 'Smoked',
    nameFr: 'Fumé',
    nameEs: 'Ahumado',
    nameHe: 'מעושן',
    image: '/sections/piatti.jpg',
    categoryIds: []
  },
  {
    id: 'caprese',
    name: 'Caprese',
    nameEn: 'Caprese',
    nameFr: 'Caprese',
    nameEs: 'Caprese',
    nameHe: 'קפרזה',
    image: '/sections/piatti.jpg',
    categoryIds: []
  },
  {
    id: 'salad',
    name: 'Insalate',
    nameEn: 'Salad',
    nameFr: 'Salade',
    nameEs: 'Ensalada',
    nameHe: 'סלט',
    image: '/sections/piatti.jpg',
    categoryIds: []
  },
  {
    id: 'bibite',
    name: 'Bibite',
    nameEn: 'Beverages',
    nameFr: 'Boissons',
    nameEs: 'Bebidas',
    nameHe: 'משקאות',
    image: '/sections/bibite.jpg',
    categoryIds: []
  },
  {
    id: 'caffetteria',
    name: 'Caffetteria',
    nameEn: 'Coffee',
    nameFr: 'Café',
    nameEs: 'Cafetería',
    nameHe: 'קפה',
    image: '/sections/caffetteria.jpg',
    categoryIds: []
  },
  {
    id: 'sushi',
    name: 'Sushi',
    nameEn: 'Sushi',
    nameFr: 'Sushi',
    nameEs: 'Sushi',
    nameHe: 'סושי',
    image: '/sections/sushi.jpg',
    categoryIds: []
  }
]

// Mappa per associare le categorie alle sezioni
export const categoryToSectionMap: Record<string, string> = {
  // Sezione Toast (unificata)
  'Toast': 'toast',
  'Panini': 'toast',
  'Bagel': 'toast',
  'Focaccia Farcita': 'toast',
  'Panini Farciti': 'toast',
  // Sezione Piadine
  'Piadina': 'piadine',
  'Piadine': 'piadine',
  // Sezione Pizze e Focacce (non farcite)
  'Focaccia e Pizza': 'pizze-focacce',
  'Focacce e Pizze': 'pizze-focacce',
  'Pizza': 'pizze-focacce',
  'Focaccia': 'pizze-focacce',
  // Altre sezioni
  'Bruschetta': 'bruschette',
  'Bruschette': 'bruschette',
  'Affumicato': 'affumicato',
  'Caprese': 'caprese',
  'Insalate': 'salad',
  'Salad': 'salad',
  'Bibite': 'bibite',
  'Bevande': 'bibite',
  'Caffetteria': 'caffetteria',
  'Caffetteria e Dolci': 'caffetteria',
  'Sushi': 'sushi',
}
```

---

## 📦 Feature 3: Switch Ingrediente Principale/Secondario

**✅ GIÀ IMPLEMENTATO!**

Il toggle esiste già nel modal di modifica piatto. Quando selezioni un ingrediente, appare un pulsante "Primario/Secondario" accanto.

- **Primario (rosso)**: Se l'ingrediente è esaurito, il piatto viene nascosto dal menu
- **Secondario (grigio)**: Se l'ingrediente è esaurito, viene mostrato barrato nella descrizione

---

## 📦 Feature 4: Timer Chiusure Menu Online

### 4.1 Aggiorna menuTimers.ts

**File:** `apps/web/src/lib/menuTimers.ts`

**Aggiungi queste interfacce e funzioni alla fine del file:**

```typescript
// ============================================
// CLOSURE SCHEDULE - Calendario Chiusure
// ============================================

export interface DaySchedule {
  enabled: boolean      // Se il giorno è abilitato per ordini online
  openHour: number      // Ora apertura (0-23)
  openMinute: number    // Minuto apertura (0, 15, 30, 45)
  closeHour: number     // Ora chiusura (0-23)
  closeMinute: number   // Minuto chiusura (0, 15, 30, 45)
}

export interface ClosureConfig {
  enabled: boolean                    // Master switch per abilitare/disabilitare tutto
  schedule: Record<number, DaySchedule>  // 0=Domenica, 1=Lunedi, ... 6=Sabato
  temporaryClosure: {
    active: boolean
    until?: string  // ISO date string
    message?: string
  }
}

const DEFAULT_DAY_SCHEDULE: DaySchedule = {
  enabled: true,
  openHour: 11,
  openMinute: 0,
  closeHour: 21,
  closeMinute: 0
}

const DEFAULT_CLOSURE_CONFIG: ClosureConfig = {
  enabled: true,
  schedule: {
    0: { ...DEFAULT_DAY_SCHEDULE, enabled: false }, // Domenica chiuso
    1: { ...DEFAULT_DAY_SCHEDULE }, // Lunedi
    2: { ...DEFAULT_DAY_SCHEDULE }, // Martedi
    3: { ...DEFAULT_DAY_SCHEDULE }, // Mercoledi
    4: { ...DEFAULT_DAY_SCHEDULE }, // Giovedi
    5: { ...DEFAULT_DAY_SCHEDULE }, // Venerdi
    6: { ...DEFAULT_DAY_SCHEDULE }, // Sabato
  },
  temporaryClosure: {
    active: false
  }
}

const CLOSURE_CONFIG_KEY = 'mykafe-closure-config'

/**
 * Get closure configuration from localStorage
 */
export function getClosureConfig(): ClosureConfig {
  if (typeof window === 'undefined') {
    return DEFAULT_CLOSURE_CONFIG
  }

  try {
    const stored = localStorage.getItem(CLOSURE_CONFIG_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return {
        enabled: parsed.enabled ?? true,
        schedule: { ...DEFAULT_CLOSURE_CONFIG.schedule, ...parsed.schedule },
        temporaryClosure: { ...DEFAULT_CLOSURE_CONFIG.temporaryClosure, ...parsed.temporaryClosure }
      }
    }
  } catch (e) {
    console.error('Error reading closure config:', e)
  }

  return DEFAULT_CLOSURE_CONFIG
}

/**
 * Save closure configuration to localStorage
 */
export function saveClosureConfig(config: ClosureConfig): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(CLOSURE_CONFIG_KEY, JSON.stringify(config))
  } catch (e) {
    console.error('Error saving closure config:', e)
  }
}

/**
 * Check if online ordering is currently available
 */
export function isOnlineOrderingOpen(): { 
  isOpen: boolean
  reason?: string
  nextOpenTime?: string 
} {
  const config = getClosureConfig()
  
  // Master switch off
  if (!config.enabled) {
    return { isOpen: false, reason: 'Menu online disabilitato' }
  }

  // Temporary closure
  if (config.temporaryClosure.active) {
    if (config.temporaryClosure.until) {
      const untilDate = new Date(config.temporaryClosure.until)
      if (new Date() < untilDate) {
        return { 
          isOpen: false, 
          reason: config.temporaryClosure.message || 'Chiusura temporanea',
          nextOpenTime: config.temporaryClosure.until
        }
      }
    } else {
      return { 
        isOpen: false, 
        reason: config.temporaryClosure.message || 'Chiusura temporanea'
      }
    }
  }

  const now = new Date()
  const dayOfWeek = now.getDay()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  const currentTime = currentHour * 60 + currentMinute

  const todaySchedule = config.schedule[dayOfWeek]

  // Day not enabled
  if (!todaySchedule.enabled) {
    // Find next open day
    for (let i = 1; i <= 7; i++) {
      const nextDay = (dayOfWeek + i) % 7
      const nextSchedule = config.schedule[nextDay]
      if (nextSchedule.enabled) {
        const dayName = DAYS_OF_WEEK.find(d => d.value === nextDay)?.label || ''
        return { 
          isOpen: false, 
          reason: `Chiuso oggi`,
          nextOpenTime: `${dayName} alle ${nextSchedule.openHour.toString().padStart(2, '0')}:${nextSchedule.openMinute.toString().padStart(2, '0')}`
        }
      }
    }
    return { isOpen: false, reason: 'Chiuso' }
  }

  const openTime = todaySchedule.openHour * 60 + todaySchedule.openMinute
  const closeTime = todaySchedule.closeHour * 60 + todaySchedule.closeMinute

  // Before opening
  if (currentTime < openTime) {
    return { 
      isOpen: false, 
      reason: 'Non ancora aperto',
      nextOpenTime: `oggi alle ${todaySchedule.openHour.toString().padStart(2, '0')}:${todaySchedule.openMinute.toString().padStart(2, '0')}`
    }
  }

  // After closing
  if (currentTime >= closeTime) {
    // Find next open time
    for (let i = 1; i <= 7; i++) {
      const nextDay = (dayOfWeek + i) % 7
      const nextSchedule = config.schedule[nextDay]
      if (nextSchedule.enabled) {
        const dayName = DAYS_OF_WEEK.find(d => d.value === nextDay)?.label || ''
        return { 
          isOpen: false, 
          reason: 'Chiuso per oggi',
          nextOpenTime: `${dayName} alle ${nextSchedule.openHour.toString().padStart(2, '0')}:${nextSchedule.openMinute.toString().padStart(2, '0')}`
        }
      }
    }
    return { isOpen: false, reason: 'Chiuso' }
  }

  // Open!
  return { isOpen: true }
}

/**
 * Get formatted schedule for display
 */
export function getFormattedSchedule(): { day: string, schedule: string }[] {
  const config = getClosureConfig()
  
  return DAYS_OF_WEEK.map(day => {
    const daySchedule = config.schedule[day.value]
    
    if (!daySchedule.enabled) {
      return { day: day.label, schedule: 'Chiuso' }
    }

    const open = `${daySchedule.openHour.toString().padStart(2, '0')}:${daySchedule.openMinute.toString().padStart(2, '0')}`
    const close = `${daySchedule.closeHour.toString().padStart(2, '0')}:${daySchedule.closeMinute.toString().padStart(2, '0')}`
    
    return { day: day.label, schedule: `${open} - ${close}` }
  })
}
```

### 4.2 Aggiungi Sezione Chiusure nel Pannello Admin

**File:** `apps/web/src/app/admin/page.tsx`

**Aggiungi questo import in cima al file:**
```tsx
import { 
  getTimerConfig, 
  saveTimerConfig, 
  TimerConfig, 
  getClosureConfig, 
  saveClosureConfig, 
  ClosureConfig,
  DaySchedule,
  DAYS_OF_WEEK,
  isOnlineOrderingOpen 
} from '@/lib/menuTimers'
```

**Aggiungi questo componente prima di `TimerConfigModal`:**

```tsx
// ============ CLOSURE CONFIG MODAL ============

interface ClosureConfigModalProps {
  config: ClosureConfig
  onClose: () => void
  onSave: (config: ClosureConfig) => void
}

function ClosureConfigModal({ config, onClose, onSave }: ClosureConfigModalProps) {
  const [localConfig, setLocalConfig] = useState<ClosureConfig>(config)

  const updateDaySchedule = (day: number, updates: Partial<DaySchedule>) => {
    setLocalConfig(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [day]: { ...prev.schedule[day], ...updates }
      }
    }))
  }

  const handleSave = () => {
    onSave(localConfig)
  }

  const timeOptions = Array.from({ length: 24 * 4 }, (_, i) => {
    const hour = Math.floor(i / 4)
    const minute = (i % 4) * 15
    return {
      value: { hour, minute },
      label: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
    }
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white rounded-xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold">🗓️ Calendario Ordini Online</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Master Switch */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
            <div>
              <h3 className="font-semibold text-gray-900">Ordini Online</h3>
              <p className="text-sm text-gray-600">Abilita/disabilita completamente gli ordini dal sito</p>
            </div>
            <button
              onClick={() => setLocalConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition font-medium ${
                localConfig.enabled
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {localConfig.enabled ? (
                <>
                  <ToggleRight className="w-5 h-5" />
                  <span>Attivo</span>
                </>
              ) : (
                <>
                  <ToggleLeft className="w-5 h-5" />
                  <span>Disattivo</span>
                </>
              )}
            </button>
          </div>

          {/* Temporary Closure */}
          <div className="p-4 bg-orange-50 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-orange-800">⚠️ Chiusura Temporanea</h3>
                <p className="text-sm text-orange-600">Per ferie, manutenzione, ecc.</p>
              </div>
              <button
                onClick={() => setLocalConfig(prev => ({
                  ...prev,
                  temporaryClosure: { ...prev.temporaryClosure, active: !prev.temporaryClosure.active }
                }))}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition ${
                  localConfig.temporaryClosure.active
                    ? 'bg-orange-500 text-white'
                    : 'bg-white text-orange-600 border border-orange-200'
                }`}
              >
                {localConfig.temporaryClosure.active ? 'Attiva' : 'Attiva chiusura'}
              </button>
            </div>

            {localConfig.temporaryClosure.active && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Messaggio (opzionale)
                  </label>
                  <input
                    type="text"
                    value={localConfig.temporaryClosure.message || ''}
                    onChange={(e) => setLocalConfig(prev => ({
                      ...prev,
                      temporaryClosure: { ...prev.temporaryClosure, message: e.target.value }
                    }))}
                    placeholder="Es: Chiusi per ferie fino al 20 gennaio"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Riapre il (opzionale)
                  </label>
                  <input
                    type="datetime-local"
                    value={localConfig.temporaryClosure.until?.slice(0, 16) || ''}
                    onChange={(e) => setLocalConfig(prev => ({
                      ...prev,
                      temporaryClosure: { 
                        ...prev.temporaryClosure, 
                        until: e.target.value ? new Date(e.target.value).toISOString() : undefined 
                      }
                    }))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Weekly Schedule */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">📅 Orari Settimanali</h3>
            <p className="text-sm text-gray-500">Configura gli orari di apertura per ogni giorno della settimana</p>

            <div className="space-y-2">
              {DAYS_OF_WEEK.map((day) => {
                const daySchedule = localConfig.schedule[day.value]
                
                return (
                  <div 
                    key={day.value} 
                    className={`flex items-center gap-3 p-3 rounded-lg border transition ${
                      daySchedule.enabled ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100'
                    }`}
                  >
                    {/* Day toggle */}
                    <button
                      onClick={() => updateDaySchedule(day.value, { enabled: !daySchedule.enabled })}
                      className={`w-24 flex items-center gap-2 px-2 py-1 rounded transition ${
                        daySchedule.enabled
                          ? 'text-green-700 font-medium'
                          : 'text-gray-400'
                      }`}
                    >
                      {daySchedule.enabled ? (
                        <ToggleRight className="w-4 h-4" />
                      ) : (
                        <ToggleLeft className="w-4 h-4" />
                      )}
                      <span className="text-sm">{day.label.slice(0, 3)}</span>
                    </button>

                    {daySchedule.enabled ? (
                      <>
                        {/* Opening time */}
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-500">dalle</span>
                          <select
                            value={daySchedule.openHour}
                            onChange={(e) => updateDaySchedule(day.value, { openHour: parseInt(e.target.value) })}
                            className="px-2 py-1 border rounded text-sm focus:ring-2 focus:ring-blue-500"
                          >
                            {Array.from({ length: 24 }, (_, i) => (
                              <option key={i} value={i}>{i.toString().padStart(2, '0')}</option>
                            ))}
                          </select>
                          <span>:</span>
                          <select
                            value={daySchedule.openMinute}
                            onChange={(e) => updateDaySchedule(day.value, { openMinute: parseInt(e.target.value) })}
                            className="px-2 py-1 border rounded text-sm focus:ring-2 focus:ring-blue-500"
                          >
                            {[0, 15, 30, 45].map(m => (
                              <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                            ))}
                          </select>
                        </div>

                        {/* Closing time */}
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-500">alle</span>
                          <select
                            value={daySchedule.closeHour}
                            onChange={(e) => updateDaySchedule(day.value, { closeHour: parseInt(e.target.value) })}
                            className="px-2 py-1 border rounded text-sm focus:ring-2 focus:ring-blue-500"
                          >
                            {Array.from({ length: 24 }, (_, i) => (
                              <option key={i} value={i}>{i.toString().padStart(2, '0')}</option>
                            ))}
                          </select>
                          <span>:</span>
                          <select
                            value={daySchedule.closeMinute}
                            onChange={(e) => updateDaySchedule(day.value, { closeMinute: parseInt(e.target.value) })}
                            className="px-2 py-1 border rounded text-sm focus:ring-2 focus:ring-blue-500"
                          >
                            {[0, 15, 30, 45].map(m => (
                              <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                            ))}
                          </select>
                        </div>
                      </>
                    ) : (
                      <span className="text-sm text-gray-400 italic">Chiuso</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t bg-gray-50 sticky bottom-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            Annulla
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-medium"
          >
            Salva
          </button>
        </div>
      </div>
    </div>
  )
}
```

**Aggiungi questi state nel componente `MenuManager`:**
```tsx
const [showClosureModal, setShowClosureModal] = useState(false)
const [closureConfig, setClosureConfig] = useState<ClosureConfig>(getClosureConfig())
```

**Aggiungi un bottone nella sezione "Menu Speciali" o dopo "Timer Config":**
```tsx
{/* Closure Calendar Button */}
<div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-200">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      <span className="text-2xl">🗓️</span>
      <div>
        <h3 className="font-semibold text-indigo-800">Calendario Ordini Online</h3>
        <p className="text-sm text-indigo-600">
          {isOnlineOrderingOpen().isOpen 
            ? '✅ Ordini online attivi' 
            : `❌ ${isOnlineOrderingOpen().reason}`
          }
        </p>
      </div>
    </div>
    <button
      onClick={() => setShowClosureModal(true)}
      className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition"
    >
      Configura
    </button>
  </div>
</div>

{/* Closure Modal */}
{showClosureModal && (
  <ClosureConfigModal
    config={closureConfig}
    onClose={() => setShowClosureModal(false)}
    onSave={(newConfig) => {
      saveClosureConfig(newConfig)
      setClosureConfig(newConfig)
      setShowClosureModal(false)
    }}
  />
)}
```

### 4.3 Blocca Ordini nella Pagina /ordina

**File:** `apps/web/src/app/ordina/page.tsx`

**Aggiungi import:**
```tsx
import { isOnlineOrderingOpen } from '@/lib/menuTimers'
```

**Aggiungi questo check all'inizio del componente, dopo gli useState:**
```tsx
const orderingStatus = isOnlineOrderingOpen()
```

**Aggiungi questo blocco prima del return principale (dopo loading e error checks):**
```tsx
// Check if online ordering is closed
if (!orderingStatus.isOpen) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-orange-50 to-white">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">🕐</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Ordini Online Non Disponibili
        </h1>
        <p className="text-gray-600 mb-4">
          {orderingStatus.reason}
        </p>
        {orderingStatus.nextOpenTime && (
          <p className="text-sm text-orange-600 font-medium">
            Riapriamo {orderingStatus.nextOpenTime}
          </p>
        )}
        <a
          href="/"
          className="inline-block mt-6 px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition"
        >
          Torna alla Home
        </a>
      </div>
    </div>
  )
}
```

---

## 📦 Feature 5: Foto nel Popup Utente

**File:** `apps/web/src/components/menu/ItemModal.tsx`

**Aggiungi import:**
```tsx
import Image from 'next/image'
```

**Trova il div con className `{/* Header */}`:**
```tsx
{/* Header */}
<div className="flex items-center justify-between p-4 border-b">
  <h2 className="text-lg font-bold text-gray-900">{translatedName}</h2>
  <button
    onClick={onClose}
    className="p-2 rounded-full hover:bg-gray-100 transition"
  >
    <X className="w-5 h-5" />
  </button>
</div>
```

**Sostituisci con:**
```tsx
{/* Image Header */}
{item.imageUrl && (
  <div className="relative w-full h-48 bg-gray-100">
    <Image
      src={item.imageUrl}
      alt={translatedName}
      fill
      className="object-cover"
      sizes="(max-width: 640px) 100vw, 512px"
    />
    {/* Close button overlay */}
    <button
      onClick={onClose}
      className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition shadow-sm"
    >
      <X className="w-5 h-5" />
    </button>
  </div>
)}

{/* Header (no image or below image) */}
<div className={`flex items-center justify-between p-4 border-b ${item.imageUrl ? '' : ''}`}>
  <h2 className="text-lg font-bold text-gray-900">{translatedName}</h2>
  {!item.imageUrl && (
    <button
      onClick={onClose}
      className="p-2 rounded-full hover:bg-gray-100 transition"
    >
      <X className="w-5 h-5" />
    </button>
  )}
</div>
```

---

## 📝 Traduzioni da Aggiungere

**File:** `apps/web/messages/it.json`

Aggiungi nella sezione `admin`:
```json
"closureCalendar": "Calendario Ordini Online",
"closureActive": "Ordini online attivi",
"closureClosed": "Ordini online chiusi",
"temporaryClosure": "Chiusura Temporanea",
"temporaryClosureDesc": "Per ferie, manutenzione, ecc.",
"closureMessage": "Messaggio",
"reopensAt": "Riapre il",
"weeklySchedule": "Orari Settimanali",
"weeklyScheduleDesc": "Configura gli orari di apertura per ogni giorno",
"from": "dalle",
"to": "alle",
"closed": "Chiuso",
"onlineOrdersUnavailable": "Ordini Online Non Disponibili",
"reopensOn": "Riapriamo"
```

---

## ✅ Checklist Implementazione

1. [ ] **Feature 1**: Modifica `max-h-48` → `max-h-80` in admin/page.tsx
2. [ ] **Feature 2**: 
   - [ ] Esegui migration SQL per unificare categorie
   - [ ] Aggiorna MenuSections.tsx
3. [ ] **Feature 3**: ✅ Già implementato
4. [ ] **Feature 4**:
   - [ ] Aggiungi codice a menuTimers.ts
   - [ ] Aggiungi ClosureConfigModal in admin/page.tsx
   - [ ] Aggiungi check in ordina/page.tsx
5. [ ] **Feature 5**: Aggiungi Image in ItemModal.tsx

---

## 🧪 Test

Dopo l'implementazione, verifica:

1. **Ingredienti**: Apri modal modifica piatto → la lista ingredienti deve essere più alta
2. **Menu**: Verifica che tutti i toast siano sotto un'unica categoria
3. **Chiusure**: 
   - Imposta un giorno come chiuso
   - Vai su /ordina in quel giorno → deve mostrare messaggio di chiusura
   - Attiva chiusura temporanea → /ordina deve essere bloccato
4. **Foto popup**: Clicca su un panino con foto → deve mostrare l'immagine in cima al popup
