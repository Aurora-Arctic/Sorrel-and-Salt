-- MB.110: `spell_ingredients` becomes soft-deleted — a layer taken out of a
-- spell is a tombstone — so the layer can no longer be the key, and every
-- unique index counts live rows only (claude-docs/db.md, "Layer order is the
-- identity, and what that costs the reorder").
--
-- `drizzle-kit generate` wrote these contract-first; they are reordered by hand
-- so that each guarantee is taken over before what held it goes. The layer
-- index is built while every row is live, so it holds exactly what the key
-- held; the key is dropped only then. The other two indexes keep their names
-- and gain `deleted_at IS NULL`, so each is dropped and re-created in turn.
-- `drizzle-kit migrate` runs the file in one transaction, so the order
-- documents intent rather than guarding a window.

-- expand
ALTER TABLE "spell_ingredients" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "spell_ingredients" ADD COLUMN "deleted_by" uuid;--> statement-breakpoint
ALTER TABLE "spell_ingredients" ADD CONSTRAINT "spell_ingredients_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "spell_ingredients_spell_id_layer_order_unique" ON "spell_ingredients" USING btree ("spell_id","layer_order") WHERE "spell_ingredients"."deleted_at" is null;--> statement-breakpoint
-- contract
ALTER TABLE "spell_ingredients" DROP CONSTRAINT "spell_ingredients_spell_id_layer_order_pk";--> statement-breakpoint
ALTER TABLE "spell_ingredients" ADD COLUMN "id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL;--> statement-breakpoint
DROP INDEX "spell_ingredients_spell_id_ingredient_id_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "spell_ingredients_spell_id_ingredient_id_unique" ON "spell_ingredients" USING btree ("spell_id","ingredient_id") WHERE "spell_ingredients"."ingredient_id" is not null and "spell_ingredients"."deleted_at" is null;--> statement-breakpoint
DROP INDEX "spell_ingredients_spell_id_custom_name_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "spell_ingredients_spell_id_custom_name_unique" ON "spell_ingredients" USING btree ("spell_id",lower("name")) WHERE "spell_ingredients"."ingredient_id" is null and "spell_ingredients"."deleted_at" is null;
