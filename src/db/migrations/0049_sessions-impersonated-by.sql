-- MB.53: the admin acting as `user_id` on an impersonation session, null on
-- every other (claude-docs/auth/impersonation.md, "Impersonation"). Nullable and
-- additive: nothing is dropped or narrowed, so no acknowledgement sidecar.
ALTER TABLE "sessions" ADD COLUMN "impersonated_by" uuid;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_impersonated_by_users_id_fk" FOREIGN KEY ("impersonated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;