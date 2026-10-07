-- MB.165, a table task: the curated row a member picked, recorded beside the
-- text it names. `ingredients.form_id` for the form, and `ingredient_deities`
-- for the deities, since a link cannot live in `ingredients.deities text[]`.
-- The text stays, and stays identity. Nothing reads or writes either until
-- MB.167; MB.166 fills the table from the list (DESIGN.md §5,
-- `ingredient_deities`; claude-docs/design-decisions/mb.165-record-the-picked-vocabulary-row.md).
CREATE TABLE "ingredient_deities" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"ingredient_id" uuid NOT NULL,
	"deity_id" uuid,
	"name" text NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" uuid,
	CONSTRAINT "ingredient_deities_name_not_blank" CHECK (btrim(name) <> '')
);
--> statement-breakpoint
ALTER TABLE "ingredients" ADD COLUMN "form_id" uuid;--> statement-breakpoint
ALTER TABLE "ingredient_deities" ADD CONSTRAINT "ingredient_deities_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredient_deities" ADD CONSTRAINT "ingredient_deities_deity_id_deities_id_fk" FOREIGN KEY ("deity_id") REFERENCES "public"."deities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredient_deities" ADD CONSTRAINT "ingredient_deities_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredient_deities" ADD CONSTRAINT "ingredient_deities_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredient_deities" ADD CONSTRAINT "ingredient_deities_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ingredient_deities_position_unique" ON "ingredient_deities" USING btree ("ingredient_id","position") WHERE "ingredient_deities"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "ingredient_deities_link_unique" ON "ingredient_deities" USING btree ("ingredient_id","deity_id") WHERE "ingredient_deities"."deity_id" is not null and "ingredient_deities"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "ingredient_deities_name_unique" ON "ingredient_deities" USING btree ("ingredient_id",lower("name")) WHERE "ingredient_deities"."deity_id" is null and "ingredient_deities"."deleted_at" is null;--> statement-breakpoint
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_form_id_ingredient_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."ingredient_forms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_form_id_has_form" CHECK (form_id is null or form is not null);--> statement-breakpoint
-- Rule 3: a new audited table attaches its own `set_updated_at` trigger (M1.18).
CREATE OR REPLACE TRIGGER set_updated_at BEFORE UPDATE ON "ingredient_deities" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
