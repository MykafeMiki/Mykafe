-- Archivio della cassa: snapshot degli ordini prima che vengano cancellati.
--
-- Gli ordini vivono in "Order" solo per la giornata: il reset manuale (tasto
-- in cassa/cucina) e la pulizia automatica dopo 24h li cancellano. Prima di
-- farlo, la edge function copia qui ordini, righe e modificatori come JSON,
-- con i totali incassati, cosi' l'admin puo' rivederli per eventuali
-- contestazioni.
--
-- Solo edge function (secret key): RLS attiva e nessuna policy, quindi la
-- anon key non legge ne' scrive nulla.

create table "OrderArchive" (
  id text primary key default gen_random_uuid()::text,
  "archivedAt" timestamptz not null default now(),
  reason text not null check (reason in ('MANUAL_RESET', 'AUTO_24H')),
  "orderCount" integer not null default 0,
  "totalCash" integer not null default 0,
  "totalCard" integer not null default 0,
  "totalUnpaid" integer not null default 0,
  "periodStart" timestamptz,
  "periodEnd" timestamptz,
  orders jsonb not null default '[]'::jsonb
);

create index "OrderArchive_archivedAt_idx" on "OrderArchive"("archivedAt" desc);

alter table "OrderArchive" enable row level security;
