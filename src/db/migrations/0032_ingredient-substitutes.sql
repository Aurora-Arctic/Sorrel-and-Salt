-- MB.139, the expand half of rule 10: `ingredient_substitutes`, the table
-- MB.138 settled, added beside `ingredients.substitutes` and filled from it.
-- The list stays declared and written until MB.140 switches every reader and
-- writer, and MB.141 drops it (DESIGN.md §5, `ingredient_substitutes`).
--
-- Written with `generate --custom`, its DDL taken from a `generate` run in a
-- scratch copy: MB.137's drop of the planet, zodiac and colour singles is still
-- pending, and a plain `generate` here would have emitted it. The snapshot is
-- the last one plus this table, so the singles stay in it and MB.137's
-- `generate` still emits their drop (claude-docs/db/expand-contract.md).
CREATE TABLE "ingredient_substitutes" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"ingredient_id" uuid NOT NULL,
	"substitute_id" uuid,
	"name" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" uuid,
	CONSTRAINT "ingredient_substitutes_link_or_name" CHECK (num_nonnulls(substitute_id, name) = 1),
	CONSTRAINT "ingredient_substitutes_name_not_blank" CHECK (name is null or btrim(name) <> ''),
	CONSTRAINT "ingredient_substitutes_not_itself" CHECK (substitute_id <> ingredient_id)
);
--> statement-breakpoint
ALTER TABLE "ingredient_substitutes" ADD CONSTRAINT "ingredient_substitutes_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredient_substitutes" ADD CONSTRAINT "ingredient_substitutes_substitute_id_ingredients_id_fk" FOREIGN KEY ("substitute_id") REFERENCES "public"."ingredients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredient_substitutes" ADD CONSTRAINT "ingredient_substitutes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredient_substitutes" ADD CONSTRAINT "ingredient_substitutes_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredient_substitutes" ADD CONSTRAINT "ingredient_substitutes_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ingredient_substitutes_ingredient_id" ON "ingredient_substitutes" USING btree ("ingredient_id") WHERE "ingredient_substitutes"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "ingredient_substitutes_link_unique" ON "ingredient_substitutes" USING btree ("ingredient_id","substitute_id") WHERE "ingredient_substitutes"."substitute_id" is not null and "ingredient_substitutes"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "ingredient_substitutes_name_unique" ON "ingredient_substitutes" USING btree ("ingredient_id",lower("name")) WHERE "ingredient_substitutes"."name" is not null and "ingredient_substitutes"."deleted_at" is null;--> statement-breakpoint
-- Rule 3: a new audited table attaches its own `set_updated_at` trigger (M1.18).
CREATE OR REPLACE TRIGGER set_updated_at BEFORE UPDATE ON "ingredient_substitutes" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
-- Every entry a name row, since a list of text links nothing. Trimmed, blank
-- and null entries skipped: `text[]` carries no CHECK, so a list written past
-- the service could hold what `name`'s refuses. An entry repeated in any case
-- is copied once, in the spelling it first holds, so the name index never
-- refuses the fill. Stamped by whoever last wrote the list. Soft-deleted
-- ingredients are filled too, as 0030 filled them, for v2's restore (§13).
INSERT INTO "ingredient_substitutes" ("ingredient_id", "name", "created_by", "updated_by")
SELECT DISTINCT ON ("ingredients"."id", lower(btrim("entry"."name")))
  "ingredients"."id", btrim("entry"."name"), "ingredients"."updated_by", "ingredients"."updated_by"
FROM "ingredients"
CROSS JOIN LATERAL unnest("ingredients"."substitutes") WITH ORDINALITY AS "entry" ("name", "position")
WHERE btrim("entry"."name") <> ''
ORDER BY "ingredients"."id", lower(btrim("entry"."name")), "entry"."position";
