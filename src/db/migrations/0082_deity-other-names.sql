CREATE TABLE "deity_other_names" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"deity_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" uuid,
	CONSTRAINT "deity_other_names_name_not_blank" CHECK (btrim(name) <> '')
);
--> statement-breakpoint
ALTER TABLE "deity_other_names" ADD CONSTRAINT "deity_other_names_deity_id_deities_id_fk" FOREIGN KEY ("deity_id") REFERENCES "public"."deities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deity_other_names" ADD CONSTRAINT "deity_other_names_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deity_other_names" ADD CONSTRAINT "deity_other_names_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deity_other_names" ADD CONSTRAINT "deity_other_names_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "deity_other_names_unique" ON "deity_other_names" USING btree ("deity_id",lower("name")) WHERE "deity_other_names"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "deity_other_names_trgm" ON "deity_other_names" USING gin ("name" gin_trgm_ops);
--> statement-breakpoint
-- Rule 3: a new audited table attaches its own `set_updated_at` trigger, since
-- `sorrel` may not create the event trigger that would (claude-docs/db/updated-at.md).
CREATE OR REPLACE TRIGGER set_updated_at BEFORE UPDATE ON "deity_other_names" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
