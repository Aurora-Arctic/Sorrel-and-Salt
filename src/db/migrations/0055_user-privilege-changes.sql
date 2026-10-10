-- MB.194: `user_privilege_changes`, the one privilege ledger, one row per
-- change to a privilege column on `users`, which MB.58's `admin_role_changes`
-- and MB.193's `workspace_creation_changes` fold into
-- (claude-docs/design-decisions/mb.194-privilege-ledger-by-trigger.md). Only
-- adds: the copy at the end writes rows and drops nothing, and the two old
-- ledgers go in MB.197.
CREATE TYPE "public"."user_privilege" AS ENUM('admin', 'create_workspace');--> statement-breakpoint
CREATE TYPE "public"."user_privilege_change" AS ENUM('grant', 'revoke');--> statement-breakpoint
CREATE TYPE "public"."user_privilege_route" AS ENUM('bootstrap', 'admin', 'invitation', 'manual');--> statement-breakpoint
CREATE TABLE "user_privilege_changes" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"privilege" "user_privilege" NOT NULL,
	"change" "user_privilege_change" NOT NULL,
	"via" "user_privilege_route" NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" uuid
);
--> statement-breakpoint
ALTER TABLE "user_privilege_changes" ADD CONSTRAINT "user_privilege_changes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_privilege_changes" ADD CONSTRAINT "user_privilege_changes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_privilege_changes" ADD CONSTRAINT "user_privilege_changes_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_privilege_changes" ADD CONSTRAINT "user_privilege_changes_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Rule 3: a new audited table attaches its own `set_updated_at` trigger, since
-- nothing attaches one for it (claude-docs/db/updated-at.md). It never fires
-- here, `forbid_rewrite` refusing every update first, and is attached anyway
-- so that every audited table carries it.
CREATE OR REPLACE TRIGGER set_updated_at BEFORE UPDATE ON "user_privilege_changes" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
-- Append-only by the database rather than by the writer's types, so it holds
-- against `psql` and the seed as well as the repository. A trigger, not a
-- REVOKE: `sorrel` owns its tables, and an owner's grant does not bind it.
-- One function for every append-only ledger, as `set_updated_at` is one for
-- every audited table. TRUNCATE is left open, for the test harness's resets.
CREATE OR REPLACE FUNCTION forbid_rewrite() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
	RAISE EXCEPTION '% is append-only: % refused', TG_TABLE_NAME, TG_OP;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE TRIGGER forbid_rewrite BEFORE UPDATE OR DELETE ON "user_privilege_changes" FOR EACH ROW EXECUTE FUNCTION forbid_rewrite();--> statement-breakpoint
-- Both old ledgers copied with their ids and stamps, so MB.197's final sweep
-- can skip with ON CONFLICT (id) what is already here. `admin_role_changes`
-- is the `admin` privilege: `bootstrap` a grant by that route, `grant` and
-- `revoke` an admin's act. `workspace_creation_changes` is
-- `create_workspace`: `revoke` a revoke, every other change a grant, by
-- invitation for `invitation` and by an admin for the rest (`admin` being
-- made admin while the flag was off, MB.177).
INSERT INTO "user_privilege_changes" ("id", "user_id", "privilege", "change", "via", "note", "created_at", "created_by", "updated_at", "updated_by", "deleted_at", "deleted_by")
SELECT "id", "user_id", 'admin'::"user_privilege",
	(CASE "change" WHEN 'revoke' THEN 'revoke' ELSE 'grant' END)::"user_privilege_change",
	(CASE "change" WHEN 'bootstrap' THEN 'bootstrap' ELSE 'admin' END)::"user_privilege_route",
	"note", "created_at", "created_by", "updated_at", "updated_by", "deleted_at", "deleted_by"
FROM "admin_role_changes"
UNION ALL
SELECT "id", "user_id", 'create_workspace'::"user_privilege",
	(CASE "change" WHEN 'revoke' THEN 'revoke' ELSE 'grant' END)::"user_privilege_change",
	(CASE "change" WHEN 'invitation' THEN 'invitation' ELSE 'admin' END)::"user_privilege_route",
	NULL, "created_at", "created_by", "updated_at", "updated_by", "deleted_at", "deleted_by"
FROM "workspace_creation_changes";
