CREATE TABLE "workspace_slugs" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" uuid
);
--> statement-breakpoint
ALTER TABLE "workspace_slugs" ADD CONSTRAINT "workspace_slugs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_slugs" ADD CONSTRAINT "workspace_slugs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_slugs" ADD CONSTRAINT "workspace_slugs_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_slugs" ADD CONSTRAINT "workspace_slugs_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_slugs_slug_unique" ON "workspace_slugs" USING btree ("slug") WHERE "workspace_slugs"."deleted_at" is null;--> statement-breakpoint
CREATE OR REPLACE TRIGGER set_updated_at BEFORE UPDATE ON "workspace_slugs" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
-- Hand-written from here: Drizzle cannot express a backfill. Each live coven gets one row for its current address, stamped with
-- the coven's creator. A coven that already holds its row is skipped, so running this twice adds nothing.
INSERT INTO "workspace_slugs" ("workspace_id", "slug", "created_by", "updated_by")
SELECT w."id", w."slug", w."created_by", w."created_by"
FROM "workspaces" w
WHERE w."deleted_at" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "workspace_slugs" s
    WHERE s."workspace_id" = w."id" AND s."slug" = w."slug" AND s."deleted_at" IS NULL
  );
