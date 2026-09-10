-- Fixture for scripts/check-destructive-ddl.ts's --self-test mode. Not a
-- real migration. Purely additive — the expand half of expand/contract —
-- and should never trigger a finding.

ALTER TABLE spells ADD COLUMN title_v2 text;

ALTER TABLE spells ADD COLUMN visibility text NOT NULL DEFAULT 'private';

CREATE INDEX IF NOT EXISTS spells_title_v2_idx ON spells (title_v2);
