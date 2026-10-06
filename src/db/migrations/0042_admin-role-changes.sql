-- MB.58: `admin_role_changes`, the ledger of who is an admin, one row per
-- change to `users.role` (claude-docs/design-decisions/m2.9-granting-admin.md,
-- "What the audit trail records"). Additive: the two data statements at the
-- end write rows and drop nothing.
CREATE TYPE "public"."admin_role_change" AS ENUM('bootstrap', 'grant', 'revoke');--> statement-breakpoint
CREATE TABLE "admin_role_changes" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"change" "admin_role_change" NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" uuid
);
--> statement-breakpoint
ALTER TABLE "admin_role_changes" ADD CONSTRAINT "admin_role_changes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_role_changes" ADD CONSTRAINT "admin_role_changes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_role_changes" ADD CONSTRAINT "admin_role_changes_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_role_changes" ADD CONSTRAINT "admin_role_changes_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Rule 3: a new audited table attaches its own `set_updated_at` trigger, since
-- nothing attaches one for it (claude-docs/db/updated-at.md).
CREATE OR REPLACE TRIGGER set_updated_at BEFORE UPDATE ON "admin_role_changes" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
-- The seed's bootstrap user is no admin (MB.58's rider): nobody can sign in as
-- it. A database seeded before the rider holds it as one, and the seed skips a
-- row it finds, so it is demoted and renamed as a fresh seed writes it here,
-- stamped as itself as the seed stamps it, and before the backfill so that it
-- gets no ledger row.
UPDATE "users" SET "role" = 'user', "name" = 'Seed System User', "updated_by" = "id"
WHERE "id" = '00000000-0000-0000-0000-000000000001' AND "role" = 'admin';--> statement-breakpoint
-- One `bootstrap` row for every live admin, stamped as that admin, so the
-- ledger has no gap at its start.
INSERT INTO "admin_role_changes" ("user_id", "change", "created_by", "updated_by")
SELECT "id", 'bootstrap', "id", "id" FROM "users"
WHERE "role" = 'admin' AND "deleted_at" IS NULL;
