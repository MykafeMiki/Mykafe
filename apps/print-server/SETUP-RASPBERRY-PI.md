# Setup — Print server su Raspberry Pi

Guida per portare il print-server (oggi sul PC di cassa Windows, vedi
`start-print-server.ps1`) sul Raspberry Pi 4 dedicato. Il codice
(`src/index.ts`) è puro Node.js, non serve modificarlo: cambia solo
come viene lanciato e tenuto vivo (qui `print-server.service`, systemd,
invece dello script PowerShell + Task Scheduler di Windows).

## 1. Flash della scheda SD

1. Installa **Raspberry Pi Imager** su un PC (https://www.raspberrypi.com/software/).
2. Scegli OS: **Raspberry Pi OS Lite (64-bit)** — non serve la versione
   desktop, il Pi farà solo da print-server headless.
3. Prima di scrivere, apri le **impostazioni avanzate** (icona ingranaggio):
   - Hostname: es. `mykafe-print`
   - Abilita SSH, con password (o la tua chiave pubblica se preferisci)
   - Utente: `pi` (o quello che preferisci — va poi riportato in
     `print-server.service`, campo `User=`)
   - Se non colleghi subito il cavo Ethernet, configura anche il WiFi qui;
     altrimenti collega il cavo dello switch/router del locale e basta —
     Ethernet è preferibile per un servizio always-on (vedi nota nella
     conversazione sull'acquisto).
4. Scrivi la scheda, inseriscila nel Pi, alimenta e attendi ~1 minuto per
   il primo boot.

## 2. Primo accesso

Dal tuo PC, sulla stessa rete:

```bash
ssh pi@mykafe-print.local
```

Se `.local` non risolve, trova l'IP dal router (client "mykafe-print") e
usa `ssh pi@<ip>`.

## 3. Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v   # verifica: v20.x, funziona su ARM senza differenze
```

## 4. Codice del print-server

Non serve clonare tutto il monorepo (è un workspace pnpm con anche
`apps/web`): il print-server ha le sue dipendenze proprie
(`@supabase/supabase-js`, `dotenv`) e gira standalone con `npm`. Basta
copiare la sola cartella `apps/print-server`.

Dal tuo PC:

```bash
scp -r apps/print-server pi@mykafe-print.local:/home/pi/print-server
```

Sul Pi:

```bash
cd /home/pi/print-server
npm install
npm run build   # tsc -> dist/index.js
```

## 5. Configurazione `.env`

```bash
cp .env.example .env
nano .env
```

Compila:
- `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` — stessi valori già in uso
  sul PC di cassa (attenzione: dev'essere la **secret key nuova**
  `sb_secret_…`, non quella legacy — vedi
  `docs/RUNBOOK-rotazione-chiavi.md`).
- `PRINTER_*_IP` / `PRINTER_*_PORT` — da definire più avanti (per ora
  puoi lasciare i placeholder).

## 6. Test di stampa (opzionale, prima di collegare Supabase)

Una volta noto l'IP della stampante:

```bash
node test-print.mjs <IP_STAMPANTE> 9100
```

Se esce uno scontrino di prova, la rete verso la stampante è a posto.

## 7. Servizio systemd (avvio automatico + restart)

```bash
sudo cp print-server.service /etc/systemd/system/print-server.service
sudo systemctl daemon-reload
sudo systemctl enable --now print-server
```

Se hai usato un percorso o un utente diversi da `/home/pi/print-server` /
`pi`, aggiorna prima `WorkingDirectory=` e `User=` nel file
`print-server.service` (sia quello copiato sul Pi che l'originale nel
repo, per restare allineati).

## 8. Verifica

```bash
journalctl -u print-server -f
```

Deve comparire `Realtime status: SUBSCRIBED` e `Waiting for orders...`.
A questo punto un ordine nuovo su MyKafe dovrebbe arrivare al print-server
(la stampa effettiva dipende dal punto 5/6, IP stampante).

## 9. Spegnimento del PC di cassa come stampante

Finché il Pi non è verificato in produzione, **lascia attivo** il
launcher Windows (`start-print-server.ps1` / Task Scheduler sul PC di
cassa) come fallback. Disattivalo solo dopo aver confermato che il Pi
stampa correttamente per un turno intero.
