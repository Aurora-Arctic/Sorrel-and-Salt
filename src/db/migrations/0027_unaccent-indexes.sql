-- The folded twins of `ingredient_folk_names_trgm` and `ingredients_trgm`:
-- the compendium search's `unaccent_immutable($1) <% unaccent_immutable(name)` can reach a
-- trigram index only through an expression index over the same fold
-- (claude-docs/db.md, "The compendium read"). Beside the raw indexes, not in
-- their place — the fuzzy finders still match the raw columns. drizzle-kit
-- wrote the statements; `IF NOT EXISTS` was added by hand, as 0011's was.
CREATE INDEX IF NOT EXISTS "ingredient_folk_names_unaccent_trgm" ON "ingredient_folk_names" USING gin (unaccent_immutable("name") gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ingredients_unaccent_trgm" ON "ingredients" USING gin (unaccent_immutable("name") gin_trgm_ops,unaccent_immutable("canonical_name") gin_trgm_ops);
