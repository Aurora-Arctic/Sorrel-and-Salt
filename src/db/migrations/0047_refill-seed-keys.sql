-- The refill (MB.172): a row the reference seeds wrote after 0045_seed-keys
-- deployed and before the seeds keyed their own rows carries no key. Only
-- unkeyed rows are touched, so a row keyed at insert keeps the key it was
-- given, whatever it is called now.
UPDATE "category_groups" SET "seed_key" = "slug" WHERE "created_by" = '00000000-0000-0000-0000-000000000001' AND "seed_key" IS NULL;--> statement-breakpoint
UPDATE "categories" SET "seed_key" = "slug" WHERE "created_by" = '00000000-0000-0000-0000-000000000001' AND "seed_key" IS NULL;--> statement-breakpoint
UPDATE "ingredient_form_groups" SET "seed_key" = "slug" WHERE "created_by" = '00000000-0000-0000-0000-000000000001' AND "seed_key" IS NULL;--> statement-breakpoint
UPDATE "ingredient_forms" SET "seed_key" = "slug" WHERE "created_by" = '00000000-0000-0000-0000-000000000001' AND "seed_key" IS NULL;--> statement-breakpoint
UPDATE "planets" SET "seed_key" = "slug" WHERE "created_by" = '00000000-0000-0000-0000-000000000001' AND "seed_key" IS NULL;--> statement-breakpoint
UPDATE "zodiac_signs" SET "seed_key" = "slug" WHERE "created_by" = '00000000-0000-0000-0000-000000000001' AND "seed_key" IS NULL;--> statement-breakpoint
UPDATE "deity_traditions" SET "seed_key" = "slug" WHERE "created_by" = '00000000-0000-0000-0000-000000000001' AND "seed_key" IS NULL;--> statement-breakpoint
UPDATE "deities" SET "seed_key" = "slug" WHERE "created_by" = '00000000-0000-0000-0000-000000000001' AND "seed_key" IS NULL;
