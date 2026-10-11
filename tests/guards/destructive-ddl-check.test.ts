import { describe, expect, it } from 'vitest';

import { scanSql } from '../../scripts/check-destructive-ddl';

// What the destructive-DDL check reads as destructive (MB.48;
// claude-docs/db/expand-contract.md): every DROP but the two that widen, and
// the four other forms an expand/contract migration avoids, read through
// comments and string literals. Which files it scans, the base it diffs
// against and the acknowledgement sidecar are the CI leg's to exercise, and
// the script's own --self-test runs its fixtures end to end.

const rulesFor = (sql: string) => scanSql(sql, 'probe.sql').map((finding) => finding.rule);

describe('what counts as destructive', () => {
  it('flags every DROP, whatever the object', () => {
    expect(rulesFor('ALTER TABLE spells DROP COLUMN legacy_notes')).toContain('DROP (any object)');
    expect(rulesFor('DROP TABLE legacy_imports')).toContain('DROP (any object)');
    expect(rulesFor('DROP TYPE legacy_kind')).toContain('DROP (any object)');
    expect(rulesFor('ALTER TABLE users DROP CONSTRAINT users_email_unique')).toContain(
      'DROP (any object)',
    );
    expect(rulesFor('DROP INDEX spells_title_idx')).toContain('DROP (any object)');
    expect(rulesFor('DROP FUNCTION set_updated_at()')).toContain('DROP (any object)');
  });

  it('lets the two DROPs that widen through', () => {
    expect(rulesFor('ALTER TABLE spells ALTER COLUMN title DROP NOT NULL')).toEqual([]);
    expect(rulesFor('ALTER TABLE spells ALTER COLUMN title DROP DEFAULT')).toEqual([]);
  });

  it('flags the other four forms', () => {
    expect(rulesFor('ALTER TABLE spells RENAME COLUMN name TO title')).toContain(
      'RENAME (column or table)',
    );
    expect(rulesFor('ALTER TABLE spells ALTER COLUMN title TYPE varchar(50)')[0]).toMatch(
      /ALTER COLUMN/,
    );
    expect(rulesFor('ALTER TABLE spells ALTER COLUMN title SET NOT NULL')).toContain(
      'SET NOT NULL',
    );
    expect(rulesFor('ALTER TABLE spells ADD COLUMN visibility text NOT NULL')).toContain(
      'ADD COLUMN ... NOT NULL without a DEFAULT',
    );
  });

  it('leaves the additive forms alone', () => {
    expect(rulesFor('CREATE TABLE t (id uuid NOT NULL, name text NOT NULL)')).toEqual([]);
    // Drizzle writes DEFAULT before NOT NULL.
    expect(rulesFor('ALTER TABLE t ADD COLUMN a int DEFAULT 0 NOT NULL')).toEqual([]);
    expect(rulesFor('CREATE INDEX IF NOT EXISTS t_a_idx ON t (a)')).toEqual([]);
  });

  it('reads through comments and string literals rather than matching their text', () => {
    expect(rulesFor("COMMENT ON COLUMN spells.title IS 'never rename or drop this'")).toEqual([]);
    expect(rulesFor('ALTER TABLE t ADD COLUMN a int -- we drop column b next release')).toEqual([]);
    expect(rulesFor('ALTER TABLE t ADD COLUMN a int /* drop table t once migrated */')).toEqual([]);
    // An apostrophe in a comment must not open a literal that swallows the next statement.
    expect(rulesFor("-- don't forget\nALTER TABLE spells DROP COLUMN legacy_notes;\n")).toContain(
      'DROP (any object)',
    );
  });

  it('judges a leading comment block and its statement separately', () => {
    const sql = [
      '-- pg_trgm backs the fuzzy duplicate-name warning',
      '-- No other extension is named anywhere in the design.',
      'CREATE EXTENSION IF NOT EXISTS pg_trgm;',
    ].join('\n');

    expect(rulesFor(sql)).toEqual([]);
  });

  it('reports the statement without Drizzle’s breakpoint marker', () => {
    const [finding] = scanSql(
      '--> statement-breakpoint\nALTER TABLE users ADD COLUMN created_by uuid NOT NULL;',
      'probe.sql',
    );

    expect(finding.statement).not.toMatch(/statement-breakpoint/);
    expect(finding.statement).toMatch(/ALTER TABLE users ADD COLUMN/);
  });
});
