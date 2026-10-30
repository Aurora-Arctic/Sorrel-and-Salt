-- M13.15: a spell's draft may have no title, and every spell carries a
-- revision counter (claude-docs/db/grimoire.md, "Revision (M13.15)";
-- claude-docs/design-decisions/m13.14-autosave.md). Expand-only: it drops no
-- object and narrows no column the deploy before it writes, so it needs no
-- destructive-DDL acknowledgement. `DROP NOT NULL` widens, and the new column
-- carries a default, so the deploy before it, which never names it, still
-- inserts.
--
-- Autosave writes the row on the first keystroke, before the member may have
-- named the spell, so `title` loses NOT NULL. The CHECK is the table's own
-- statement of "a title is required to complete".
ALTER TABLE "spells" ALTER COLUMN "title" DROP NOT NULL;--> statement-breakpoint
-- Every existing row takes the default, 1.
ALTER TABLE "spells" ADD COLUMN "revision" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "spells" ADD CONSTRAINT "spells_complete_has_title" CHECK ("spells"."status" <> 'complete' OR "spells"."title" IS NOT NULL);--> statement-breakpoint
-- Hand-written from here, as 0016 is: Drizzle cannot express a function or a
-- trigger.
--
-- One shared function rather than a per-table expression: v2's edit history
-- (DESIGN.md, "One generic revisions table") grows this same function to
-- write the `record_revisions` row from OLD and NEW, so the two counters
-- cannot disagree.
--
-- The assignment is unconditional: the counter detects a write, not a
-- change, so an UPDATE that changes nothing still moves it, and a value the
-- statement sets for `revision` loses.
CREATE OR REPLACE FUNCTION bump_revision() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
	NEW.revision := OLD.revision + 1;
	RETURN NEW;
END;
$$;
--> statement-breakpoint
-- Each table carrying `revision` adds its own trigger line in its own
-- migration, as each audited table does for `set_updated_at`;
-- tests/db/revision-trigger.test.ts fails a table that carries the column
-- without the trigger. Same name on every table: a trigger name is scoped to
-- its table.
CREATE OR REPLACE TRIGGER bump_revision BEFORE UPDATE ON "spells" FOR EACH ROW EXECUTE FUNCTION bump_revision();--> statement-breakpoint
-- `set_updated_at()` (0079) keeps a row's stamps when an UPDATE changed
-- nothing (MB.106), by comparing the whole row bar its stamps. Postgres runs a
-- table's BEFORE triggers in name order, so `bump_revision` has already moved
-- `revision` by the time it compares, and every save of a spell would read as
-- a change. `revision` joins the columns it leaves out of the comparison: the
-- counter is the database's bookkeeping, not the row's content, and leaving
-- it out holds whichever order the two triggers run in. Same name and
-- signature as 0079's, so every table's trigger picks the new body up
-- unchanged; the rest of the body is 0081's, whose seed and review columns
-- (M14.5) stay ignored beside it.
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
	ignored text[];
BEGIN
	IF current_setting('app.touch_row', true) IS DISTINCT FROM 'on' THEN
		SELECT ARRAY['updated_at', 'updated_by', 'seed_content_hash', 'curator_reviewed_at', 'curator_reviewed_by', 'revision']
			|| coalesce(array_agg(attname::text), '{}')
		INTO ignored
		FROM pg_attribute
		WHERE attrelid = TG_RELID AND attgenerated <> '' AND NOT attisdropped;
		IF (to_jsonb(NEW) - ignored) = (to_jsonb(OLD) - ignored) THEN
			NEW.updated_at := OLD.updated_at;
			NEW.updated_by := OLD.updated_by;
			RETURN NEW;
		END IF;
	END IF;
	NEW.updated_at := now();
	RETURN NEW;
END;
$$;
