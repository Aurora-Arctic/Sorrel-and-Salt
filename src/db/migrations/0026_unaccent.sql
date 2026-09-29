-- The compendium search folds accents, so a search for `una` answers
-- `Uña de Gato` and the reverse (claude-docs/db.md, "The compendium read").
--
-- IF NOT EXISTS for the reason 0000 carries one: `sorrel_template`/`sorrel`
-- (Docker/postgres-init) already have it from the image build, and re-applying
-- this file is a no-op independently of the journal's once-only bookkeeping.
-- A trusted extension, so a database's owner may create it without being a
-- superuser — `sorrel` is not one, and neither is a Neon role.
CREATE EXTENSION IF NOT EXISTS unaccent;
--> statement-breakpoint
-- `unaccent(text)` is STABLE, because which dictionary it reads depends on
-- `search_path`, and an expression index accepts IMMUTABLE functions only.
-- Naming the dictionary pins the answer, which is what makes the promise
-- honest: it holds for as long as the dictionary's rules do, which nothing
-- here edits (and on Neon nothing can). A SQL-language function because
-- `LANGUAGE c` needs superuser. STRICT, so a NULL formal name folds to NULL as
-- the raw column would; `OR REPLACE` is the idempotent form, as 0016's is.
CREATE OR REPLACE FUNCTION unaccent_immutable(text) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
AS $$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $$;
