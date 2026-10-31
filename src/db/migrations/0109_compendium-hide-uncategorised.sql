-- Hides every live compendium entry that names no category, on the entry or on any of its forms, so a database the seed already
-- filled matches what the seed now does for a new entry (claude-docs/db/compendium-seed/README.md, "Shown or hidden"). It runs once,
-- here, because nobody can have chosen Show or Hide yet: the flag arrived in 0108 with every row shown. A coven's own entry and a
-- removed entry are left alone. `updated_by` is not written, so a curator's edit still reads as theirs to the seed's update check;
-- `set_updated_at` and `bump_revision` fire as for any update. A SQL migration cannot revalidate the unstable_cache "compendium" tag;
-- the deploy that runs it starts a fresh cache.
UPDATE "ingredients" i SET "shown" = false WHERE i."workspace_id" IS NULL AND i."deleted_at" IS NULL AND i."shown" AND NOT EXISTS (SELECT 1 FROM "ingredient_categories" c WHERE c."ingredient_id" = i."id");
