CREATE TABLE "support_send_counts" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"key" text NOT NULL,
	"window_start" timestamp NOT NULL,
	"count" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" uuid,
	CONSTRAINT "support_send_counts_kind" CHECK ("support_send_counts"."kind" in ('address', 'client'))
);
--> statement-breakpoint
ALTER TABLE "support_send_counts" ADD CONSTRAINT "support_send_counts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_send_counts" ADD CONSTRAINT "support_send_counts_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_send_counts" ADD CONSTRAINT "support_send_counts_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "support_send_counts_key_idx" ON "support_send_counts" USING btree ("kind","key") WHERE "support_send_counts"."deleted_at" is null;--> statement-breakpoint
-- Rule 3: each table attaches its own `set_updated_at` trigger.
CREATE OR REPLACE TRIGGER set_updated_at BEFORE UPDATE ON "support_send_counts" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
