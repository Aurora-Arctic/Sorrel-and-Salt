-- MB.152, a table task: `references` and `reference_links` as MB.151 settled
-- them — one source per row in Chicago bibliography form, two-tiered as
-- `ingredients` is, and one link per reference per sourced row under a single
-- `num_nonnulls` CHECK. Nothing reads or writes either until MB.153 (DESIGN.md
-- §5, "References"; claude-docs/design-decisions/mb.151-references.md).
CREATE TYPE "public"."reference_kind" AS ENUM('book', 'chapter', 'article', 'entry', 'web_page');--> statement-breakpoint
CREATE TABLE "reference_links" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"reference_id" uuid NOT NULL,
	"ingredient_id" uuid,
	"deity_id" uuid,
	"deity_tradition_id" uuid,
	"planet_id" uuid,
	"zodiac_sign_id" uuid,
	"locator" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" uuid,
	CONSTRAINT "reference_links_one_row" CHECK (num_nonnulls(ingredient_id, deity_id, deity_tradition_id, planet_id, zodiac_sign_id) = 1),
	CONSTRAINT "reference_links_locator_not_blank" CHECK (locator is null or btrim(locator) <> '')
);
--> statement-breakpoint
CREATE TABLE "references" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"workspace_id" uuid,
	"kind" "reference_kind" NOT NULL,
	"authors" text,
	"title" text NOT NULL,
	"container" text,
	"contributors" text,
	"edition" text,
	"volume" text,
	"issue" text,
	"series" text,
	"place" text,
	"publisher" text,
	"published" text,
	"pages" text,
	"host" text,
	"url" text,
	"modified" date,
	"accessed" date,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" uuid,
	CONSTRAINT "references_title_not_blank" CHECK (btrim(title) <> ''),
	CONSTRAINT "references_authors_not_blank" CHECK (authors is null or btrim(authors) <> ''),
	CONSTRAINT "references_container_not_blank" CHECK (container is null or btrim(container) <> ''),
	CONSTRAINT "references_contributors_not_blank" CHECK (contributors is null or btrim(contributors) <> ''),
	CONSTRAINT "references_edition_not_blank" CHECK (edition is null or btrim(edition) <> ''),
	CONSTRAINT "references_volume_not_blank" CHECK (volume is null or btrim(volume) <> ''),
	CONSTRAINT "references_issue_not_blank" CHECK (issue is null or btrim(issue) <> ''),
	CONSTRAINT "references_series_not_blank" CHECK (series is null or btrim(series) <> ''),
	CONSTRAINT "references_place_not_blank" CHECK (place is null or btrim(place) <> ''),
	CONSTRAINT "references_publisher_not_blank" CHECK (publisher is null or btrim(publisher) <> ''),
	CONSTRAINT "references_published_not_blank" CHECK (published is null or btrim(published) <> ''),
	CONSTRAINT "references_pages_not_blank" CHECK (pages is null or btrim(pages) <> ''),
	CONSTRAINT "references_host_not_blank" CHECK (host is null or btrim(host) <> ''),
	CONSTRAINT "references_note_not_blank" CHECK (note is null or btrim(note) <> ''),
	CONSTRAINT "references_url_absolute" CHECK (url is null or url ~ '^https?://'),
	CONSTRAINT "references_accessed_needs_url" CHECK (accessed is null or url is not null),
	CONSTRAINT "references_kind_needs_container" CHECK (kind not in ('chapter', 'article', 'entry') or container is not null),
	CONSTRAINT "references_web_page_located" CHECK (kind <> 'web_page' or (url is not null and accessed is not null))
);
--> statement-breakpoint
ALTER TABLE "reference_links" ADD CONSTRAINT "reference_links_reference_id_references_id_fk" FOREIGN KEY ("reference_id") REFERENCES "public"."references"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reference_links" ADD CONSTRAINT "reference_links_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reference_links" ADD CONSTRAINT "reference_links_deity_id_deities_id_fk" FOREIGN KEY ("deity_id") REFERENCES "public"."deities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reference_links" ADD CONSTRAINT "reference_links_deity_tradition_id_deity_traditions_id_fk" FOREIGN KEY ("deity_tradition_id") REFERENCES "public"."deity_traditions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reference_links" ADD CONSTRAINT "reference_links_planet_id_planets_id_fk" FOREIGN KEY ("planet_id") REFERENCES "public"."planets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reference_links" ADD CONSTRAINT "reference_links_zodiac_sign_id_zodiac_signs_id_fk" FOREIGN KEY ("zodiac_sign_id") REFERENCES "public"."zodiac_signs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reference_links" ADD CONSTRAINT "reference_links_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reference_links" ADD CONSTRAINT "reference_links_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reference_links" ADD CONSTRAINT "reference_links_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "references" ADD CONSTRAINT "references_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "references" ADD CONSTRAINT "references_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "references" ADD CONSTRAINT "references_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "references" ADD CONSTRAINT "references_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "reference_links_ingredient_unique" ON "reference_links" USING btree ("ingredient_id","reference_id") WHERE "reference_links"."ingredient_id" is not null and "reference_links"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "reference_links_deity_unique" ON "reference_links" USING btree ("deity_id","reference_id") WHERE "reference_links"."deity_id" is not null and "reference_links"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "reference_links_deity_tradition_unique" ON "reference_links" USING btree ("deity_tradition_id","reference_id") WHERE "reference_links"."deity_tradition_id" is not null and "reference_links"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "reference_links_planet_unique" ON "reference_links" USING btree ("planet_id","reference_id") WHERE "reference_links"."planet_id" is not null and "reference_links"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "reference_links_zodiac_sign_unique" ON "reference_links" USING btree ("zodiac_sign_id","reference_id") WHERE "reference_links"."zodiac_sign_id" is not null and "reference_links"."deleted_at" is null;--> statement-breakpoint
-- Rule 3: a new audited table attaches its own `set_updated_at` trigger (M1.18).
CREATE OR REPLACE TRIGGER set_updated_at BEFORE UPDATE ON "references" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE OR REPLACE TRIGGER set_updated_at BEFORE UPDATE ON "reference_links" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
