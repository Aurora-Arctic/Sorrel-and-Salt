-- M13.1, rule 10's expand for a spell's recipe as one ordered list of steps,
-- each an instruction, an ingredient, or both (story 80). The table
-- `spell_ingredients` becomes `spell_steps`, its indexes, CHECKs and foreign
-- keys take the new name with it, and a view named `spell_ingredients` over it
-- serves the deploy before this one, which still names the old table. A view
-- rather than a second table: the deploy before reads and writes the same rows
-- through it, prepared statements included, so nothing needs copying back. It
-- blocks a `DROP COLUMN` or `ALTER COLUMN TYPE` on the table until M13.9 drops
-- it (claude-docs/db/expand-contract.md, "Renaming a table";
-- claude-docs/design-decisions/m13.1-spell-steps.md).
--
-- The `updated_at` trigger keeps its name, `set_updated_at`: a trigger's name
-- belongs to its table, carries no table prefix, and moves with a rename.
ALTER TABLE "spell_ingredients" RENAME TO "spell_steps";--> statement-breakpoint
ALTER INDEX "spell_ingredients_spell_id_layer_order_unique" RENAME TO "spell_steps_spell_id_layer_order_unique";--> statement-breakpoint
ALTER INDEX "spell_ingredients_spell_id_variant_id_unique" RENAME TO "spell_steps_spell_id_variant_id_unique";--> statement-breakpoint
ALTER INDEX "spell_ingredients_spell_id_custom_name_unique" RENAME TO "spell_steps_spell_id_custom_name_unique";--> statement-breakpoint
ALTER TABLE "spell_steps" RENAME CONSTRAINT "spell_ingredients_form_only_on_custom" TO "spell_steps_form_only_on_custom";--> statement-breakpoint
ALTER TABLE "spell_steps" RENAME CONSTRAINT "spell_ingredients_variant_with_ingredient" TO "spell_steps_variant_with_ingredient";--> statement-breakpoint
ALTER TABLE "spell_steps" RENAME CONSTRAINT "spell_ingredients_name_not_blank" TO "spell_steps_name_not_blank";--> statement-breakpoint
ALTER TABLE "spell_steps" RENAME CONSTRAINT "spell_ingredients_form_not_blank" TO "spell_steps_form_not_blank";--> statement-breakpoint
ALTER TABLE "spell_steps" RENAME CONSTRAINT "spell_ingredients_variant_fk" TO "spell_steps_variant_fk";--> statement-breakpoint
ALTER TABLE "spell_steps" RENAME CONSTRAINT "spell_ingredients_spell_id_spells_id_fk" TO "spell_steps_spell_id_spells_id_fk";--> statement-breakpoint
ALTER TABLE "spell_steps" RENAME CONSTRAINT "spell_ingredients_ingredient_id_ingredients_id_fk" TO "spell_steps_ingredient_id_ingredients_id_fk";--> statement-breakpoint
ALTER TABLE "spell_steps" RENAME CONSTRAINT "spell_ingredients_created_by_users_id_fk" TO "spell_steps_created_by_users_id_fk";--> statement-breakpoint
ALTER TABLE "spell_steps" RENAME CONSTRAINT "spell_ingredients_updated_by_users_id_fk" TO "spell_steps_updated_by_users_id_fk";--> statement-breakpoint
ALTER TABLE "spell_steps" RENAME CONSTRAINT "spell_ingredients_deleted_by_users_id_fk" TO "spell_steps_deleted_by_users_id_fk";--> statement-breakpoint
-- The new columns. `position` replaces `layer_order` in two steps, because
-- renaming a column breaks the deploy before (.claude/rules/database.md): it
-- is added beside it, filled from it, and written with it by the code until
-- M13.9 drops `layer_order`. Nullable until then, because the deploy before
-- writes `layer_order` alone and a `NOT NULL` `position` would refuse its
-- inserts. `body` is the step's instruction. `spells.note` replaces
-- `instructions` the same way `position` replaces `layer_order`.
ALTER TABLE "spell_steps" ADD COLUMN "position" integer;--> statement-breakpoint
ALTER TABLE "spell_steps" ADD COLUMN "body" text;--> statement-breakpoint
ALTER TABLE "spells" ADD COLUMN "note" text;--> statement-breakpoint
-- After the `ADD COLUMN`s, since `SELECT *` lists the columns the table has
-- when the view is made: a view made earlier would lack `position` and `body`.
CREATE VIEW "spell_ingredients" AS SELECT * FROM "spell_steps";--> statement-breakpoint
-- The fill. Every step holds a `layer_order`, so every step is written and
-- `set_updated_at` moves its `updated_at`; only a spell with instructions is
-- written.
--
-- A refill is needed before the contract. The deploy before writes through
-- the view between this migration and the new deploy's promotion, and after
-- any rollback to it, and it writes `layer_order` and `instructions` only: a
-- step it adds has a null `position`, a step it reorders keeps its old one,
-- and a spell it edits keeps its old `note`. M13.9 fills both again from the
-- old columns, wherever they differ, before it drops them, as 0068 did for
-- 0067.
UPDATE "spell_steps" SET "position" = "layer_order";--> statement-breakpoint
UPDATE "spells" SET "note" = "instructions" WHERE "instructions" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "spell_steps_spell_id_position_unique" ON "spell_steps" USING btree ("spell_id","position") WHERE "spell_steps"."deleted_at" is null;--> statement-breakpoint
-- The exactly-one CHECK becomes two: at most one identity (an ingredient or a
-- custom name), and never an empty step. A step may now be an instruction
-- alone, so "exactly one identity" no longer holds.
ALTER TABLE "spell_steps" DROP CONSTRAINT "spell_ingredients_ingredient_or_name";--> statement-breakpoint
ALTER TABLE "spell_steps" ADD CONSTRAINT "spell_steps_one_identity" CHECK (num_nonnulls(ingredient_id, name) <= 1);--> statement-breakpoint
ALTER TABLE "spell_steps" ADD CONSTRAINT "spell_steps_not_empty" CHECK (num_nonnulls(ingredient_id, name, body) >= 1);--> statement-breakpoint
ALTER TABLE "spell_steps" ADD CONSTRAINT "spell_steps_amount_on_ingredient" CHECK ((ingredient_id is not null or name is not null) or (quantity is null and unit is null and note is null));--> statement-breakpoint
ALTER TABLE "spell_steps" ADD CONSTRAINT "spell_steps_body_not_blank" CHECK (body is null or btrim(body) <> '');
