-- M13.9, the contract half of rule 10 for M13.1's renames and the step note's
-- retirement: the `spell_ingredients` view, `spell_steps.layer_order` with its
-- unique index, `spell_steps.note` and `spells.instructions` are dropped. It
-- ships in the same release as M13.1 and PR #1308 (the owner's call, 2026-10-29:
-- the site has no real users yet, so the old deploy's few minutes of errors while
-- this runs harm no one).
--
-- `position` is refilled from `layer_order` first, on every step where the two
-- differ, not only where `position` is null: the deploy before M13.1 kept
-- writing `layer_order` alone, a reorder included. The refill goes through a
-- negative scratch value because `spell_steps_spell_id_position_unique` is
-- checked per row, and a swap would clash with a step not yet written.
-- `spells.instructions` is not copied into `spells.note`: nothing in
-- production writes spells, so `note` has been the only live column since M13.1.
UPDATE "spell_steps" SET "position" = -"layer_order" WHERE "position" IS DISTINCT FROM "layer_order";--> statement-breakpoint
UPDATE "spell_steps" SET "position" = "layer_order" WHERE "position" < 0;--> statement-breakpoint
ALTER TABLE "spell_steps" ALTER COLUMN "position" SET NOT NULL;--> statement-breakpoint
DROP VIEW "spell_ingredients";--> statement-breakpoint
DROP INDEX "spell_steps_spell_id_layer_order_unique";--> statement-breakpoint
ALTER TABLE "spell_steps" DROP COLUMN "layer_order";--> statement-breakpoint
ALTER TABLE "spell_steps" DROP COLUMN "note";--> statement-breakpoint
ALTER TABLE "spells" DROP COLUMN "instructions";
