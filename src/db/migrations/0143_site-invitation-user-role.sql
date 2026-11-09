-- A site invitation may name `user`: accepting it turns on coven creation and grants no site role
-- (claude-docs/auth/admin-users.md, "Inviting a keeper"). The check stays the allowed set, compared as text.
ALTER TABLE "invitations" DROP CONSTRAINT "invitations_site_role_invitable";--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_site_role_invitable" CHECK ("invitations"."site_role" is null or "invitations"."site_role"::text in ('user', 'curator', 'admin'));
