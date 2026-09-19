-- MB.40, story 57: a spell may call for something the workspace will never
-- stock. A layer in `spell_ingredients` is now either an ingredient the
-- workspace knows (`ingredient_id`) or a name written for this one jar
-- (`name`, with an optional free-text `form`) — exactly one of the two, which
-- is what the `num_nonnulls` CHECK holds and what makes `ingredient_id` safe to
-- leave nullable. DESIGN.md §5 and claude-docs/design-decisions/
-- mb.40-custom-spell-ingredients.md carry the argument; this file carries the
-- order.
--
-- `drizzle-kit generate` wrote these statements contract-first. They are
-- reordered by hand — safe, because `db:generate` diffs the `meta/` snapshot
-- rather than the SQL — so that every guarantee is taken over by its
-- replacement before the thing that used to hold it goes:
--
--   1. expand: the two columns, the two partial unique indexes, the four
--      checks. Nothing here can fail against the rows M10.2's shape allows.
--   2. contract: the `(spell_id, ingredient_id)` primary key, which a custom
--      row cannot satisfy, is replaced by `(spell_id, layer_order)`; the
--      "one ingredient per jar" it used to give is already held by the partial
--      index created in step 1. The primary key must go before `DROP NOT NULL`
--      — a key column cannot be made nullable — and the old layer index goes
--      last, once the new key's own index covers the same two columns.
--
-- `drizzle-kit migrate` applies the file in one transaction, so no reader ever
-- sees a state between the two halves; the order documents intent rather than
-- guarding a window. The table is empty and nothing queries it until Wave 13,
-- which is why this reshaping is a contract migration against zero rows.
--
-- Rule 10: `DROP CONSTRAINT` and `DROP INDEX` are destructive DDL, and the PR
-- carries the acknowledgement line. `DROP NOT NULL` widens and is exempt.

-- expand
ALTER TABLE "spell_ingredients" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "spell_ingredients" ADD COLUMN "form" text;--> statement-breakpoint
CREATE UNIQUE INDEX "spell_ingredients_spell_id_ingredient_id_unique" ON "spell_ingredients" USING btree ("spell_id","ingredient_id") WHERE "spell_ingredients"."ingredient_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "spell_ingredients_spell_id_custom_name_unique" ON "spell_ingredients" USING btree ("spell_id",lower("name")) WHERE "spell_ingredients"."ingredient_id" is null;--> statement-breakpoint
ALTER TABLE "spell_ingredients" ADD CONSTRAINT "spell_ingredients_ingredient_or_name" CHECK (num_nonnulls(ingredient_id, name) = 1);--> statement-breakpoint
ALTER TABLE "spell_ingredients" ADD CONSTRAINT "spell_ingredients_form_only_on_custom" CHECK (ingredient_id is null or form is null);--> statement-breakpoint
ALTER TABLE "spell_ingredients" ADD CONSTRAINT "spell_ingredients_name_not_blank" CHECK (name is null or btrim(name) <> '');--> statement-breakpoint
ALTER TABLE "spell_ingredients" ADD CONSTRAINT "spell_ingredients_form_not_blank" CHECK (form is null or btrim(form) <> '');--> statement-breakpoint
-- contract
ALTER TABLE "spell_ingredients" DROP CONSTRAINT "spell_ingredients_spell_id_ingredient_id_pk";--> statement-breakpoint
ALTER TABLE "spell_ingredients" ADD CONSTRAINT "spell_ingredients_spell_id_layer_order_pk" PRIMARY KEY("spell_id","layer_order");--> statement-breakpoint
ALTER TABLE "spell_ingredients" ALTER COLUMN "ingredient_id" DROP NOT NULL;--> statement-breakpoint
DROP INDEX "spell_ingredients_spell_id_layer_order_unique";
