-- iPad "kiosk": un iPad fisso al tavolo che mostra il menu, riassegnabile
-- dall'admin a un tavolo diverso senza toccare il dispositivo.
--
-- deviceId e' generato dal client (crypto.randomUUID) e persistito in
-- localStorage al primo avvio: identifica l'iPad in modo stabile senza
-- login. tableId e' nullo finche' l'admin non assegna un tavolo.
--
-- Scrittura solo via edge function "kiosk" (secret key, bypassa RLS), come
-- Table/TableSession/TableCustomer. La lettura pubblica (SELECT) e' invece
-- concessa alla anon key: serve perche' l'iPad si sottoscrive in realtime
-- alla propria riga per accorgersi subito quando l'admin cambia tavolo,
-- e Supabase Realtime rispetta le RLS. Il rischio e' minimo: la tabella non
-- contiene dati di clienti, solo l'associazione dispositivo/tavolo.

create table "KioskDevice" (
  "deviceId" text primary key,
  label text,
  "tableId" text references "Table"(id) on delete set null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index "KioskDevice_tableId_idx" on "KioskDevice"("tableId");

alter table "KioskDevice" enable row level security;

create policy "public_read" on "KioskDevice" for select using (true);
