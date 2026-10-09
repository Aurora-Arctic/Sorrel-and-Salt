-- MB.193: `workspace_creation_changes`, the ledger of who may create a
-- workspace, one row per change to `users.can_create_workspace`
-- (claude-docs/design-decisions/m5.8-revoking-workspace-creation.md). Only
-- adds: no backfill, since who set a flag held before it is not known.
CREATE TYPE "public"."workspace_creation_change" AS ENUM('grant', 'revoke', 'invitation', 'admin');--> statement-breakpoint
CREATE TABLE "workspace_creation_changes" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"change" "workspace_creation_change" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" uuid
);
--> statement-breakpoint
ALTER TABLE "workspace_creation_changes" ADD CONSTRAINT "workspace_creation_changes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_creation_changes" ADD CONSTRAINT "workspace_creation_changes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_creation_changes" ADD CONSTRAINT "workspace_creation_changes_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_creation_changes" ADD CONSTRAINT "workspace_creation_changes_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Rule 3: a new audited table attaches its own `set_updated_at` trigger, since
-- nothing attaches one for it (claude-docs/db/updated-at.md).
CREATE OR REPLACE TRIGGER set_updated_at BEFORE UPDATE ON "workspace_creation_changes" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
