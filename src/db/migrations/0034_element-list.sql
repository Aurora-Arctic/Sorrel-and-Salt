-- MB.158, the expand half of rule 10: the list that `element` becomes
-- (MB.157), added beside it and filled from it. The single stays declared and
-- written until MB.159 switches every reader and writer and fills again for
-- whatever the live deploy wrote in between; MB.160 drops it
-- (claude-docs/db/identity-model.md, "The ingredient identity model").
--
-- Written with `generate --custom`, its DDL taken from a `generate` run into a
-- scratch copy: a plain one would also emit MB.137's and MB.141's pending drops
-- (claude-docs/db/expand-contract.md).
ALTER TABLE "ingredients" ADD COLUMN "elements" "ingredient_element"[];--> statement-breakpoint
-- A straight copy, the type already the list's own. A row with no element
-- keeps a null list, never `{}`. Soft-deleted rows are filled too: a spell
-- still reads an ingredient deleted after it went into the jar (M5.3).
UPDATE "ingredients" SET "elements" = ARRAY["element"] WHERE "element" IS NOT NULL;
