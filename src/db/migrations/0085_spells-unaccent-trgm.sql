-- The grimoire search's fold, `unaccent_immutable($1) <% unaccent_immutable(title)`
-- and the same over intent (M10.11), reaches a trigram index only through an
-- expression index over the same fold, as 0027's `ingredients_unaccent_trgm`
-- does (claude-docs/db/grimoire.md, "The grimoire search"). One index over
-- both columns serves either arm of the search. Not partial: it reserves
-- nothing. drizzle-kit wrote the statement; `IF NOT EXISTS` was added by
-- hand, as 0027's was.
CREATE INDEX IF NOT EXISTS "spells_unaccent_trgm" ON "spells" USING gin (unaccent_immutable("title") gin_trgm_ops,unaccent_immutable("intent") gin_trgm_ops);
