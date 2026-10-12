-- MB.216: `ingredient_variants`, one row per form of an ingredient, and
-- `ingredients.identity_key`, its identity on the formal name alone, beside
-- `canonical_key` until MB.223 drops that
-- (claude-docs/design-decisions/mb.215-ingredient-variants.md). Only adds:
-- 0062 fills the table and creates the identity-key indexes.
CREATE TABLE "ingredient_variants" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"ingredient_id" uuid NOT NULL,
	"form" text NOT NULL,
	"form_id" uuid,
	"description" text,
	"safety_notes" text,
	"elements" "ingredient_element"[],
	"planets" text[],
	"zodiac_signs" text[],
	"colors" text[],
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" uuid,
	CONSTRAINT "ingredient_variants_form_not_blank" CHECK (btrim(form) <> '')
);
--> statement-breakpoint
ALTER TABLE "ingredients" ADD COLUMN "identity_key" text GENERATED ALWAYS AS (lower(coalesce(canonical_name, name))) STORED NOT NULL;--> statement-breakpoint
ALTER TABLE "ingredient_variants" ADD CONSTRAINT "ingredient_variants_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredient_variants" ADD CONSTRAINT "ingredient_variants_form_id_ingredient_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."ingredient_forms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredient_variants" ADD CONSTRAINT "ingredient_variants_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredient_variants" ADD CONSTRAINT "ingredient_variants_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredient_variants" ADD CONSTRAINT "ingredient_variants_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ingredient_variants_form_unique" ON "ingredient_variants" USING btree ("ingredient_id",lower(btrim("form"))) WHERE "ingredient_variants"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "ingredient_variants_id_ingredient_id_unique" ON "ingredient_variants" USING btree ("id","ingredient_id");--> statement-breakpoint
CREATE INDEX "ingredient_variants_form_id_idx" ON "ingredient_variants" USING btree ("form_id") WHERE "ingredient_variants"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "ingredient_variants_unaccent_trgm" ON "ingredient_variants" USING gin (unaccent_immutable("form") gin_trgm_ops,unaccent_immutable("description") gin_trgm_ops);--> statement-breakpoint
-- Rule 3: a new audited table attaches its own `set_updated_at` trigger, since
-- nothing attaches one for it (claude-docs/db/updated-at.md).
CREATE OR REPLACE TRIGGER set_updated_at BEFORE UPDATE ON "ingredient_variants" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
