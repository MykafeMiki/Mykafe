CREATE TABLE IF NOT EXISTS "AppSettings" (
  "key" TEXT PRIMARY KEY,
  "value" JSONB NOT NULL,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserisce config chiusura di default (locale aperto, orari standard)
INSERT INTO "AppSettings" ("key", "value") VALUES (
  'closure_config',
  '{"enabled":true,"schedule":{"0":{"enabled":false,"openHour":11,"openMinute":0,"closeHour":21,"closeMinute":0},"1":{"enabled":true,"openHour":11,"openMinute":0,"closeHour":21,"closeMinute":0},"2":{"enabled":true,"openHour":11,"openMinute":0,"closeHour":21,"closeMinute":0},"3":{"enabled":true,"openHour":11,"openMinute":0,"closeHour":21,"closeMinute":0},"4":{"enabled":true,"openHour":11,"openMinute":0,"closeHour":21,"closeMinute":0},"5":{"enabled":true,"openHour":11,"openMinute":0,"closeHour":21,"closeMinute":0},"6":{"enabled":true,"openHour":11,"openMinute":0,"closeHour":21,"closeMinute":0}},"temporaryClosure":{"active":false}}'::jsonb
) ON CONFLICT ("key") DO NOTHING;

-- RLS: tutti possono leggere, tutti possono scrivere (app interna)
ALTER TABLE "AppSettings" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read" ON "AppSettings" FOR SELECT USING (true);
CREATE POLICY "public_write" ON "AppSettings" FOR ALL USING (true);
