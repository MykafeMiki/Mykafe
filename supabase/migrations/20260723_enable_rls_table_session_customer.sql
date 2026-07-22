-- Abilita le Row Level Security su Table, TableSession e TableCustomer.
--
-- Erano spente: con la sola publishable key -- che e' pubblica per definizione,
-- sta nel sorgente del sito -- si potevano leggere i nomi dei clienti in
-- TableCustomer ed eseguire DELETE su Table, cioe' svuotare i tavoli e mettere
-- fuori uso il locale. Verificato con richieste reali il 22/07/2026 (PATCH e
-- DELETE rispondevano 204).
--
-- Non si aggiungono policy per il ruolo anon: il browser non interroga mai
-- queste tabelle. Dal client passano solo Category, Ingredient e AppSettings;
-- tavoli, sessioni e clienti arrivano dalle edge function, che usano la secret
-- key e scavalcano le RLS.
--
-- Su "Table" esistevano gia' delle policy create ma mai attivate (advisor
-- "Policy Exists RLS Disabled"): abilitando le RLS tornano in vigore, quindi
-- dopo questa migrazione va riverificato che gli accessi anonimi diano 401.

alter table public."Table" enable row level security;
alter table public."TableSession" enable row level security;
alter table public."TableCustomer" enable row level security;
