-- MB.128: `deity_traditions` and `deities`, the vocabulary behind the list
-- `ingredients.deities`, which stays free text with no key to either
-- (claude-docs/db/deity-vocabulary.md).
--
-- Written with `generate --custom`, its DDL taken from a `generate` run in a
-- scratch copy: MB.137's drop of the planet, zodiac and colour singles and
-- MB.141's of `ingredients.substitutes` are still pending, and a plain
-- `generate` here would have emitted both. The snapshot is the last one plus
-- these two tables, so the undeclared columns stay in it and each drop is
-- still its own task's to generate (claude-docs/db/expand-contract.md).
CREATE TABLE "deities" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text NOT NULL,
	"tradition_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" uuid,
	CONSTRAINT "deities_description_not_blank" CHECK (btrim(description) <> '')
);
--> statement-breakpoint
CREATE TABLE "deity_traditions" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" uuid,
	CONSTRAINT "deity_traditions_description_not_blank" CHECK (btrim(description) <> '')
);
--> statement-breakpoint
ALTER TABLE "deities" ADD CONSTRAINT "deities_tradition_id_deity_traditions_id_fk" FOREIGN KEY ("tradition_id") REFERENCES "public"."deity_traditions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deities" ADD CONSTRAINT "deities_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deities" ADD CONSTRAINT "deities_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deities" ADD CONSTRAINT "deities_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deity_traditions" ADD CONSTRAINT "deity_traditions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deity_traditions" ADD CONSTRAINT "deity_traditions_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deity_traditions" ADD CONSTRAINT "deity_traditions_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "deities_slug_unique" ON "deities" USING btree ("slug") WHERE "deities"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "deities_trgm" ON "deities" USING gin ("name" gin_trgm_ops,"description" gin_trgm_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "deity_traditions_slug_unique" ON "deity_traditions" USING btree ("slug") WHERE "deity_traditions"."deleted_at" is null;--> statement-breakpoint
-- Rule 3: a new audited table attaches its own `set_updated_at` trigger, since
-- nothing attaches one for it (claude-docs/db.md, "updated_at is the database's").
CREATE OR REPLACE TRIGGER set_updated_at BEFORE UPDATE ON "deity_traditions" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE OR REPLACE TRIGGER set_updated_at BEFORE UPDATE ON "deities" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
