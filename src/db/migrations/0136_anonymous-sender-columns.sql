ALTER TABLE "users" ADD COLUMN "is_anonymous" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "support_requests" ADD COLUMN "view_token_hash" text;