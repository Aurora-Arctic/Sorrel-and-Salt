-- M13.23: an ingredient carries the revision counter a spell does, so an
-- autosave can name the revision it read (claude-docs/db/grimoire.md,
-- "Revision (M13.15)"). Expand-only: the column has a default, so the deploy
-- before it, which never names it, still inserts; existing rows take 1.
ALTER TABLE "ingredients" ADD COLUMN "revision" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
-- Hand-written from here: Drizzle cannot express a trigger. The function is
-- the one 0084 made.
CREATE OR REPLACE TRIGGER bump_revision BEFORE UPDATE ON "ingredients" FOR EACH ROW EXECUTE FUNCTION bump_revision();
