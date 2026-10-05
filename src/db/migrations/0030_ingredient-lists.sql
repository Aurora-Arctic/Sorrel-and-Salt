-- MB.135, the expand half of rule 10: the lists that `planet`, `zodiac` and
-- `color` become (MB.134), added beside them and filled from them. The singles
-- stay declared and written until MB.136 switches every reader and writer and
-- fills again for whatever the live deploy wrote in between; MB.137 drops them
-- (claude-docs/db/identity-model.md, "The ingredient identity model").
ALTER TABLE "ingredients" ADD COLUMN "planets" text[];--> statement-breakpoint
ALTER TABLE "ingredients" ADD COLUMN "zodiac_signs" text[];--> statement-breakpoint
ALTER TABLE "ingredients" ADD COLUMN "colors" text[];--> statement-breakpoint
-- A straight copy: a single was written trimmed and never blank (the shared
-- schema's `optionalText`), which is already what a list entry must be. A row
-- with no single keeps a null list, never `{}`. Soft-deleted rows are filled
-- too: a spell still reads an ingredient deleted after it went into the jar (M5.3).
UPDATE "ingredients" SET "planets" = ARRAY["planet"] WHERE "planet" IS NOT NULL;--> statement-breakpoint
UPDATE "ingredients" SET "zodiac_signs" = ARRAY["zodiac"] WHERE "zodiac" IS NOT NULL;--> statement-breakpoint
UPDATE "ingredients" SET "colors" = ARRAY["color"] WHERE "color" IS NOT NULL;
