CREATE TABLE "planets" (
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
	CONSTRAINT "planets_description_not_blank" CHECK (btrim(description) <> '')
);
--> statement-breakpoint
CREATE TABLE "zodiac_signs" (
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
	CONSTRAINT "zodiac_signs_description_not_blank" CHECK (btrim(description) <> '')
);
--> statement-breakpoint
ALTER TABLE "planets" ADD CONSTRAINT "planets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planets" ADD CONSTRAINT "planets_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planets" ADD CONSTRAINT "planets_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zodiac_signs" ADD CONSTRAINT "zodiac_signs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zodiac_signs" ADD CONSTRAINT "zodiac_signs_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zodiac_signs" ADD CONSTRAINT "zodiac_signs_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "planets_slug_unique" ON "planets" USING btree ("slug") WHERE "planets"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "planets_trgm" ON "planets" USING gin ("name" gin_trgm_ops,"description" gin_trgm_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "zodiac_signs_slug_unique" ON "zodiac_signs" USING btree ("slug") WHERE "zodiac_signs"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "zodiac_signs_trgm" ON "zodiac_signs" USING gin ("name" gin_trgm_ops,"description" gin_trgm_ops);--> statement-breakpoint
-- Rule 3: a new audited table attaches its own `set_updated_at` trigger, since
-- nothing attaches one for it (claude-docs/db.md, "updated_at is the database's").
CREATE OR REPLACE TRIGGER set_updated_at BEFORE UPDATE ON "planets" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE OR REPLACE TRIGGER set_updated_at BEFORE UPDATE ON "zodiac_signs" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
