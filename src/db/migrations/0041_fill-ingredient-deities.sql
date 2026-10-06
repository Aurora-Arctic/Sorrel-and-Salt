-- Every entry an unlinked name row: typed text is never resolved into a link,
-- and the text cannot say which of two same-named deities it meant (MB.166).
-- Trimmed, blank and null entries skipped: `text[]` carries no CHECK, so a
-- list written past the service could hold what `name`'s refuses. An entry
-- repeated in any case is copied once, at its first place and in the spelling
-- it first holds, so the name index never refuses the fill. The list keeps the
-- order entered (MB.165), so `position` is the array's order, renumbered from
-- 0, the list's own index, so a skipped entry leaves no gap. Stamped by
-- whoever last wrote the list. Soft-deleted ingredients are filled too, as
-- 0032 filled substitutes, for v2's restore (§13).
INSERT INTO "ingredient_deities" ("ingredient_id", "name", "position", "created_by", "updated_by")
SELECT
  "first"."ingredient_id",
  "first"."name",
  row_number() OVER (PARTITION BY "first"."ingredient_id" ORDER BY "first"."ordinality") - 1,
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
  ORDER BY "ingredients"."id", lower(btrim("entry"."name")), "entry"."ordinality"
) AS "first";
