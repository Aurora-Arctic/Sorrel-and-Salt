CREATE TYPE "public"."support_request_kind" AS ENUM('accessibility', 'bug', 'question');--> statement-breakpoint
CREATE TYPE "public"."support_request_status" AS ENUM('open', 'resolved');--> statement-breakpoint
CREATE TABLE "support_requests" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"kind" "support_request_kind" NOT NULL,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"path" text NOT NULL,
	"error_code" integer,
	"status" "support_request_status" DEFAULT 'open' NOT NULL,
	"assigned_to" uuid,
	"curator_visible" boolean DEFAULT false NOT NULL,
	"issue_url" text,
	"resolved_by" uuid,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" uuid
);
ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "support_requests_status_created_idx" ON "support_requests" USING btree ("status","created_at") WHERE "support_requests"."deleted_at" is null;--> statement-breakpoint
-- Rule 3: the table attaches its own `set_updated_at` trigger.
CREATE OR REPLACE TRIGGER set_updated_at BEFORE UPDATE ON "support_requests" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
