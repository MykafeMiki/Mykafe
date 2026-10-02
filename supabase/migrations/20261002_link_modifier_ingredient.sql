-- ============================================
-- Collega automaticamente le aggiunte (Modifier) al loro ingrediente
-- ============================================
-- Il menu nasconde gia' un'aggiunta quando Modifier."ingredientId" punta a un
-- ingrediente esaurito, ma l'admin non imposta mai quel collegamento: tutte le
-- aggiunte avevano ingredientId NULL, quindi "+ Pesto" restava ordinabile anche
-- con il pesto esaurito.
--
-- Regola: un'aggiunta senza ingrediente si collega a quello con lo stesso nome,
-- ignorando il "+" iniziale e "Variazione a" ("+ Pesto" -> Pesto,
-- "Variazione a focaccia" -> Focaccia). Vale per le aggiunte esistenti
-- (backfill), per quelle nuove o rinominate, e per gli ingredienti creati dopo.
-- Un collegamento impostato a mano non viene mai sovrascritto, e uno tolto a
-- mano (o dall'eliminazione dell'ingrediente) non viene rimesso.

CREATE OR REPLACE FUNCTION public.modifier_ingredient_key(name text)
RETURNS text
LANGUAGE sql IMMUTABLE
AS $$
  SELECT lower(trim(regexp_replace(
    regexp_replace(coalesce(name, ''), '^\s*\+\s*', ''),
    '^variazione\s+a\s+', '', 'i'
  )))
$$;

CREATE OR REPLACE FUNCTION public.find_ingredient_for_modifier(modifier_name text)
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT i.id
  FROM "Ingredient" i
  WHERE lower(trim(i.name)) = public.modifier_ingredient_key(modifier_name)
  ORDER BY (i."menuType" = 'CLASSIC') DESC, i.name
  LIMIT 1
$$;

-- Aggiunta nuova o rinominata senza ingrediente: cerca l'ingrediente omonimo
CREATE OR REPLACE FUNCTION public.modifier_autolink_ingredient()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."ingredientId" IS NULL THEN
    NEW."ingredientId" := public.find_ingredient_for_modifier(NEW.name);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS modifier_autolink_ingredient ON "Modifier";
CREATE TRIGGER modifier_autolink_ingredient
  BEFORE INSERT OR UPDATE OF name ON "Modifier"
  FOR EACH ROW EXECUTE FUNCTION public.modifier_autolink_ingredient();

-- Ingrediente nuovo o rinominato: collega le aggiunte omonime ancora scollegate
CREATE OR REPLACE FUNCTION public.ingredient_autolink_modifiers()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE "Modifier" m
  SET "ingredientId" = NEW.id
  WHERE m."ingredientId" IS NULL
    AND public.modifier_ingredient_key(m.name) = lower(trim(NEW.name));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ingredient_autolink_modifiers ON "Ingredient";
CREATE TRIGGER ingredient_autolink_modifiers
  AFTER INSERT OR UPDATE OF name ON "Ingredient"
  FOR EACH ROW EXECUTE FUNCTION public.ingredient_autolink_modifiers();

-- Ingrediente eliminato: le sue aggiunte diventano non disponibili, invece di
-- restare ordinabili scollegate (la FK poi mette ingredientId a NULL).
CREATE OR REPLACE FUNCTION public.ingredient_disable_modifiers_on_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE "Modifier" SET available = false WHERE "ingredientId" = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS ingredient_disable_modifiers_on_delete ON "Ingredient";
CREATE TRIGGER ingredient_disable_modifiers_on_delete
  BEFORE DELETE ON "Ingredient"
  FOR EACH ROW EXECUTE FUNCTION public.ingredient_disable_modifiers_on_delete();

-- Nel DB il nome era salvato con il carattere di sostituzione U+FFFD al posto
-- di "è" e non combaciava con l'aggiunta "+ Patè di olive".
UPDATE "Ingredient" SET name = 'Patè di olive'
WHERE name = 'Pat' || chr(65533) || ' di olive';

-- Backfill delle aggiunte esistenti
UPDATE "Modifier" m
SET "ingredientId" = public.find_ingredient_for_modifier(m.name)
WHERE m."ingredientId" IS NULL
  AND public.find_ingredient_for_modifier(m.name) IS NOT NULL;
