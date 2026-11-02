CREATE TYPE "public"."document_mailing_status" AS ENUM('sending', 'sent', 'replaced');--> statement-breakpoint
CREATE TYPE "public"."document_version_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TABLE "document_mailing_recipients" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"mailing_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" uuid
);
--> statement-breakpoint
CREATE TABLE "document_mailings" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"document_version_id" uuid NOT NULL,
	"summary" text NOT NULL,
	"status" "document_mailing_status" DEFAULT 'sending' NOT NULL,
	"recipient_count" integer NOT NULL,
	"finished_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" uuid
);
--> statement-breakpoint
CREATE TABLE "document_versions" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"body" text NOT NULL,
	"status" "document_version_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" uuid,
	CONSTRAINT "document_versions_published_at_with_status" CHECK (("document_versions"."status" = 'published') = ("document_versions"."published_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"title" text NOT NULL,
	"lede" text NOT NULL,
	"seed_key" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" uuid
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "agreed_terms_version" integer;--> statement-breakpoint
ALTER TABLE "document_mailing_recipients" ADD CONSTRAINT "document_mailing_recipients_mailing_id_document_mailings_id_fk" FOREIGN KEY ("mailing_id") REFERENCES "public"."document_mailings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_mailing_recipients" ADD CONSTRAINT "document_mailing_recipients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_mailing_recipients" ADD CONSTRAINT "document_mailing_recipients_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_mailing_recipients" ADD CONSTRAINT "document_mailing_recipients_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_mailing_recipients" ADD CONSTRAINT "document_mailing_recipients_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_mailings" ADD CONSTRAINT "document_mailings_document_version_id_document_versions_id_fk" FOREIGN KEY ("document_version_id") REFERENCES "public"."document_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_mailings" ADD CONSTRAINT "document_mailings_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_mailings" ADD CONSTRAINT "document_mailings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_mailings" ADD CONSTRAINT "document_mailings_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "document_mailing_recipients_mailing_user_unique" ON "document_mailing_recipients" USING btree ("mailing_id","user_id") WHERE "document_mailing_recipients"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "document_mailings_version_unique" ON "document_mailings" USING btree ("document_version_id") WHERE "document_mailings"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "document_versions_number_unique" ON "document_versions" USING btree ("document_id","number") WHERE "document_versions"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "document_versions_one_draft" ON "document_versions" USING btree ("document_id") WHERE "document_versions"."status" = 'draft' and "document_versions"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "documents_key_unique" ON "documents" USING btree ("key") WHERE "documents"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "documents_seed_key_unique" ON "documents" USING btree ("seed_key") WHERE "documents"."seed_key" is not null and "documents"."deleted_at" is null;--> statement-breakpoint
-- Hand-written from here: Drizzle cannot express a trigger. Rule 3: each table attaches its own `set_updated_at` trigger; the
-- versions table also attaches `bump_revision`, the function 0084 made.
CREATE OR REPLACE TRIGGER set_updated_at BEFORE UPDATE ON "documents" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE OR REPLACE TRIGGER set_updated_at BEFORE UPDATE ON "document_versions" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE OR REPLACE TRIGGER set_updated_at BEFORE UPDATE ON "document_mailings" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE OR REPLACE TRIGGER set_updated_at BEFORE UPDATE ON "document_mailing_recipients" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE OR REPLACE TRIGGER bump_revision BEFORE UPDATE ON "document_versions" FOR EACH ROW EXECUTE FUNCTION bump_revision();
