-- MB.201: `invitations`, workspace and admin invitations in one two-tier
-- table, the shape `ingredients` has: a null workspace and role is the site
-- tier (claude-docs/design-decisions/mb.201-two-tier-invitations.md).
-- Additive: the two old tables stay until MB.203 drops them.
CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"workspace_id" uuid,
	"email" text NOT NULL,
	"role" "workspace_role",
	"token_hash" text NOT NULL,
	"expires_at" timestamp DEFAULT now() + interval '7 days' NOT NULL,
	"accepted_at" timestamp,
	"accepted_by" uuid,
	"revoked_at" timestamp,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" uuid,
	CONSTRAINT "invitations_tier" CHECK (("invitations"."workspace_id" is null) = ("invitations"."role" is null)),
	CONSTRAINT "invitations_role_invitable" CHECK ("invitations"."role" is null or "invitations"."role" in ('viewer', 'member'))
);
--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_accepted_by_users_id_fk" FOREIGN KEY ("accepted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "invitations_token_hash_unique" ON "invitations" USING btree ("token_hash") WHERE "invitations"."deleted_at" is null;--> statement-breakpoint
-- Rule 3: a new audited table attaches its own `set_updated_at` trigger, since
-- nothing attaches one for it (claude-docs/db/updated-at.md).
CREATE OR REPLACE TRIGGER set_updated_at BEFORE UPDATE ON "invitations" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
-- Both old tables, with their ids and stamps, so MB.203's final sweep can
-- re-run this with `ON CONFLICT (id) DO NOTHING`. A workspace invitation keeps
-- its workspace and role and has no note; an admin invitation is the site
-- tier, a null pair, and keeps its note. Production holds no row in either.
INSERT INTO "invitations" ("id", "workspace_id", "email", "role", "token_hash", "expires_at", "accepted_at", "accepted_by", "revoked_at", "note", "created_at", "created_by", "updated_at", "updated_by", "deleted_at", "deleted_by")
SELECT "id", "workspace_id", "email", "role", "token_hash", "expires_at", "accepted_at", "accepted_by", "revoked_at", NULL::text, "created_at", "created_by", "updated_at", "updated_by", "deleted_at", "deleted_by" FROM "workspace_invitations"
UNION ALL
SELECT "id", NULL::uuid, "email", NULL::"workspace_role", "token_hash", "expires_at", "accepted_at", "accepted_by", "revoked_at", "note", "created_at", "created_by", "updated_at", "updated_by", "deleted_at", "deleted_by" FROM "admin_invitations";
