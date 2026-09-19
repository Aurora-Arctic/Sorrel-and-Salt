-- Fixture for scripts/check-destructive-ddl.ts's --self-test mode. Not a
-- real migration — never applied, never listed in src/db/migrations. One
-- statement per destructive rule the script knows about.

ALTER TABLE spells DROP COLUMN legacy_notes;

DROP TABLE legacy_imports;

DROP TYPE legacy_kind;

ALTER TABLE spells DROP CONSTRAINT spells_name_unique;

DROP INDEX spells_title_idx;

ALTER TABLE spells RENAME COLUMN name TO title;

ALTER TABLE spells ALTER COLUMN title TYPE varchar(50);

ALTER TABLE spells ALTER COLUMN title SET NOT NULL;

ALTER TABLE spells ADD COLUMN visibility text NOT NULL;
