-- M1.18, DESIGN.md §5's second enforcement rule: `updated_at` is stamped by the
-- database, not by application code, so a fix made by hand in `psql` still
-- stamps it and the audit trail cannot be quietly bypassed.
--
-- `now()` rather than `clock_timestamp()`: it is the transaction timestamp, so
-- every row a transaction touches carries the same `updated_at`, and it matches
-- the `DEFAULT now()` the column already carries for inserts.
--
-- The assignment is unconditional. A value the statement supplied loses — that
-- is the whole point, since a hand-written `UPDATE ... SET updated_at = ...` is
-- exactly what this exists to override — and so does an UPDATE that changes
-- nothing else: a statement that touched the row is a touch.
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
	NEW.updated_at := now();
	RETURN NEW;
END;
$$;
--> statement-breakpoint
-- Attached to every table carrying the four audit stamps, and to nothing else.
-- Better Auth's three adapter tables (`accounts`, `sessions`, `verifications`)
-- have an `updated_at` and no `*_by` columns: nothing writes them through
-- `withAudit`, they are not part of the audit trail, and Better Auth's own
-- `$onUpdate` stamps them (src/db/schema/auth.ts).
--
-- Postgres has no `CREATE TRIGGER IF NOT EXISTS`; `CREATE OR REPLACE TRIGGER`
-- (14+) is the idempotent form, and re-applying this file is then a no-op
-- independently of the journal's own once-only bookkeeping — the reason
-- 0000 and 0011 carry an `IF NOT EXISTS`. It is not a `DROP`, so this
-- migration needs no destructive-DDL acknowledgement.
--
-- **A table added later does not get this trigger for free.** An event trigger
-- would attach one automatically, but creating one requires superuser and
-- `sorrel` is deliberately not one (claude-docs/db.md). So the pattern is
-- documented instead — a new audited table adds its own line here, in its own
-- migration — and `src/db/updated-at-trigger.test.ts` is what makes forgetting
-- it a failing test rather than a review note: it compares the tables carrying
-- the audit stamps against the tables carrying the trigger, both read from the
-- catalogue, so a sixteenth table reddens it without that file being edited.
--
-- The trigger takes the same name on every table: a trigger name is scoped to
-- its table rather than shared with indexes, so there is nothing for a table
-- prefix to disambiguate.
CREATE OR REPLACE TRIGGER set_updated_at BEFORE UPDATE ON "categories" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE OR REPLACE TRIGGER set_updated_at BEFORE UPDATE ON "category_groups" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE OR REPLACE TRIGGER set_updated_at BEFORE UPDATE ON "ingredient_categories" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE OR REPLACE TRIGGER set_updated_at BEFORE UPDATE ON "ingredient_folk_names" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE OR REPLACE TRIGGER set_updated_at BEFORE UPDATE ON "ingredient_form_groups" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE OR REPLACE TRIGGER set_updated_at BEFORE UPDATE ON "ingredient_forms" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE OR REPLACE TRIGGER set_updated_at BEFORE UPDATE ON "ingredients" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE OR REPLACE TRIGGER set_updated_at BEFORE UPDATE ON "inventory_items" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE OR REPLACE TRIGGER set_updated_at BEFORE UPDATE ON "spell_categories" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE OR REPLACE TRIGGER set_updated_at BEFORE UPDATE ON "spell_ingredients" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE OR REPLACE TRIGGER set_updated_at BEFORE UPDATE ON "spells" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE OR REPLACE TRIGGER set_updated_at BEFORE UPDATE ON "users" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE OR REPLACE TRIGGER set_updated_at BEFORE UPDATE ON "workspace_invitations" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE OR REPLACE TRIGGER set_updated_at BEFORE UPDATE ON "workspace_members" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE OR REPLACE TRIGGER set_updated_at BEFORE UPDATE ON "workspaces" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
