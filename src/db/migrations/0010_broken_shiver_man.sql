CREATE TABLE "ingredient_folk_names" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"ingredient_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" uuid
);
--> statement-breakpoint
ALTER TABLE "ingredient_folk_names" ADD CONSTRAINT "ingredient_folk_names_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredient_folk_names" ADD CONSTRAINT "ingredient_folk_names_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredient_folk_names" ADD CONSTRAINT "ingredient_folk_names_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredient_folk_names" ADD CONSTRAINT "ingredient_folk_names_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ingredient_folk_names_unique" ON "ingredient_folk_names" USING btree ("ingredient_id",lower("name")) WHERE "ingredient_folk_names"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "ingredient_folk_names_trgm" ON "ingredient_folk_names" USING gin ("name" gin_trgm_ops);