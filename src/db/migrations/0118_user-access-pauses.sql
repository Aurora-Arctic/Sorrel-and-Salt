CREATE TABLE "user_access_pauses" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"until" timestamp,
	"note" text,
	"lifted_at" timestamp,
	"lifted_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" uuid,
	CONSTRAINT "user_access_pauses_lifted_together" CHECK (("user_access_pauses"."lifted_at" is null) = ("user_access_pauses"."lifted_by" is null))
);
--> statement-breakpoint
ALTER TABLE "user_access_pauses" ADD CONSTRAINT "user_access_pauses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_access_pauses" ADD CONSTRAINT "user_access_pauses_lifted_by_users_id_fk" FOREIGN KEY ("lifted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_access_pauses" ADD CONSTRAINT "user_access_pauses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_access_pauses" ADD CONSTRAINT "user_access_pauses_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_access_pauses" ADD CONSTRAINT "user_access_pauses_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_access_pauses_one_live" ON "user_access_pauses" USING btree ("user_id") WHERE "user_access_pauses"."lifted_at" is null and "user_access_pauses"."deleted_at" is null;--> statement-breakpoint
-- Rule 3: each table attaches its own `set_updated_at` trigger.
CREATE OR REPLACE TRIGGER set_updated_at BEFORE UPDATE ON "user_access_pauses" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
