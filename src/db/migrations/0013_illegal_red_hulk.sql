CREATE TYPE "public"."inventory_unit" AS ENUM('mg', 'g', 'kg', 'oz', 'lb', 'ml', 'l', 'tsp', 'tbsp', 'fl_oz', 'cup', 'piece', 'drop', 'pinch');--> statement-breakpoint
CREATE TYPE "public"."unit_dimension" AS ENUM('weight', 'volume', 'count');--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"ingredient_id" uuid NOT NULL,
	"quantity_on_hand" numeric(12, 3),
	"unit" "inventory_unit",
	"unit_dimension" "unit_dimension",
	"low_stock_threshold" numeric(12, 3),
	"source" text,
	"acquired_date" date,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" uuid,
	CONSTRAINT "inventory_items_unit_matches_dimension" CHECK ((unit is null) = (unit_dimension is null) and (unit is null or ((unit_dimension = 'weight' and unit in ('mg', 'g', 'kg', 'oz', 'lb')) or (unit_dimension = 'volume' and unit in ('ml', 'l', 'tsp', 'tbsp', 'fl_oz', 'cup')) or (unit_dimension = 'count' and unit in ('piece', 'drop', 'pinch')))))
);
--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_items_workspace_id_ingredient_id_unique" ON "inventory_items" USING btree ("workspace_id","ingredient_id") WHERE "inventory_items"."deleted_at" is null;