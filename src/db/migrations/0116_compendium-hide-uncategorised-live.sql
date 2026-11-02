-- Hides every live, shown compendium entry with no live category, once, over the rows a database already holds. A category
-- counts only as the public category filter counts it: the category and its group are both live, and the pair is filed on the
-- entry itself or on a live form. A form's pair outlives the form's soft delete, which is why a bare "has a pair" test is not
-- enough. A coven's own entry and a removed entry are left alone. Only a shown row is touched, so a second run changes nothing.
-- `updated_by` is not written, so a curator's edit still reads as theirs to the seed's update check; `set_updated_at` and
-- `bump_revision` fire as for any update. A SQL migration cannot revalidate the unstable_cache "compendium" tag; the deploy
-- that runs it starts a fresh cache.
UPDATE "ingredients" i SET "shown" = false WHERE i."workspace_id" IS NULL AND i."deleted_at" IS NULL AND i."shown" AND NOT EXISTS (SELECT 1 FROM "ingredient_categories" ic JOIN "categories" c ON c."id" = ic."category_id" AND c."deleted_at" IS NULL JOIN "category_groups" g ON g."id" = c."group_id" AND g."deleted_at" IS NULL LEFT JOIN "ingredient_variants" v ON v."id" = ic."variant_id" WHERE ic."ingredient_id" = i."id" AND (ic."variant_id" IS NULL OR v."deleted_at" IS NULL));
