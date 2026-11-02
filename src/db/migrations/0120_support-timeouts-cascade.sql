ALTER TABLE "support_timeouts" DROP CONSTRAINT "support_timeouts_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "support_timeouts" ADD CONSTRAINT "support_timeouts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;