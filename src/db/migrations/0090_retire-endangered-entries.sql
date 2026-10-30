-- M14.30: retires the four compendium entries M14.29 ruled out as endangered
-- (Aquilaria malaccensis, Pterocarpus santalinus, Nardostachys jatamansi and
-- Liquidambar orientalis) from every database the seed already filled. The seed
-- never deletes a row whose file is gone, so deleting the files was not enough.
-- Matched by seed key, which is the lower-cased formal name, never by the name
-- an editor may have changed. Only a live compendium row is touched, so a row
-- already retired keeps its own stamp and a second run changes nothing.
--
-- Owner decision B (2026-10-29): the entry is retired as the curator Delete
-- retires it, and so is every form (variant) that no coven's stock row or spell
-- layer names, with the reference links and typed substitutes that form owns.
-- A form a coven holds stays live, so its jars keep showing under M12.24's
-- "No Longer in the Compendium". Folk names, deities and the entry's own links
-- and substitutes belong to the entry, not a form, and stay as the curator
-- Delete leaves them. The forms and their children go first: once the entry
-- carries its tombstone, the entry filter below no longer finds it.
-- A SQL migration cannot revalidate the unstable_cache "compendium" tag; the
-- deploy that runs it starts a fresh cache.
UPDATE "reference_links" SET "deleted_at" = now(), "deleted_by" = '00000000-0000-0000-0000-000000000001', "updated_by" = '00000000-0000-0000-0000-000000000001' WHERE "deleted_at" IS NULL AND "ingredient_variant_id" IN (SELECT v."id" FROM "ingredient_variants" v JOIN "ingredients" i ON i."id" = v."ingredient_id" WHERE i."workspace_id" IS NULL AND i."deleted_at" IS NULL AND i."seed_key" IN ('aquilaria malaccensis', 'pterocarpus santalinus', 'nardostachys jatamansi', 'liquidambar orientalis') AND v."deleted_at" IS NULL AND NOT EXISTS (SELECT 1 FROM "inventory_items" s WHERE s."variant_id" = v."id") AND NOT EXISTS (SELECT 1 FROM "spell_steps" t WHERE t."variant_id" = v."id"));
--> statement-breakpoint
UPDATE "ingredient_substitutes" SET "deleted_at" = now(), "deleted_by" = '00000000-0000-0000-0000-000000000001', "updated_by" = '00000000-0000-0000-0000-000000000001' WHERE "deleted_at" IS NULL AND "variant_id" IN (SELECT v."id" FROM "ingredient_variants" v JOIN "ingredients" i ON i."id" = v."ingredient_id" WHERE i."workspace_id" IS NULL AND i."deleted_at" IS NULL AND i."seed_key" IN ('aquilaria malaccensis', 'pterocarpus santalinus', 'nardostachys jatamansi', 'liquidambar orientalis') AND v."deleted_at" IS NULL AND NOT EXISTS (SELECT 1 FROM "inventory_items" s WHERE s."variant_id" = v."id") AND NOT EXISTS (SELECT 1 FROM "spell_steps" t WHERE t."variant_id" = v."id"));
--> statement-breakpoint
UPDATE "ingredient_variants" SET "deleted_at" = now(), "deleted_by" = '00000000-0000-0000-0000-000000000001', "updated_by" = '00000000-0000-0000-0000-000000000001' WHERE "id" IN (SELECT v."id" FROM "ingredient_variants" v JOIN "ingredients" i ON i."id" = v."ingredient_id" WHERE i."workspace_id" IS NULL AND i."deleted_at" IS NULL AND i."seed_key" IN ('aquilaria malaccensis', 'pterocarpus santalinus', 'nardostachys jatamansi', 'liquidambar orientalis') AND v."deleted_at" IS NULL AND NOT EXISTS (SELECT 1 FROM "inventory_items" s WHERE s."variant_id" = v."id") AND NOT EXISTS (SELECT 1 FROM "spell_steps" t WHERE t."variant_id" = v."id"));
--> statement-breakpoint
UPDATE "ingredients" SET "deleted_at" = now(), "deleted_by" = '00000000-0000-0000-0000-000000000001', "updated_by" = '00000000-0000-0000-0000-000000000001' WHERE "workspace_id" IS NULL AND "deleted_at" IS NULL AND "seed_key" IN ('aquilaria malaccensis', 'pterocarpus santalinus', 'nardostachys jatamansi', 'liquidambar orientalis');
