-- MB.168, the contract half of rule 10: `ingredients.deities` dropped, once
-- MB.167, which stopped declaring it, has deployed to staging. First the list
-- is copied across once more, for whatever the deploy before MB.167 wrote to
-- it after 0041's fill (DESIGN.md §5, `ingredient_deities`).
--
-- The drop is `generate`'s; the copy before it is added by hand.
--
-- Only adds, as 0039's refill: MB.167 has been writing the table, so any row
-- it holds for a name, in any case, linked or not, is newer than the list. A
-- soft-deleted one counts too, since only MB.167's code ever removed a row, and
-- copying the entry again would undo the removal. The list keeps the order
-- entered (MB.165), so what is copied follows the ingredient's live rows, in
-- the array's order, from one past the last live `position`. Otherwise 0041's
-- fill: trimmed, blanks skipped, a repeat copied once at its first place and in
-- its first spelling, unlinked, stamped by the list's last editor, and
-- soft-deleted ingredients included.
INSERT INTO "ingredient_deities" ("ingredient_id", "name", "position", "created_by", "updated_by")
SELECT
  "first"."ingredient_id",
  "first"."name",
  coalesce(
    (SELECT max("live"."position") FROM "ingredient_deities" AS "live"
     WHERE "live"."ingredient_id" = "first"."ingredient_id" AND "live"."deleted_at" IS NULL),
    -1
  ) + row_number() OVER (PARTITION BY "first"."ingredient_id" ORDER BY "first"."ordinality"),
  "first"."updated_by",
  "first"."updated_by"
FROM (
  SELECT DISTINCT ON ("ingredients"."id", lower(btrim("entry"."name")))
    "ingredients"."id" AS "ingredient_id",
    btrim("entry"."name") AS "name",
    "entry"."ordinality",
    "ingredients"."updated_by"
  FROM "ingredients"
  CROSS JOIN LATERAL unnest("ingredients"."deities") WITH ORDINALITY AS "entry" ("name", "ordinality")
  WHERE btrim("entry"."name") <> ''
    AND NOT EXISTS (
      SELECT 1 FROM "ingredient_deities" AS "held"
      WHERE "held"."ingredient_id" = "ingredients"."id"
        AND lower("held"."name") = lower(btrim("entry"."name"))
    )
  ORDER BY "ingredients"."id", lower(btrim("entry"."name")), "entry"."ordinality"
) AS "first";--> statement-breakpoint
ALTER TABLE "ingredients" DROP COLUMN "deities";
