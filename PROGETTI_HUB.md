# 🚀 HUB GESTIONE PROGETTI PARALLELI

**Dario** | Gestione progetti indipendenti | Cowork Mode

---

## 📊 PANORAMICA

Stai gestendo **4 progetti indipendenti** con priorità e fasi diverse. Questo hub centralizza il controllo e permette gestione parallela.

| Progetto | Priorità | Status | Avanzamento | Ultimo Aggiornamento |
|----------|----------|--------|------------|----------------------|
| **TrainSmart** | 🔴 ALTA | Attivo | 75% | 2026-02-26 |
| **TrainMaster** | 🟡 MEDIA | In Progress | 60% | 2026-02-25 |
| **MyKafe App** | 🟡 MEDIA | In Progress | 55% | 2026-02-26 |
| **Finanza Personale** | 🟢 BASSA | Pianificazione | 30% | 2026-02-26 |

---

## 🎯 PROGETTI DETTAGLI

### 1️⃣ TrainSmart
- **Tipo**: Applicazione web fullstack (esercizi e allenamenti)
- **Stack**: Next.js, React, TypeScript, Supabase
- **Cartella**: `~/Desktop/TrainSmart`
- **Status**: Attivo - Sviluppo e bug fixes
- **Task Attuali**: Normalizzazione goal, live workout session, quiz routing
- **Prossimo Step**: Test completi, deployment

### 2️⃣ TrainMaster
- **Tipo**: Applicazione web con backend robusto
- **Stack**: Next.js, TypeScript, Supabase, Worker
- **Cartella**: `~/Desktop/TrainMaster-main`
- **Status**: In Progress - Fase 2 completata
- **Task Attuali**: Backend completion, hybrid system implementation
- **Prossimo Step**: Frontend integration, user testing

### 3️⃣ MyKafe App
- **Tipo**: Monorepo fullstack (gestione ristorante sushi)
- **Stack**: pnpm workspace, Next.js, Supabase, Menu PDF
- **Cartella**: `~/Desktop/MyKafe`
- **Status**: In Progress - Setup menu e database
- **Task Attuali**: Toast → Panini rename, menu sushi integration, table management
- **Prossimo Step**: Completare menu, testing operativo

### 4️⃣ Finanza Personale
- **Tipo**: Dashboard finanze personali (Dario & Jessica)
- **Stack**: HTML/CSS/JavaScript, CSV export, Splitwise integration
- **Cartella**: `~/Desktop/Finanza personale`
- **Status**: Pianificazione - Pronto per sviluppo
- **Task Attuali**: Analisi requirements, data import
- **Prossimo Step**: Feature planning, UI design

---

## 📋 SISTEMA DI GESTIONE PARALLELA

### Come Lavorare su Progetti Multipli

**In Cowork, puoi eseguire task PARALLELI su diversi progetti:**

```
├─ Task 1: Lavoro su TrainSmart (Bug fix)
├─ Task 2: Lavoro su TrainMaster (Backend) ← Parallelo
├─ Task 3: Lavoro su MyKafe (Menu setup) ← Parallelo
└─ Task 4: Pianificazione Finanza Personale ← Parallelo
```

### Tracciamento Progress

**File Dashboard**: `PROGETTI_Dashboard.xlsx`
- Visualizzazione centralizzata di tutti e 4 i progetti
- Percentuale completamento per ogni progetto
- Status e priorità
- Ultimo aggiornamento

**Modifica la colonna "% Completo"** quando avanzi su un progetto:
- Celle BLU = modificabili
- Formule NERE = calcolate automaticamente

### Best Practices

1. **Una priorità alla volta**: Focalizzati su priorità ALTA (TrainSmart) quando possibile
2. **Task Paralleli**: Usa Cowork per lanciare task su più progetti contemporaneamente
3. **Review Settimanale**: Aggiorna Dashboard il venerdì con progress
4. **Documentazione**: Ogni commit deve menziare il progetto (es: "[TrainSmart] Fix goal normalization")

---

## 🔗 LINK RAPIDI PROGETTI

### Da Terminale (Bash)
```bash
# TrainSmart
cd ~/Desktop/TrainSmart && git status

# TrainMaster
cd ~/Desktop/TrainMaster-main && git status

# MyKafe
cd ~/Desktop/MyKafe && git status

# Finanza Personale
cd ~/Desktop/"Finanza personale" && git status
```

### Git Status Tutti
```bash
for proj in "TrainSmart" "TrainMaster-main" "MyKafe" "Finanza personale"; do
  echo "=== $proj ===" && cd ~/Desktop/$proj && git status --short && cd ..
done
```

---

## 📈 WORKFLOW CONSIGLIATO

### Morning Check-in (5 min)
1. Apri Dashboard → Vedi status tutti i progetti
2. Identifica priorità del giorno
3. Lancia task paralleli in Cowork

### Durante il Lavoro
- Lavora su un task per volta
- Lancia nuovi task paralleli se necessario
- Commenta quando cambi progetto

### End of Day (2 min)
- Update % Completo nel Dashboard
- Note brevi sul progress
- Identifica blocchi per il giorno dopo

### Weekly Review (15 min)
- Analizza Dashboard
- Aggiorna milestone
- Pianifica sprint successivo

---

## 🛠️ COMANDI UTILI COWORK

### Lanciare Task Paralleli
```
"Lavorare su TrainSmart: [descrizione task]"
"Contemporaneamente, lavora su MyKafe: [descrizione task]"
```

### Tracciare Multiple Tasks
- Usa TodoList in Cowork per mantenere visibilità
- Segna completate le task
- Crea task dipendenti

---

## 📝 NOTE IMPORTANTI

### Progetti Indipendenti
- Non ci sono dipendenze tra i 4 progetti
- Puoi lavorarci in qualsiasi ordine
- Flessibilità totale sul timing

### Commits e Git
- Ogni progetto ha suo repo
- Committa frequentemente
- Usa branch feature per major changes

### Documentazione
- Mantieni README aggiornati in ogni progetto
- Documenta decision importanti
- Setup guide chiare per future reference

---

## 📞 TROUBLESHOOTING

**Problema**: Difficile tracciare progresso
→ **Soluzione**: Aggiorna Dashboard settimanalmente, usa TodoList

**Problema**: Confusione su priorità
→ **Soluzione**: Vedi tabella sopra, TrainSmart è SEMPRE prioritario

**Problema**: Dimenticanza di quale task fare
→ **Soluzione**: Apri Dashboard ogni mattina, identifica top 2-3 task

---

## 📊 METRICHE TRACKING

Aggiorna settimanalmente nel Dashboard:
- **% Completo**: Avanzamento stimato (0-100%)
- **Status**: Attivo / In Progress / Pianificazione / Blocked
- **Ultima Modifica**: Data ultimo aggiornamento importante
- **Note**: Context breve su cosa stai facendo

---

**Last Updated**: 2026-02-27
**Sistema**: Cowork Multi-Project Management
**Owner**: Dario Tripoli
