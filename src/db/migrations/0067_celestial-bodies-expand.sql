-- MB.252, rule 10's expand for the planet vocabulary's rename (MB.251): the
-- table becomes `celestial_bodies`, its indexes, CHECK and foreign keys take
-- the new name with it, and a view named `planets` over it serves the deploy
-- before this one, which still names the old table. A view rather than a
-- second table: the deploy before reads and writes the same rows through it,
-- prepared statements included, so nothing needs copying back. It blocks a
-- `DROP COLUMN` or `ALTER COLUMN TYPE` on the table until MB.254 drops it
-- (claude-docs/db/expand-contract.md, "Renaming a table").
ALTER TABLE "planets" RENAME TO "celestial_bodies";--> statement-breakpoint
ALTER INDEX "planets_seed_key_unique" RENAME TO "celestial_bodies_seed_key_unique";--> statement-breakpoint
ALTER INDEX "planets_slug_unique" RENAME TO "celestial_bodies_slug_unique";--> statement-breakpoint
ALTER INDEX "planets_trgm" RENAME TO "celestial_bodies_trgm";--> statement-breakpoint
ALTER TABLE "celestial_bodies" RENAME CONSTRAINT "planets_description_not_blank" TO "celestial_bodies_description_not_blank";--> statement-breakpoint
ALTER TABLE "celestial_bodies" RENAME CONSTRAINT "planets_created_by_users_id_fk" TO "celestial_bodies_created_by_users_id_fk";--> statement-breakpoint
ALTER TABLE "celestial_bodies" RENAME CONSTRAINT "planets_updated_by_users_id_fk" TO "celestial_bodies_updated_by_users_id_fk";--> statement-breakpoint
ALTER TABLE "celestial_bodies" RENAME CONSTRAINT "planets_deleted_by_users_id_fk" TO "celestial_bodies_deleted_by_users_id_fk";--> statement-breakpoint
ALTER TABLE "reference_links" RENAME CONSTRAINT "reference_links_planet_id_planets_id_fk" TO "reference_links_planet_id_celestial_bodies_id_fk";--> statement-breakpoint
CREATE VIEW "planets" AS SELECT * FROM "celestial_bodies";--> statement-breakpoint
-- The new columns, beside the old ones until MB.254 drops those. Nothing reads
-- or writes them until MB.253, whose migration fills them again for whatever
-- the deploy before wrote to the old ones in between.
ALTER TABLE "ingredients" ADD COLUMN "celestial_bodies" text[];--> statement-breakpoint
ALTER TABLE "ingredient_variants" ADD COLUMN "celestial_bodies" text[];--> statement-breakpoint
ALTER TABLE "reference_links" ADD COLUMN "celestial_body_id" uuid;--> statement-breakpoint
ALTER TABLE "reference_links" ADD CONSTRAINT "reference_links_celestial_body_id_celestial_bodies_id_fk" FOREIGN KEY ("celestial_body_id") REFERENCES "public"."celestial_bodies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "reference_links_celestial_body_unique" ON "reference_links" USING btree ("celestial_body_id","reference_id") WHERE "reference_links"."celestial_body_id" is not null and "reference_links"."deleted_at" is null;--> statement-breakpoint
-- Only a row holding a value is written, so `set_updated_at` touches no other.
UPDATE "ingredients" SET "celestial_bodies" = "planets" WHERE "planets" IS NOT NULL;--> statement-breakpoint
UPDATE "ingredient_variants" SET "celestial_bodies" = "planets" WHERE "planets" IS NOT NULL;--> statement-breakpoint
UPDATE "reference_links" SET "celestial_body_id" = "planet_id" WHERE "planet_id" IS NOT NULL;--> statement-breakpoint
-- A link names one sourced row, counting a body once whichever of its two
-- columns hold it: the deploy before, and the sources seed until MB.253,
-- write `planet_id` alone, and the fill leaves both set. MB.254 counts
-- `celestial_body_id` alone.
ALTER TABLE "reference_links" DROP CONSTRAINT "reference_links_one_row";--> statement-breakpoint
ALTER TABLE "reference_links" ADD CONSTRAINT "reference_links_one_row" CHECK (num_nonnulls(ingredient_id, deity_id, deity_tradition_id, coalesce(celestial_body_id, planet_id), zodiac_sign_id, ingredient_variant_id) = 1);
