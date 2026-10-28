-- `spell_steps.note` is retired: `body` is the one text on a step. Each live
-- step's note is copied into its body (after the body, a blank line between).
-- The column and its values stay until M13.9 drops them. The amount CHECK no
-- longer names `note`, so a later drop of the column does not touch it.
UPDATE "spell_steps" SET "body" = CASE WHEN "body" IS NULL THEN "note" WHEN "note" IS NULL THEN "body" ELSE "body" || E'\n\n' || "note" END WHERE "note" IS NOT NULL AND "deleted_at" IS NULL;--> statement-breakpoint
ALTER TABLE "spell_steps" DROP CONSTRAINT "spell_steps_amount_on_ingredient";--> statement-breakpoint
ALTER TABLE "spell_steps" ADD CONSTRAINT "spell_steps_amount_on_ingredient" CHECK ((ingredient_id is not null or name is not null) or (quantity is null and unit is null));
