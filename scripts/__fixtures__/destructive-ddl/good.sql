-- Fixture for scripts/check-destructive-ddl.ts's --self-test mode. Not a
-- real migration. Purely additive — the expand half of expand/contract —
-- and should never trigger a finding.

ALTER TABLE spells ADD COLUMN title_v2 text;

ALTER TABLE spells ADD COLUMN visibility text NOT NULL DEFAULT 'private';

CREATE INDEX IF NOT EXISTS spells_title_v2_idx ON spells (title_v2);

-- The two DROPs that widen rather than narrow: old code kept writing values
-- the column still accepts.
ALTER TABLE spells ALTER COLUMN title_v2 DROP NOT NULL;

ALTER TABLE spells ALTER COLUMN visibility DROP DEFAULT;

-- Destructive words the rules must read as prose, not as DDL: inside a string
-- literal, inside a trailing comment, and inside a block comment.
COMMENT ON COLUMN spells.title_v2 IS 'never rename or drop this';

ALTER TABLE spells ADD COLUMN summary text; -- we drop column title next release

ALTER TABLE spells ADD COLUMN notes text; /* drop table spells once migrated */
