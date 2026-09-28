CREATE TABLE "retired_ingredient_slugs" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"ingredient_id" uuid NOT NULL,
	"workspace_id" uuid,
	"slug" text NOT NULL,
	"retired_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp GENERATED ALWAYS AS (date_trunc('day', retired_at) + interval '180 days') STORED NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" uuid
);
--> statement-breakpoint
ALTER TABLE "ingredients" ADD COLUMN "slug" text;--> statement-breakpoint
ALTER TABLE "ingredients" ADD COLUMN "pending_slug" text;--> statement-breakpoint
ALTER TABLE "ingredients" ADD COLUMN "pending_slug_effective_at" timestamp;--> statement-breakpoint
-- Nullable on arrival, then required. No backfill here: a slug is `ingredientSlug`
-- from src/lib/slugify.ts, and a SQL copy of it would be a second slug rule. No
-- deployed code writes an ingredient yet, so the table is empty wherever this
-- runs against real data and the seed is the backfill; a local database the
-- seed has already filled refuses this line, and `npm run db:reset` rebuilds it
-- (0025_ingredient-slugs.ack.md).
ALTER TABLE "ingredients" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "retired_ingredient_slugs" ADD CONSTRAINT "retired_ingredient_slugs_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retired_ingredient_slugs" ADD CONSTRAINT "retired_ingredient_slugs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retired_ingredient_slugs" ADD CONSTRAINT "retired_ingredient_slugs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retired_ingredient_slugs" ADD CONSTRAINT "retired_ingredient_slugs_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retired_ingredient_slugs" ADD CONSTRAINT "retired_ingredient_slugs_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "retired_ingredient_slugs_slug_idx" ON "retired_ingredient_slugs" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "ingredients_compendium_slug_unique" ON "ingredients" USING btree ("slug") WHERE "ingredients"."workspace_id" is null and "ingredients"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "ingredients_workspace_slug_unique" ON "ingredients" USING btree ("workspace_id","slug") WHERE "ingredients"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "ingredients_compendium_pending_slug_unique" ON "ingredients" USING btree ("pending_slug") WHERE "ingredients"."workspace_id" is null and "ingredients"."deleted_at" is null and "ingredients"."pending_slug" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "ingredients_workspace_pending_slug_unique" ON "ingredients" USING btree ("workspace_id","pending_slug") WHERE "ingredients"."deleted_at" is null and "ingredients"."pending_slug" is not null;--> statement-breakpoint
-- Rule 3: a new audited table attaches its own `set_updated_at` trigger, since
-- nothing attaches one for it (claude-docs/db.md, "updated_at is the database's").
CREATE OR REPLACE TRIGGER set_updated_at BEFORE UPDATE ON "retired_ingredient_slugs" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
