ALTER TABLE "invitations" DROP CONSTRAINT "invitations_tier";--> statement-breakpoint
ALTER TABLE "invitations" DROP CONSTRAINT "invitations_site_role_tier";--> statement-breakpoint
ALTER TABLE "invitations" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "kind" text DEFAULT 'address' NOT NULL;--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "batch_id" uuid;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_kind_known" CHECK ("invitations"."kind" in ('address', 'card'));--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_kind_shape" CHECK (("invitations"."kind" = 'address' and "invitations"."email" is not null) or ("invitations"."kind" = 'card' and num_nonnulls("invitations"."email", "invitations"."workspace_id", "invitations"."role", "invitations"."site_role") = 0));--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_tier" CHECK ("invitations"."kind" = 'card' or ("invitations"."workspace_id" is null) = ("invitations"."role" is null));--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_site_role_tier" CHECK ("invitations"."kind" = 'card' or ("invitations"."workspace_id" is null) = ("invitations"."site_role" is not null));