ALTER TABLE "references" ADD COLUMN "seed_key" text;--> statement-breakpoint
ALTER TABLE "planets" ADD COLUMN "seed_key" text;--> statement-breakpoint
ALTER TABLE "zodiac_signs" ADD COLUMN "seed_key" text;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "seed_key" text;--> statement-breakpoint
ALTER TABLE "category_groups" ADD COLUMN "seed_key" text;--> statement-breakpoint
ALTER TABLE "deities" ADD COLUMN "seed_key" text;--> statement-breakpoint
ALTER TABLE "deity_traditions" ADD COLUMN "seed_key" text;--> statement-breakpoint
ALTER TABLE "ingredient_form_groups" ADD COLUMN "seed_key" text;--> statement-breakpoint
ALTER TABLE "ingredient_forms" ADD COLUMN "seed_key" text;--> statement-breakpoint
CREATE UNIQUE INDEX "references_seed_key_unique" ON "references" USING btree ("seed_key") WHERE "references"."seed_key" is not null and "references"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "planets_seed_key_unique" ON "planets" USING btree ("seed_key") WHERE "planets"."seed_key" is not null and "planets"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "zodiac_signs_seed_key_unique" ON "zodiac_signs" USING btree ("seed_key") WHERE "zodiac_signs"."seed_key" is not null and "zodiac_signs"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "categories_seed_key_unique" ON "categories" USING btree ("seed_key") WHERE "categories"."seed_key" is not null and "categories"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "category_groups_seed_key_unique" ON "category_groups" USING btree ("seed_key") WHERE "category_groups"."seed_key" is not null and "category_groups"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "deities_seed_key_unique" ON "deities" USING btree ("seed_key") WHERE "deities"."seed_key" is not null and "deities"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "deity_traditions_seed_key_unique" ON "deity_traditions" USING btree ("seed_key") WHERE "deity_traditions"."seed_key" is not null and "deity_traditions"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "ingredient_form_groups_seed_key_unique" ON "ingredient_form_groups" USING btree ("seed_key") WHERE "ingredient_form_groups"."seed_key" is not null and "ingredient_form_groups"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "ingredient_forms_seed_key_unique" ON "ingredient_forms" USING btree ("seed_key") WHERE "ingredient_forms"."seed_key" is not null and "ingredient_forms"."deleted_at" is null;--> statement-breakpoint
-- The backfill (MB.171): a row the bootstrap user created is a seeded row,
-- keyed by its slug, which is still the one the seed gave it since no rename
-- writer had shipped. `references` holds no seeded row yet.
UPDATE "category_groups" SET "seed_key" = "slug" WHERE "created_by" = '00000000-0000-0000-0000-000000000001';--> statement-breakpoint
UPDATE "categories" SET "seed_key" = "slug" WHERE "created_by" = '00000000-0000-0000-0000-000000000001';--> statement-breakpoint
UPDATE "ingredient_form_groups" SET "seed_key" = "slug" WHERE "created_by" = '00000000-0000-0000-0000-000000000001';--> statement-breakpoint
UPDATE "ingredient_forms" SET "seed_key" = "slug" WHERE "created_by" = '00000000-0000-0000-0000-000000000001';--> statement-breakpoint
UPDATE "planets" SET "seed_key" = "slug" WHERE "created_by" = '00000000-0000-0000-0000-000000000001';--> statement-breakpoint
UPDATE "zodiac_signs" SET "seed_key" = "slug" WHERE "created_by" = '00000000-0000-0000-0000-000000000001';--> statement-breakpoint
UPDATE "deity_traditions" SET "seed_key" = "slug" WHERE "created_by" = '00000000-0000-0000-0000-000000000001';--> statement-breakpoint
UPDATE "deities" SET "seed_key" = "slug" WHERE "created_by" = '00000000-0000-0000-0000-000000000001';
