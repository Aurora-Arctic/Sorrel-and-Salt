-- MB.216: one variant per form an ingredient carries today, then the
-- identity-key indexes, which hold an ingredient's formal name once per tier
-- whatever its form (claude-docs/design-decisions/mb.215-ingredient-variants.md).
--
-- The fill: each row with a form gets a variant of that form and its curated
-- pick, stamped as the row's last editor, a soft-deleted row's included so that
-- a restored entry keeps its form. The correspondences stay on the ingredient:
-- a variant adds to its ingredient and never overrides it, so a row's one form
-- already shares everything the row holds.
INSERT INTO "ingredient_variants" ("ingredient_id", "form", "form_id", "created_by", "updated_by")
SELECT "id", btrim("form"), "form_id", "updated_by", "updated_by"
FROM "ingredients"
WHERE "form" IS NOT NULL AND btrim("form") <> '';--> statement-breakpoint
-- The guard: two live entries of one formal name in one tier, differing only
-- by form, are one ingredient with two forms, and the indexes below would
-- refuse them. Merging them is a curator's call that no data here has needed,
-- so the migration refuses and names the procedure rather than guessing. Run
-- the pre-flight query MB.216's entry names before deploying.
DO $$
DECLARE
	clashing integer;
BEGIN
	SELECT count(*) INTO clashing FROM (
		SELECT 1 FROM "ingredients"
		WHERE "deleted_at" IS NULL
		GROUP BY "workspace_id", "identity_key"
		HAVING count(*) > 1
	) AS "groups";
	IF clashing > 0 THEN
		RAISE EXCEPTION 'MB.216: % group(s) of live ingredients share a formal name in one tier', clashing
			USING HINT = 'Merge each group into one entry before migrating: "Merging a group" in claude-docs/design-decisions/mb.215-ingredient-variants.md.';
	END IF;
END
$$;--> statement-breakpoint
CREATE UNIQUE INDEX "ingredients_compendium_identity_key_unique" ON "ingredients" USING btree ("identity_key") WHERE "ingredients"."workspace_id" is null and "ingredients"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "ingredients_workspace_identity_key_unique" ON "ingredients" USING btree ("workspace_id","identity_key") WHERE "ingredients"."workspace_id" is not null and "ingredients"."deleted_at" is null;