CREATE TABLE "workspace_compendium_entries" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"ingredient_id" uuid NOT NULL,
	"label" text,
	"description" text,
	"safety_notes" text,
	"elements" "ingredient_element"[],
	"celestial_bodies" text[],
	"zodiac_signs" text[],
	"colors" text[],
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" uuid
);
--> statement-breakpoint
ALTER TABLE "workspace_compendium_entries" ADD CONSTRAINT "workspace_compendium_entries_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_compendium_entries" ADD CONSTRAINT "workspace_compendium_entries_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_compendium_entries" ADD CONSTRAINT "workspace_compendium_entries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_compendium_entries" ADD CONSTRAINT "workspace_compendium_entries_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_compendium_entries" ADD CONSTRAINT "workspace_compendium_entries_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_compendium_entries_workspace_ingredient_unique" ON "workspace_compendium_entries" USING btree ("workspace_id","ingredient_id") WHERE "workspace_compendium_entries"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_compendium_entries_workspace_label_unique" ON "workspace_compendium_entries" USING btree ("workspace_id",lower("label")) WHERE "workspace_compendium_entries"."label" is not null and "workspace_compendium_entries"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "workspace_compendium_entries_ingredient_id_idx" ON "workspace_compendium_entries" USING btree ("ingredient_id");--> statement-breakpoint
CREATE INDEX "workspace_compendium_entries_label_unaccent_trgm" ON "workspace_compendium_entries" USING gin (unaccent_immutable("label") gin_trgm_ops);
--> statement-breakpoint
-- Rule 3: a new audited table attaches its own `set_updated_at` trigger, since
-- `sorrel` may not create the event trigger that would (claude-docs/db/updated-at.md).
CREATE OR REPLACE TRIGGER set_updated_at BEFORE UPDATE ON "workspace_compendium_entries" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
