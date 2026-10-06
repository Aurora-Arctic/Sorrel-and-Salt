-- MB.141, the contract half of rule 10: `ingredients.substitutes` dropped,
-- once MB.140, which stopped declaring it, has deployed. First the list is
-- copied across once more, for whatever the deploy before MB.140 wrote to it
-- after 0032's fill (DESIGN.md §5, `ingredient_substitutes`).
--
-- Written with `generate --custom`, its drop taken from a `generate` run in a
-- scratch copy: MB.137's drop of the planet, zodiac and colour singles is still
-- pending, and a plain `generate` here would have emitted it. The snapshot is
-- the last one less `substitutes`, so the singles stay in it and MB.137's
-- `generate` still emits their drop (claude-docs/db/expand-contract.md).
--
-- Only adds, unlike 0031's rederivation: MB.140 has been writing the table, so
-- any row it holds for a name, in any case, is newer than the list. A
-- soft-deleted one counts too, since only MB.140's code ever removed a row, and
-- copying the entry again would undo the removal. Otherwise 0032's fill:
-- trimmed, blanks skipped, a repeat copied once in its first spelling, stamped
-- by the list's last editor, and soft-deleted ingredients included.
INSERT INTO "ingredient_substitutes" ("ingredient_id", "name", "created_by", "updated_by")
SELECT DISTINCT ON ("ingredients"."id", lower(btrim("entry"."name")))
  "ingredients"."id", btrim("entry"."name"), "ingredients"."updated_by", "ingredients"."updated_by"
FROM "ingredients"
CROSS JOIN LATERAL unnest("ingredients"."substitutes") WITH ORDINALITY AS "entry" ("name", "position")
WHERE btrim("entry"."name") <> ''
  AND NOT EXISTS (
    SELECT 1 FROM "ingredient_substitutes" AS "held"
    WHERE "held"."ingredient_id" = "ingredients"."id"
      AND lower("held"."name") = lower(btrim("entry"."name"))
  )
ORDER BY "ingredients"."id", lower(btrim("entry"."name")), "entry"."position";--> statement-breakpoint
ALTER TABLE "ingredients" DROP COLUMN "substitutes";
