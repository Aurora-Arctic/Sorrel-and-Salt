-- M10.3, DESIGN.md §5: a spell is `workspace` — readable by every member,
-- viewers included — or `private`, readable by its author alone. The author is
-- `created_by`; §5 gives spells no separate author column.
--
-- The column is scheduled here rather than with the rest of the table (M10.2)
-- so M1.23's demo spells exist before it lands, which is what makes "existing
-- seeded spells migrate to workspace visibility" a criterion that can be
-- tested rather than one satisfied by an empty table (TASKS.md, "Breaking the
-- M1.23 ↔ M10.3 cycle").
--
-- `DEFAULT 'workspace' NOT NULL` in one statement is why that migration needs
-- no backfill and no acknowledgement: Postgres 11+ stores the default in the
-- catalogue rather than rewriting the table, so every row already written is
-- `workspace` the moment this commits, and rule 10's destructive-DDL check
-- exempts a NOT NULL addition that carries a default for exactly that reason.
-- The seed's own spells are the rows it fills.
CREATE TYPE "public"."spell_visibility" AS ENUM('private', 'workspace');--> statement-breakpoint
ALTER TABLE "spells" ADD COLUMN "visibility" "spell_visibility" DEFAULT 'workspace' NOT NULL;
