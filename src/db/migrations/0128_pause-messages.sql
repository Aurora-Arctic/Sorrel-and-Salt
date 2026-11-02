ALTER TABLE "workspace_member_pauses" ADD COLUMN "message" text;--> statement-breakpoint
ALTER TABLE "user_access_pauses" ADD COLUMN "message" text;--> statement-breakpoint
ALTER TABLE "support_timeouts" ADD COLUMN "message" text;