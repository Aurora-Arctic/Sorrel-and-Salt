import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { REPO_ROOT } from '../support/paths';

import {
  ACK_LINE_RE,
  changedMigrations,
  readAcknowledgement,
  report,
  resolveDefaultBase,
  resolveFilesToScan,
  scanFile,
  scanSql,
  sidecarPath,
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
const MIGRATIONS = join(REPO_ROOT, 'src', 'db', 'migrations');

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

// MB.48 — the acknowledgement moves beside the migration.
//
// It used to live in the PR body, which is the wrong home for a fact about a
// file: visible from one branch base, gone on merge. Release 0.2.0's PR failed
// this check and was merged past it, because `resolveDefaultBase()` maps
// `release/*` to `origin/main` and a release PR therefore rescans every
// migration since the last release — by which point the bodies that
// acknowledged them are two merges in the past.
//
// The sidecar `src/db/migrations/<tag>.ack.md` is also STRICTLY STRONGER than
// what it replaces, and that is the part worth pinning. One line in a PR body
// blessed every finding in the diff, whatever file it was in — which is
// precisely how a release carrying an acknowledged `0017` and an unacknowledged
// `0002` would have passed on `0017`'s line alone. An acknowledgement now
// covers exactly the migration it was written for.
describe('the acknowledgement sidecar', () => {
  const drop = (file: string) => ({
    file,
    rule: 'DROP (any object)',
    statement: 'DROP TABLE t',
  });

  const ACK = 'Destructive DDL acknowledged: the column is gone from every reader.';

  /**
   * A fake sidecar reader, so these cases never touch the real migrations.
   * Keyed by SIDECAR path and resolved through `sidecarPath`, which is the
   * same derivation the real reader makes — a map keyed by the migration path
   * would look right and match nothing, leaving several cases below passing
   * because every lookup returned undefined.
   */
  const sidecars =
    (map: Record<string, string>) =>
    (file: string): string | undefined =>
      map[sidecarPath(file)];

  it('derives the sidecar path from the migration beside it', () => {
    expect(sidecarPath('src/db/migrations/0002_solid_marauders.sql')).toBe(
      'src/db/migrations/0002_solid_marauders.ack.md',
    );
    expect(sidecarPath('src/db/migrations/0017_custom-spell-ingredients.sql')).toBe(
      'src/db/migrations/0017_custom-spell-ingredients.ack.md',
    );
  });

  it('passes a clean migration, which has nothing to acknowledge', () => {
    expect(report([], sidecars({}))).toBe(0);
  });

  it('fails a destructive migration whose sidecar is absent', () => {
    expect(report([drop('src/db/migrations/0002_a.sql')], sidecars({}))).toBe(1);
  });

  it('passes one whose sidecar carries the line', () => {
    expect(
      report(
        [drop('src/db/migrations/0002_a.sql')],
        sidecars({ 'src/db/migrations/0002_a.ack.md': ACK }),
      ),
    ).toBe(0);
  });

  // The case that names the whole task. Two files, one acknowledged: under the
  // PR-body rule this passed on the other file's line.
  it('fails when one of two files is acknowledged and the other is not', () => {
    const findings = [drop('src/db/migrations/0002_a.sql'), drop('src/db/migrations/0017_b.sql')];

    expect(report(findings, sidecars({ 'src/db/migrations/0017_b.ack.md': ACK }))).toBe(1);
    expect(report(findings, sidecars({ 'src/db/migrations/0002_a.ack.md': ACK }))).toBe(1);
    expect(
      report(
        findings,
        sidecars({
          'src/db/migrations/0002_a.ack.md': ACK,
          'src/db/migrations/0017_b.ack.md': ACK,
        }),
      ),
    ).toBe(0);
  });

  it("does not let one migration's sidecar cover another's findings", () => {
    expect(
      report(
        [drop('src/db/migrations/0002_a.sql')],
        sidecars({ 'src/db/migrations/0017_b.ack.md': ACK }),
      ),
    ).toBe(1);
  });

  it('fails a sidecar that exists but carries no reason', () => {
    for (const body of [
      '',
      '# 0002\n\nSome prose and no line.\n',
      'Destructive DDL acknowledged:',
    ]) {
      expect(
        report(
          [drop('src/db/migrations/0002_a.sql')],
          sidecars({ 'src/db/migrations/0002_a.ack.md': body }),
        ),
      ).toBe(1);
    }
  });

  it('wants a reason, not a bare line', () => {
    expect(ACK_LINE_RE.test('Destructive DDL acknowledged:')).toBe(false);
    expect(ACK_LINE_RE.test('Destructive DDL acknowledged:   ')).toBe(false);
    expect(ACK_LINE_RE.test('destructive ddl acknowledged: lowercase counts')).toBe(true);
  });

  // The line is anchored at the start of a line, which is what lets a Markdown
  // sidecar match the same regex a PR body used to. A prose paragraph around it
  // must not.
  it('reads the line out of a Markdown sidecar, around prose', () => {
    const body = [
      '# 0002_solid_marauders',
      '',
      'Destructive DDL acknowledged: uniqueness is re-expressed as a partial index.',
      '',
      'Longer argument follows.',
    ].join('\n');

    expect(
      report(
        [drop('src/db/migrations/0002_a.sql')],
        sidecars({ 'src/db/migrations/0002_a.ack.md': body }),
      ),
    ).toBe(0);
  });
});

// Reading the sidecar off disk is the half the injected reader above cannot
// cover, and it is the half CI actually runs.
describe('reading a sidecar off disk', () => {
  let dir: string;

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'ack-'));
    writeFileSync(join(dir, 'acknowledged.sql'), 'DROP TABLE t;\n');
    writeFileSync(join(dir, 'acknowledged.ack.md'), 'Destructive DDL acknowledged: fine.\n');
    writeFileSync(join(dir, 'bare.sql'), 'DROP TABLE t;\n');
  });

  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('finds the sidecar beside the migration', () => {
    expect(readAcknowledgement(join(dir, 'acknowledged.sql'))).toMatch(/acknowledged: fine/i);
  });

  it('returns undefined when there is none, rather than throwing', () => {
    expect(readAcknowledgement(join(dir, 'bare.sql'))).toBeUndefined();
  });
});

// The PR-body path is retired, not OR-ed with the sidecar. An OR would keep the
// uncorrelated hole open — one line still blessing every file — so the point of
// the task would be lost while appearing to be delivered. With the body gone
// the check reads nothing from GitHub at all, which is what lets
// `make act-check CHECK=destructive-ddl` prove the scan rather than the wiring.
describe('the retired PR-body path', () => {
  const sources = [
    'scripts/check-destructive-ddl.ts',
    '.github/workflows/checks.yml',
    '.github/workflows/pr-gate.yml',
  ];

  it.each(sources)('%s no longer mentions the PR body', (file) => {
    const text = readFileSync(join(REPO_ROOT, file), 'utf8');
    expect(text).not.toContain('DESTRUCTIVE_DDL_PR_BODY');
    expect(text).not.toMatch(/pr-body:/);
  });

  it('still names the sidecar in the script, so the mechanism is discoverable', () => {
    const text = readFileSync(join(REPO_ROOT, 'scripts/check-destructive-ddl.ts'), 'utf8');
    expect(text).toContain('.ack.md');
  });
});

// The two migrations that carry findings today. This is the assertion that the
// sidecars are load-bearing rather than decorative: the repository's own
// `--all` audit is green, and it is green *because* of them.
describe('the migrations in this repository', () => {
  it('has a sidecar for every migration carrying destructive DDL', () => {
    const findings = readdirSync(MIGRATIONS)
      .filter((name) => name.endsWith('.sql'))
      .flatMap((name) => scanFile(join(MIGRATIONS, name)));

    // If this is ever empty the assertion below proves nothing, so say so.
    expect(findings.length).toBeGreaterThan(0);

    for (const file of new Set(findings.map((finding) => finding.file))) {
      const sidecar = join(REPO_ROOT, sidecarPath(file));
      expect(existsSync(sidecar), `${sidecarPath(file)} is missing`).toBe(true);
      expect(ACK_LINE_RE.test(readFileSync(sidecar, 'utf8'))).toBe(true);
    }
  });

  it('is green under --all, which used to be permanently red', () => {
    const findings = readdirSync(MIGRATIONS)
      .filter((name) => name.endsWith('.sql'))
      .flatMap((name) => scanFile(join(MIGRATIONS, name)));

    expect(report(findings)).toBe(0);
  });
});
