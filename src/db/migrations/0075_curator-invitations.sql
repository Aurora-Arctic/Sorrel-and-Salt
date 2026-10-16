-- M11.20: a site invitation names the site role it grants, `curator` or
-- `admin` (claude-docs/design-decisions/m11.20-curator-role.md). Every site
-- invitation written before this granted admin, so each is filled as one
-- before the checks hold the column to the tier. The check compares
-- `site_role::text`: as the enum, `curator` is cast to `user_role`, and
-- Postgres refuses it in the transaction 0074 adds it in, which drizzle-kit
-- shares with this migration on a database migrated before both (55P04).
ALTER TABLE "invitations" ADD COLUMN "site_role" "user_role";--> statement-breakpoint
UPDATE "invitations" SET "site_role" = 'admin' WHERE "workspace_id" IS NULL;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_site_role_tier" CHECK (("invitations"."workspace_id" is null) = ("invitations"."site_role" is not null));--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_site_role_invitable" CHECK ("invitations"."site_role" is null or "invitations"."site_role"::text in ('curator', 'admin'));