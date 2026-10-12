-- MB.254, the contract half of rule 10: the old celestial body columns and
-- the `planets` view dropped, once a release carrying MB.253, which stopped
-- reading and writing them, has reached production
-- (claude-docs/db/expand-contract.md, "Renaming a table"). The drops and the
-- strict one-row CHECK are `generate`'s; the copy before them, and the
-- view's drop, are added by hand, since Drizzle does not track the view.
--
-- The links are copied once more, only adding, as 0039 copied its list: MB.253
-- never writes `planet_id`, so a link holding it alone was written by the
-- deploy before, and a removed one is copied too, since a link is only ever
-- removed whole. One such live link can repeat a live link MB.253 wrote for
-- the same body and reference, which the copy would make two under
-- `reference_links_celestial_body_unique`; it is removed first, as the app
-- removes a link, stamped by its own last editor, and the reference stays
-- linked by the other.
--
-- The lists get no last copy, as 0036 gave its single columns none: MB.253
-- edits the new lists and stores a cleared one as NULL, so an old list beside
-- a NULL new one may be a member's clear.
UPDATE "reference_links" AS "repeat"
SET "deleted_at" = now(), "deleted_by" = "repeat"."updated_by"
WHERE "repeat"."planet_id" IS NOT NULL AND "repeat"."celestial_body_id" IS NULL
  AND "repeat"."deleted_at" IS NULL
  AND EXISTS (
    SELECT 1 FROM "reference_links" AS "held"
    WHERE "held"."celestial_body_id" = "repeat"."planet_id"
      AND "held"."reference_id" = "repeat"."reference_id"
      AND "held"."deleted_at" IS NULL
  );--> statement-breakpoint
UPDATE "reference_links" SET "celestial_body_id" = "planet_id"
WHERE "planet_id" IS NOT NULL AND "celestial_body_id" IS NULL;--> statement-breakpoint
ALTER TABLE "reference_links" DROP CONSTRAINT "reference_links_one_row";--> statement-breakpoint
ALTER TABLE "reference_links" DROP CONSTRAINT "reference_links_planet_id_celestial_bodies_id_fk";
--> statement-breakpoint
DROP INDEX "reference_links_planet_unique";--> statement-breakpoint
ALTER TABLE "ingredient_variants" DROP COLUMN "planets";--> statement-breakpoint
ALTER TABLE "ingredients" DROP COLUMN "planets";--> statement-breakpoint
ALTER TABLE "reference_links" DROP COLUMN "planet_id";--> statement-breakpoint
DROP VIEW "planets";--> statement-breakpoint
ALTER TABLE "reference_links" ADD CONSTRAINT "reference_links_one_row" CHECK (num_nonnulls(ingredient_id, deity_id, deity_tradition_id, celestial_body_id, zodiac_sign_id, ingredient_variant_id) = 1);