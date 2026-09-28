-- MB.67: the provisional-account sweep's two halves, the one-hour window on
-- updated_at and the three-hour cap on created_at. It runs on every OAuth
-- callback and almost always finds nothing, so each index holds only
-- unverified rows. Additive, so no acknowledgement.
CREATE INDEX "users_provisional_updated_at_idx" ON "users" USING btree ("updated_at") WHERE "users"."email_verified" = false;--> statement-breakpoint
CREATE INDEX "users_provisional_created_at_idx" ON "users" USING btree ("created_at") WHERE "users"."email_verified" = false;