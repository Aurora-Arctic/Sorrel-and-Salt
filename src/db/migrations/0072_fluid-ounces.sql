ALTER TABLE "inventory_items" DROP CONSTRAINT "inventory_items_unit_matches_dimension";--> statement-breakpoint
ALTER TYPE "public"."inventory_unit" RENAME VALUE 'fl_oz' TO 'fl_oz_uk';--> statement-breakpoint
ALTER TYPE "public"."inventory_unit" ADD VALUE 'fl_oz_us' AFTER 'fl_oz_uk';--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_unit_matches_dimension" CHECK ((unit is null) = (unit_dimension is null) and (unit is null or ((unit_dimension = 'weight' and unit in ('mg', 'g', 'kg', 'oz', 'lb')) or (unit_dimension = 'volume' and unit in ('ml', 'l', 'tsp', 'tbsp', 'fl_oz_uk', 'fl_oz_us', 'cup')) or (unit_dimension = 'count' and unit in ('piece', 'drop', 'pinch')))));
