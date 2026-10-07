-- MB.177: every admin holds `can_create_workspace`, the flag that lets anyone
-- create a workspace (claude-docs/design-decisions/mb.177-admins-hold-workspace-creation.md).
-- Additive: the data statement sets a flag and drops nothing. It runs first so
-- that the CHECK validates, and reaches soft-deleted admins too, since the
-- CHECK binds every row; each is stamped as that admin, as 0043's backfill was.
UPDATE "users" SET "can_create_workspace" = true, "updated_by" = "id"
WHERE "role" = 'admin' AND "can_create_workspace" = false;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_admin_can_create_workspace" CHECK ("users"."role" <> 'admin' or "users"."can_create_workspace");
