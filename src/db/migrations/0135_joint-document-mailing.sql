CREATE TABLE "document_mailing_items" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"mailing_id" uuid NOT NULL,
	"document_version_id" uuid NOT NULL,
	"summary" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" uuid
);
--> statement-breakpoint
ALTER TABLE "document_mailings" ALTER COLUMN "document_version_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "document_mailings" ALTER COLUMN "summary" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "document_mailing_items" ADD CONSTRAINT "document_mailing_items_mailing_id_document_mailings_id_fk" FOREIGN KEY ("mailing_id") REFERENCES "public"."document_mailings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_mailing_items" ADD CONSTRAINT "document_mailing_items_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_mailing_items" ADD CONSTRAINT "document_mailing_items_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_mailing_items" ADD CONSTRAINT "document_mailing_items_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_mailing_items" ADD CONSTRAINT "document_mailing_items_version_fk" FOREIGN KEY ("document_version_id") REFERENCES "public"."document_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "document_mailing_items_mailing_version_unique" ON "document_mailing_items" USING btree ("mailing_id","document_version_id") WHERE "document_mailing_items"."deleted_at" is null;--> statement-breakpoint
-- Hand-written from here: Drizzle cannot express a trigger or a backfill. Rule 3: the items table attaches its own
-- `set_updated_at` trigger.
CREATE OR REPLACE TRIGGER set_updated_at BEFORE UPDATE ON "document_mailing_items" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
-- Every mailing written before the items table becomes a mailing of one item: the version and summary it carried, stamped
-- and deleted as the mailing was. A mailing that already has an item is skipped, so running this twice adds nothing.
INSERT INTO "document_mailing_items" ("mailing_id", "document_version_id", "summary", "created_at", "created_by", "updated_at", "updated_by", "deleted_at", "deleted_by")
SELECT "m"."id", "m"."document_version_id", "m"."summary", "m"."created_at", "m"."created_by", "m"."updated_at", "m"."updated_by", "m"."deleted_at", "m"."deleted_by"
FROM "document_mailings" "m"
WHERE "m"."document_version_id" IS NOT NULL
  AND "m"."summary" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "document_mailing_items" "i" WHERE "i"."mailing_id" = "m"."id");
