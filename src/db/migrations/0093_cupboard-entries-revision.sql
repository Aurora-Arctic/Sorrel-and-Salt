-- M13.24: a coven's annotation carries the revision counter an ingredient does, so its
-- autosave can name the revision it read. Expand-only: the column has a default, so the
-- deploy before it, which never names it, still inserts; existing rows take 1.
ALTER TABLE "workspace_compendium_entries" ADD COLUMN "revision" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
-- Hand-written from here: Drizzle cannot express a trigger. The function is
-- the one 0084 made.
CREATE OR REPLACE TRIGGER bump_revision BEFORE UPDATE ON "workspace_compendium_entries" FOR EACH ROW EXECUTE FUNCTION bump_revision();
