CREATE TABLE "ingredient_form_groups" (
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
	CONSTRAINT "ingredient_form_groups_description_not_blank" CHECK (btrim(description) <> '')
);
--> statement-breakpoint
CREATE TABLE "ingredient_forms" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text NOT NULL,
	"group_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" uuid,
	CONSTRAINT "ingredient_forms_description_not_blank" CHECK (btrim(description) <> '')
);
--> statement-breakpoint
ALTER TABLE "ingredient_form_groups" ADD CONSTRAINT "ingredient_form_groups_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredient_form_groups" ADD CONSTRAINT "ingredient_form_groups_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredient_form_groups" ADD CONSTRAINT "ingredient_form_groups_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredient_forms" ADD CONSTRAINT "ingredient_forms_group_id_ingredient_form_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."ingredient_form_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredient_forms" ADD CONSTRAINT "ingredient_forms_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredient_forms" ADD CONSTRAINT "ingredient_forms_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredient_forms" ADD CONSTRAINT "ingredient_forms_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ingredient_form_groups_slug_unique" ON "ingredient_form_groups" USING btree ("slug") WHERE "ingredient_form_groups"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "ingredient_forms_slug_unique" ON "ingredient_forms" USING btree ("slug") WHERE "ingredient_forms"."deleted_at" is null;