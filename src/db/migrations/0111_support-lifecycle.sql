CREATE TYPE "public"."support_reply_author_role" AS ENUM('sender', 'staff');--> statement-breakpoint
CREATE TYPE "public"."support_reply_visibility" AS ENUM('public', 'internal');--> statement-breakpoint
ALTER TYPE "public"."support_request_status" ADD VALUE 'waiting_on_sender' BEFORE 'resolved';--> statement-breakpoint
ALTER TYPE "public"."support_request_status" ADD VALUE 'closed';--> statement-breakpoint
ALTER TABLE "support_replies" ADD COLUMN "author_role" "support_reply_author_role" DEFAULT 'staff' NOT NULL;--> statement-breakpoint
ALTER TABLE "support_replies" ADD COLUMN "visibility" "support_reply_visibility" DEFAULT 'public' NOT NULL;--> statement-breakpoint
ALTER TABLE "support_requests" ADD COLUMN "last_sender_activity_at" timestamp;--> statement-breakpoint
ALTER TABLE "support_requests" ADD COLUMN "last_staff_activity_at" timestamp;--> statement-breakpoint
ALTER TABLE "support_requests" ADD COLUMN "closed_at" timestamp;--> statement-breakpoint
ALTER TABLE "support_requests" ADD COLUMN "linked_from" uuid;--> statement-breakpoint
ALTER TABLE "support_requests" ADD COLUMN "error_reference" text;--> statement-breakpoint
ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_linked_from_support_requests_id_fk" FOREIGN KEY ("linked_from") REFERENCES "public"."support_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "support_requests_status_sender_activity_idx" ON "support_requests" USING btree ("status","last_sender_activity_at") WHERE "support_requests"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "support_requests_closed_at_idx" ON "support_requests" USING btree ("closed_at");--> statement-breakpoint
UPDATE "support_requests" SET "last_sender_activity_at" = "created_at";--> statement-breakpoint
UPDATE "support_requests" r SET "last_staff_activity_at" = (SELECT max(p."created_at") FROM "support_replies" p WHERE p."request_id" = r."id" AND p."deleted_at" IS NULL);
