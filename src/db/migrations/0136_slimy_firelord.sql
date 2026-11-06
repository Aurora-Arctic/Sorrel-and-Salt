ALTER TABLE "support_timeouts" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "support_requests" ADD COLUMN "view_token_hash" text;--> statement-breakpoint
ALTER TABLE "support_requests" ADD COLUMN "view_token_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "support_timeouts" ADD COLUMN "address_key" text;--> statement-breakpoint
CREATE INDEX "support_timeouts_address_key_idx" ON "support_timeouts" USING btree ("address_key") WHERE "support_timeouts"."lifted_at" is null;--> statement-breakpoint
ALTER TABLE "support_timeouts" ADD CONSTRAINT "support_timeouts_binds_someone" CHECK ("support_timeouts"."user_id" is not null or "support_timeouts"."address_key" is not null);