CREATE TYPE "public"."help_article_kind" AS ENUM('faq', 'article', 'term');--> statement-breakpoint
CREATE TYPE "public"."help_audience" AS ENUM('public', 'staff', 'keeper');--> statement-breakpoint
CREATE TABLE "help_articles" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"kind" "help_article_kind" NOT NULL,
	"audience" "help_audience" DEFAULT 'public' NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"summary" text,
	"body" text NOT NULL,
	"position" integer,
	"seed_key" text,
	"parent_id" uuid,
	"search_vector" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('english', title), 'A') || setweight(to_tsvector('english', coalesce(summary, '')), 'B') || setweight(to_tsvector('english', body), 'C')) STORED,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" uuid,
	CONSTRAINT "help_articles_term_no_position" CHECK ("help_articles"."kind" <> 'term' or "help_articles"."position" is null),
	CONSTRAINT "help_articles_term_no_parent" CHECK ("help_articles"."kind" <> 'term' or "help_articles"."parent_id" is null),
	CONSTRAINT "help_articles_not_own_parent" CHECK ("help_articles"."parent_id" is distinct from "help_articles"."id"),
	CONSTRAINT "help_articles_term_public" CHECK ("help_articles"."kind" <> 'term' or "help_articles"."audience" = 'public')
);
--> statement-breakpoint
ALTER TABLE "help_articles" ADD CONSTRAINT "help_articles_parent_id_help_articles_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."help_articles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "help_articles" ADD CONSTRAINT "help_articles_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "help_articles" ADD CONSTRAINT "help_articles_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "help_articles" ADD CONSTRAINT "help_articles_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "help_articles_slug_unique" ON "help_articles" USING btree ("kind","slug") WHERE "help_articles"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "help_articles_seed_key_unique" ON "help_articles" USING btree ("seed_key") WHERE "help_articles"."seed_key" is not null and "help_articles"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "help_articles_search_vector_idx" ON "help_articles" USING gin ("search_vector");--> statement-breakpoint
CREATE OR REPLACE TRIGGER set_updated_at BEFORE UPDATE ON "help_articles" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
