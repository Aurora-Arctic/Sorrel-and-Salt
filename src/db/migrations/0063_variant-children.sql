-- MB.217: a variant beneath stock, spell layers, category pairs, substitutes
-- and references, each held to its own ingredient by a composite key on
-- `(variant_id, ingredient_id)` (claude-docs/design-decisions/mb.215-ingredient-variants.md).
-- The indexes and constraints it drops are re-created below in the same
-- transaction, wider or keyed on the variant: the sidecar says why each is
-- safe in one PR.
ALTER TABLE "ingredient_substitutes" DROP CONSTRAINT "ingredient_substitutes_not_itself";--> statement-breakpoint
ALTER TABLE "reference_links" DROP CONSTRAINT "reference_links_one_row";--> statement-breakpoint
DROP INDEX "spell_ingredients_spell_id_ingredient_id_unique";--> statement-breakpoint
DROP INDEX "inventory_items_workspace_id_ingredient_id_unique";--> statement-breakpoint
DROP INDEX "ingredient_substitutes_link_unique";--> statement-breakpoint
DROP INDEX "ingredient_substitutes_name_unique";--> statement-breakpoint
ALTER TABLE "ingredient_categories" DROP CONSTRAINT "ingredient_categories_ingredient_id_category_id_pk";--> statement-breakpoint
ALTER TABLE "spell_ingredients" ADD COLUMN "variant_id" uuid;--> statement-breakpoint
ALTER TABLE "ingredient_categories" ADD COLUMN "variant_id" uuid;--> statement-breakpoint
ALTER TABLE "ingredient_substitutes" ADD COLUMN "variant_id" uuid;--> statement-breakpoint
ALTER TABLE "ingredient_substitutes" ADD COLUMN "substitute_variant_id" uuid;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "variant_id" uuid NOT NULL;--> statement-breakpoint
-- The guard: a linked layer, removed or not, fills from its ingredient's one
-- live variant, which 0062 gave every ingredient with a form, a deleted one
-- included. A layer whose ingredient has none or several cannot be filled
-- without a guess, so the migration refuses and the pre-flight query in
-- MB.217's entry finds it first.
DO $$
DECLARE
	unfillable integer;
BEGIN
	SELECT count(*) INTO unfillable FROM "spell_ingredients" "si"
	WHERE "si"."ingredient_id" IS NOT NULL
		AND (
			SELECT count(*) FROM "ingredient_variants" "v"
			WHERE "v"."ingredient_id" = "si"."ingredient_id" AND "v"."deleted_at" IS NULL
		) <> 1;
	IF unfillable > 0 THEN
		RAISE EXCEPTION 'MB.217: % linked spell layer(s) name an ingredient without exactly one live variant', unfillable
			USING HINT = 'Give each such ingredient one form, or merge its forms, before migrating: the pre-flight query is in MB.217''s entry.';
	END IF;
END
$$;--> statement-breakpoint
-- The fill: each linked layer names its ingredient's one live variant, before
-- the CHECK below requires one.
UPDATE "spell_ingredients" "si" SET "variant_id" = "v"."id"
FROM "ingredient_variants" "v"
WHERE "v"."ingredient_id" = "si"."ingredient_id" AND "v"."deleted_at" IS NULL;--> statement-breakpoint
ALTER TABLE "reference_links" ADD COLUMN "ingredient_variant_id" uuid;--> statement-breakpoint
ALTER TABLE "spell_ingredients" ADD CONSTRAINT "spell_ingredients_variant_fk" FOREIGN KEY ("variant_id","ingredient_id") REFERENCES "public"."ingredient_variants"("id","ingredient_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredient_categories" ADD CONSTRAINT "ingredient_categories_variant_fk" FOREIGN KEY ("variant_id","ingredient_id") REFERENCES "public"."ingredient_variants"("id","ingredient_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredient_substitutes" ADD CONSTRAINT "ingredient_substitutes_variant_fk" FOREIGN KEY ("variant_id","ingredient_id") REFERENCES "public"."ingredient_variants"("id","ingredient_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredient_substitutes" ADD CONSTRAINT "ingredient_substitutes_substitute_variant_fk" FOREIGN KEY ("substitute_variant_id","substitute_id") REFERENCES "public"."ingredient_variants"("id","ingredient_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_variant_fk" FOREIGN KEY ("variant_id","ingredient_id") REFERENCES "public"."ingredient_variants"("id","ingredient_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reference_links" ADD CONSTRAINT "reference_links_ingredient_variant_id_ingredient_variants_id_fk" FOREIGN KEY ("ingredient_variant_id") REFERENCES "public"."ingredient_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "spell_ingredients_spell_id_variant_id_unique" ON "spell_ingredients" USING btree ("spell_id","variant_id") WHERE "spell_ingredients"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "ingredient_categories_ingredient_category_unique" ON "ingredient_categories" USING btree ("ingredient_id","category_id") WHERE "ingredient_categories"."variant_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "ingredient_categories_variant_category_unique" ON "ingredient_categories" USING btree ("variant_id","category_id") WHERE "ingredient_categories"."variant_id" is not null;--> statement-breakpoint
CREATE INDEX "ingredient_substitutes_variant_id" ON "ingredient_substitutes" USING btree ("variant_id") WHERE "ingredient_substitutes"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "ingredient_substitutes_variant_link_unique" ON "ingredient_substitutes" USING btree ("variant_id","substitute_id") WHERE "ingredient_substitutes"."substitute_id" is not null and "ingredient_substitutes"."variant_id" is not null and "ingredient_substitutes"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "ingredient_substitutes_variant_name_unique" ON "ingredient_substitutes" USING btree ("variant_id",lower("name")) WHERE "ingredient_substitutes"."name" is not null and "ingredient_substitutes"."variant_id" is not null and "ingredient_substitutes"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_items_workspace_id_variant_id_unique" ON "inventory_items" USING btree ("workspace_id","variant_id") WHERE "inventory_items"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "reference_links_ingredient_variant_unique" ON "reference_links" USING btree ("ingredient_variant_id","reference_id") WHERE "reference_links"."ingredient_variant_id" is not null and "reference_links"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "ingredient_substitutes_link_unique" ON "ingredient_substitutes" USING btree ("ingredient_id","substitute_id") WHERE "ingredient_substitutes"."substitute_id" is not null and "ingredient_substitutes"."variant_id" is null and "ingredient_substitutes"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "ingredient_substitutes_name_unique" ON "ingredient_substitutes" USING btree ("ingredient_id",lower("name")) WHERE "ingredient_substitutes"."name" is not null and "ingredient_substitutes"."variant_id" is null and "ingredient_substitutes"."deleted_at" is null;--> statement-breakpoint
ALTER TABLE "spell_ingredients" ADD CONSTRAINT "spell_ingredients_variant_with_ingredient" CHECK ((ingredient_id is null) = (variant_id is null));--> statement-breakpoint
ALTER TABLE "ingredient_substitutes" ADD CONSTRAINT "ingredient_substitutes_substitute_variant_has_link" CHECK (substitute_variant_id is null or substitute_id is not null);--> statement-breakpoint
ALTER TABLE "ingredient_substitutes" ADD CONSTRAINT "ingredient_substitutes_not_itself" CHECK (not (substitute_id = ingredient_id and substitute_variant_id is not distinct from variant_id));--> statement-breakpoint
ALTER TABLE "reference_links" ADD CONSTRAINT "reference_links_one_row" CHECK (num_nonnulls(ingredient_id, deity_id, deity_tradition_id, planet_id, zodiac_sign_id, ingredient_variant_id) = 1);