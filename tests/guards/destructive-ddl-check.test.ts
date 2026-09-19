import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { REPO_ROOT } from '../support/paths';

import {
  ACK_LINE_RE,
  changedMigrations,
  report,
  resolveDefaultBase,
  resolveFilesToScan,
  scanFile,
  scanSql,
} from '../../scripts/check-destructive-ddl';

// MB.37's guard over M1.5's destructive-DDL check. CLAUDE.md rule 10 —
// migrations are expand/contract and forward-only — has no database object to
// attach to, so per the sweep-task rule it lands as a mechanism (the script)
// plus this test, which pins the three things that were wrong when MB.37
// found them:
//
//   1. The file list is scoped to what *this branch* adds. The old no-argument
//      fallback scanned every committed migration, so it stayed red forever
//      once one acknowledged migration existed (0002, merged in PR #73).
//   2. Only `*.sql` is ever scanned. CI was handing the script
//      `migrations/meta/*.json` alongside the real migration — the same defect
//      MB.4 fixed one layer up, at the paths filter.
//   3. `DROP` means every object, not just COLUMN and TABLE. `DROP TYPE`,
//      `DROP CONSTRAINT` and `DROP INDEX` all passed before; 0002's
//      `DROP CONSTRAINT users_email_unique` went through unflagged.
//
// Every case below fails with its guard removed — that is the point of it
// being here rather than in the script's own --self-test, which can only
// exercise the two fixture files.

const FIXTURES = join(REPO_ROOT, 'scripts', '__fixtures__', 'destructive-ddl');

/** An env with the file list set, so nothing below ever reaches git. */
const withFiles = (raw: string) => ({ DESTRUCTIVE_DDL_FILES: raw });

const rulesFor = (sql: string) => scanSql(sql, 'probe.sql').map((finding) => finding.rule);

describe('which files are scanned', () => {
  it('scans nothing when the env list is set but empty — CI saying "no migrations changed"', () => {
    expect(resolveFilesToScan([], withFiles(''))).toEqual([]);
  });

  it('parses the JSON array dorny/paths-filter emits', () => {
    const files = resolveFilesToScan([], withFiles('["src/db/migrations/0004_black_slyde.sql"]'));

    expect(files).toEqual([join(REPO_ROOT, 'src/db/migrations/0004_black_slyde.sql')]);
  });

  it('drops migrations/meta/*.json from the JSON list rather than scanning it as SQL', () => {
    const files = resolveFilesToScan(
      [],
      withFiles(
        '["src/db/migrations/0004_black_slyde.sql","src/db/migrations/meta/0004_snapshot.json","src/db/migrations/meta/_journal.json"]',
      ),
    );

    expect(files).toEqual([join(REPO_ROOT, 'src/db/migrations/0004_black_slyde.sql')]);
  });

  it('drops non-SQL from a newline list and from argv too', () => {
    const newline = 'src/db/migrations/0004_black_slyde.sql\nsrc/db/migrations/meta/_journal.json';

    expect(resolveFilesToScan([], withFiles(newline))).toEqual([
      join(REPO_ROOT, 'src/db/migrations/0004_black_slyde.sql'),
    ]);
    expect(
      resolveFilesToScan(
        ['src/db/migrations/0004_black_slyde.sql', 'src/db/migrations/meta/_journal.json'],
        {},
      ),
    ).toEqual([join(REPO_ROOT, 'src/db/migrations/0004_black_slyde.sql')]);
  });
});

describe('which base a branch diffs against — the Gitflow rules gitflow.yml enforces', () => {
  it('sends a feature branch at staging and a hotfix at main', () => {
    expect(resolveDefaultBase('feature/mb.37-restore-the-gate')).toBe('origin/staging');
    expect(resolveDefaultBase('main-sync/2026-09-18-01-00-00')).toBe('origin/staging');
    expect(resolveDefaultBase('staging')).toBe('origin/staging');
    expect(resolveDefaultBase('hotfix/urgent')).toBe('origin/main');
    expect(resolveDefaultBase('release/1.2.3')).toBe('origin/main');
  });

  it('falls back to staging for a branch matching no prefix', () => {
    expect(resolveDefaultBase('scratch')).toBe('origin/staging');
  });
});

describe('the branch diff', () => {
  let repo: string;

  const git = (...args: string[]) => execFileSync('git', args, { cwd: repo, encoding: 'utf8' });
  const migration = (name: string, sql: string) =>
    writeFileSync(join(repo, 'src/db/migrations', name), sql);

  beforeAll(() => {
    repo = mkdtempSync(join(tmpdir(), 'ddl-diff-'));
    mkdirSync(join(repo, 'src/db/migrations/meta'), { recursive: true });
    git('init', '--initial-branch=staging');
    git('config', 'user.email', 'test@example.com');
    git('config', 'user.name', 'Test');

    // Already on staging when the branch is cut — must never be scanned again.
    migration('0001_base.sql', 'CREATE TABLE users (id uuid PRIMARY KEY);\n');
    writeFileSync(join(repo, 'src/db/migrations/meta/_journal.json'), '{"entries":[]}\n');
    git('add', '-A');
    git('commit', '-m', 'base');

    git('checkout', '-b', 'feature/probe');
    migration('0002_committed.sql', 'ALTER TABLE users ADD COLUMN nickname text;\n');
    writeFileSync(join(repo, 'src/db/migrations/meta/_journal.json'), '{"entries":[1]}\n');
    git('add', '-A');
    git('commit', '-m', 'committed migration');

    // Generated by `db:generate` and not yet staged — the state a task is in
    // when it runs the check locally.
    migration('0003_untracked.sql', 'ALTER TABLE users ADD COLUMN pronouns text;\n');
  });

  afterAll(() => rmSync(repo, { recursive: true, force: true }));

  it('lists what the branch adds — committed and untracked — and never the base migration', () => {
    const files = changedMigrations('staging', repo).map((file) => file.replace(`${repo}/`, ''));

    expect(files.sort()).toEqual([
      'src/db/migrations/0002_committed.sql',
      'src/db/migrations/0003_untracked.sql',
    ]);
  });

  it('refuses a base that does not resolve rather than scanning everything', () => {
    expect(() => changedMigrations('origin/nope', repo)).toThrow(/origin\/nope/);
  });

  it('is what a bare local run scans — not every migration ever committed', () => {
    const files = resolveFilesToScan([], {}, { base: 'staging', cwd: repo }).map((file) =>
      file.replace(`${repo}/`, ''),
    );

    expect(files.sort()).toEqual([
      'src/db/migrations/0002_committed.sql',
      'src/db/migrations/0003_untracked.sql',
    ]);
  });

  it('scans the whole repository only when asked to, under --all', () => {
    const all = resolveFilesToScan([], {}, { all: true }).map((file) => file.replace(/.*\//, ''));

    // The real repository's migrations — 0002 is the one already acknowledged
    // when it landed, and the reason --all is an audit rather than a gate.
    expect(all).toContain('0002_solid_marauders.sql');
    expect(all.every((file) => file.endsWith('.sql'))).toBe(true);
  });
});

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
    // An apostrophe inside a comment must not open a literal that swallows the
    // statement after it.
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

describe('the fixtures the --self-test runs', () => {
  it('fires every rule on bad.sql', () => {
    const rules = new Set(scanFile(join(FIXTURES, 'bad.sql')).map((finding) => finding.rule));

    for (const expected of ['DROP', 'RENAME', 'ALTER COLUMN', 'SET NOT NULL', 'ADD COLUMN']) {
      expect(
        [...rules].some((rule) => rule.includes(expected)),
        `bad.sql no longer triggers ${expected}`,
      ).toBe(true);
    }
  });

  it('fires nothing on good.sql', () => {
    expect(scanFile(join(FIXTURES, 'good.sql'))).toEqual([]);
  });
});

describe('the acknowledgement line', () => {
  const finding = [{ file: 'probe.sql', rule: 'DROP (any object)', statement: 'DROP TABLE t' }];

  it('fails a destructive migration with no acknowledgement', () => {
    expect(report(finding, undefined)).toBe(1);
    expect(report(finding, 'A PR body that says nothing about it.')).toBe(1);
  });

  it('passes one the PR body acknowledges', () => {
    expect(
      report(finding, 'Destructive DDL acknowledged: the column is gone from every reader.'),
    ).toBe(0);
  });

  it('passes a clean migration whatever the body says', () => {
    expect(report([], undefined)).toBe(0);
  });

  it('wants a reason, not a bare line', () => {
    expect(ACK_LINE_RE.test('Destructive DDL acknowledged:')).toBe(false);
    expect(ACK_LINE_RE.test('Destructive DDL acknowledged:   ')).toBe(false);
    expect(ACK_LINE_RE.test('destructive ddl acknowledged: lowercase counts')).toBe(true);
  });
});
