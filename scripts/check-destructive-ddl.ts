#!/usr/bin/env node
// M1.5 gate — flag destructive DDL in new/changed migrations unless the PR
// body carries an explicit acknowledgement line.
//
// CLAUDE.md's "Non-negotiable architecture rules" #10: migrations are
// expand/contract and forward-only — no down migrations exist in this repo
// (Drizzle doesn't generate them, and nothing here should either), so the
// only rollback path is a deploy rollback to older app code running against
// the *same* schema. That only works if every migration is backward
// compatible with the previous release: adding a column is safe, but a DROP,
// a RENAME, a column type change, or a new NOT NULL constraint can all break
// code that hasn't been redeployed yet. See claude-docs/db.md's Migrations
// section for the full policy and a worked rename example across two
// releases.
//
// This script does two things:
//   1. Scans a set of migration .sql files for destructive DDL forms.
//   2. If any are found, requires an acknowledgement line in the PR body —
//      exact format below — before allowing a pass.
//
// It never blocks a migration that contains no destructive DDL, regardless
// of the PR body.
//
// ACKNOWLEDGEMENT LINE — a line anywhere in the PR body, case-insensitive,
// of the form:
//
//   Destructive DDL acknowledged: <reason>
//
// (a non-empty reason is required after the colon). See ACK_LINE_RE below —
// keep it and claude-docs/db.md in sync if the wording ever changes.
//
// WHICH FILES ARE CHECKED — not every migration ever committed (those were
// already reviewed when they landed), only the ones new or changed *in this
// branch*. Three sources, in precedence order:
//
//   1. DESTRUCTIVE_DDL_FILES, when set — how CI passes the real changed-file
//      list. Set-but-empty means "no migrations changed", which checks
//      nothing rather than falling through to the diff below.
//   2. Explicit filenames as positional arguments.
//   3. Otherwise, a diff of this branch against its Gitflow base (see
//      resolveDefaultBase) — every migration the branch adds or edits,
//      including one just generated and not yet committed. `--base <ref>`
//      overrides the base; `--all` scans every committed migration instead,
//      which is an audit rather than a gate and stays red on any migration
//      that was acknowledged when it landed.
//
// Whatever the source, only `*.sql` is ever scanned. CI's file list comes
// from a `src/db/migrations/**` paths filter, which also matches the
// `meta/*.snapshot.json` and `meta/_journal.json` Drizzle writes beside each
// migration — MB.4 fixed the same defect for YAML one layer up, at the
// filter; MB.37 made it unbuildable here, where the list is consumed.
//
// LIMITATIONS
//   - Type-narrowing detection is unreliable from raw SQL text (telling
//     `varchar(50) -> varchar(100)` apart from the reverse would need a real
//     SQL parser and the previous column definition). Rather than guess,
//     every `ALTER COLUMN ... TYPE` is flagged for human review, whether or
//     not it actually narrows.
//   - `ALTER INDEX ... RENAME` is flagged, though renaming an index cannot
//     break a deploy rollback. Drizzle never emits one; a hand-written one
//     costs an acknowledgement line saying so.
//   - Statements are split on `;` with no awareness of dollar-quoted bodies,
//     so a PL/pgSQL function (M1.18's audit trigger, when it lands) is judged
//     as several fragments rather than one statement. Harmless for the rules
//     as they stand — none of them spans a `BEGIN ... END` — but it is the
//     thing to fix first if a rule ever needs to read a whole body.
//
// Usage:
//   npm run check:destructive-ddl                        # what this branch adds
//   npm run check:destructive-ddl -- --base origin/main  # against another base
//   npm run check:destructive-ddl -- --all               # every committed migration
//   npm run check:destructive-ddl -- <file> [file...]    # scan only these files
//   npm run check:destructive-ddl -- --self-test         # run the fixtures under
//                                                        # scripts/__fixtures__/destructive-ddl/
//
// Env:
//   DESTRUCTIVE_DDL_FILES    the file list, as either a JSON array (what
//                            dorny/paths-filter's `list-files: json` emits,
//                            passed through checks.yml) or newline-separated
//                            paths. Takes precedence over argv when *set*
//                            (even to an empty string) — this is how CI
//                            distinguishes "no migrations changed" from "run
//                            locally with no args".
//   DESTRUCTIVE_DDL_PR_BODY  the PR body text to search for the ack line.

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const REPO_ROOT = join(import.meta.dirname, '..');
const MIGRATIONS_DIR = join(REPO_ROOT, 'src', 'db', 'migrations');
const FIXTURES_DIR = join(import.meta.dirname, '__fixtures__', 'destructive-ddl');

/** The pathspec every git query below is scoped by — `.sql` only, never `meta/`. */
const MIGRATIONS_PATHSPEC = 'src/db/migrations/*.sql';

export const ACK_LINE_RE = /^destructive ddl acknowledged:\s*\S.*$/im;

export interface Finding {
  file: string;
  rule: string;
  statement: string;
}

// One rule per destructive DDL form named in CLAUDE.md rule 10. Matched
// per-statement (the file is split on `;`) rather than per-line so a
// multi-line `ALTER TABLE ... ADD COLUMN ... NOT NULL` is judged as a whole —
// in particular so "does this statement contain DEFAULT anywhere" isn't fooled
// by DEFAULT appearing on its own line.
export const RULES: { name: string; test: (statement: string) => boolean }[] = [
  {
    // Rule 10 says "DROP", not "DROP COLUMN and DROP TABLE" — a dropped type,
    // constraint, index, function or view breaks a rolled-back release just as
    // readily as a dropped column. The two exceptions widen rather than
    // narrow: dropping a NOT NULL or a DEFAULT only admits values the old code
    // was already writing. An index rebuild (Drizzle emits DROP INDEX +
    // CREATE INDEX when a predicate changes) is deliberately inside the rule —
    // dropping a unique index gives up a guarantee, and one line in the PR body
    // saying which is cheap.
    name: 'DROP (any object)',
    test: (s) => /\bdrop\s+(?!not\s+null\b)(?!default\b)\w/i.test(s),
  },
  {
    name: 'RENAME (column or table)',
    test: (s) => /\brename\b/i.test(s),
  },
  {
    name: 'ALTER COLUMN ... TYPE (possible narrowing — needs human review; see script header)',
    test: (s) => /\balter\s+column\b[^,;]*\btype\b/i.test(s),
  },
  {
    name: 'SET NOT NULL',
    test: (s) => /\bset\s+not\s+null\b/i.test(s),
  },
  {
    name: 'ADD COLUMN ... NOT NULL without a DEFAULT',
    test: (s) =>
      /\badd\s+column\b/i.test(s) && /\bnot\s+null\b/i.test(s) && !/\bdefault\b/i.test(s),
  },
];

// Removes what a rule must never read as SQL: `--` line comments (including
// Drizzle's `--> statement-breakpoint` marker), `/* */` block comments, and
// the contents of string literals. A single left-to-right scan rather than
// three regex passes, because the three forms nest in both directions — an
// apostrophe inside a comment (`-- don't`) would otherwise open a literal that
// swallows the next statement, and a `--` inside a literal would otherwise
// comment out the rest of the line. Double-quoted identifiers are copied
// through as-is: their contents are still SQL to the rules, but they cannot
// start a comment or a literal.
//
// Dollar-quoted bodies are not handled — see LIMITATIONS in the header.
function stripCommentsAndLiterals(sql: string): string {
  let out = '';
  let index = 0;

  while (index < sql.length) {
    const pair = sql.slice(index, index + 2);

    if (pair === '--') {
      const newline = sql.indexOf('\n', index);
      if (newline === -1) break;
      index = newline; // leave the newline itself — it separates statements
      continue;
    }

    if (pair === '/*') {
      let depth = 1; // Postgres nests block comments
      index += 2;
      while (index < sql.length && depth > 0) {
        if (sql.slice(index, index + 2) === '/*') {
          depth += 1;
          index += 2;
        } else if (sql.slice(index, index + 2) === '*/') {
          depth -= 1;
          index += 2;
        } else {
          index += 1;
        }
      }
      out += ' ';
      continue;
    }

    if (sql[index] === "'") {
      index += 1;
      while (index < sql.length) {
        if (sql[index] === "'" && sql[index + 1] === "'") {
          index += 2; // '' is an escaped quote, not the end
          continue;
        }
        if (sql[index] === "'") {
          index += 1;
          break;
        }
        index += 1;
      }
      out += "''"; // keep the statement shaped like SQL
      continue;
    }

    if (sql[index] === '"') {
      const close = sql.indexOf('"', index + 1);
      if (close === -1) break;
      out += sql.slice(index, close + 1);
      index = close + 1;
      continue;
    }

    out += sql[index];
    index += 1;
  }

  return out;
}

export function splitStatements(sql: string): string[] {
  return stripCommentsAndLiterals(sql)
    .split(';')
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

export function scanSql(sql: string, file: string): Finding[] {
  const findings: Finding[] = [];
  for (const statement of splitStatements(sql)) {
    for (const rule of RULES) {
      if (rule.test(statement)) {
        findings.push({
          file,
          rule: rule.name,
          statement: statement.replace(/\s+/g, ' ').slice(0, 160),
        });
      }
    }
  }
  return findings;
}

export function scanFile(path: string): Finding[] {
  return scanSql(readFileSync(path, 'utf8'), relative(REPO_ROOT, path));
}

/**
 * The branch a local run diffs against, from the branch's own prefix — the
 * same source/target rules .github/workflows/gitflow.yml enforces on a PR.
 * Anything unrecognised gets `staging`, the target every feature branch has.
 */
export function resolveDefaultBase(branch: string): string {
  if (/^(hotfix\/|release\/)/.test(branch)) return 'origin/main';
  return 'origin/staging';
}

function git(args: string[], cwd: string): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function lines(output: string): string[] {
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/**
 * Every migration this branch adds or edits, against `base`. Compares the
 * working tree (not HEAD) to the merge base, and adds untracked files, so a
 * migration `db:generate` has just written counts before it is committed.
 */
export function changedMigrations(base: string, cwd: string = REPO_ROOT): string[] {
  let mergeBase: string;
  try {
    mergeBase = git(['merge-base', base, 'HEAD'], cwd).trim();
  } catch {
    throw new Error(
      `check:destructive-ddl — cannot resolve '${base}'. Run \`git fetch origin\`, or pass ` +
        `--base <ref> to diff against something else.`,
    );
  }

  const changed = git(
    ['diff', '--name-only', '--diff-filter=AM', mergeBase, '--', MIGRATIONS_PATHSPEC],
    cwd,
  );
  const untracked = git(
    ['ls-files', '--others', '--exclude-standard', '--', MIGRATIONS_PATHSPEC],
    cwd,
  );

  return [...new Set([...lines(changed), ...lines(untracked)])].map((file) => join(cwd, file));
}

export function currentBranch(cwd: string = REPO_ROOT): string {
  return git(['rev-parse', '--abbrev-ref', 'HEAD'], cwd).trim();
}

// Every *.sql directly under src/db/migrations — drizzle-kit doesn't nest
// migrations, so this doesn't need to recurse the way the story guard in
// tests/guards/workshop-guards.test.ts does for src/components.
function allCommittedMigrations(): string[] {
  if (!existsSync(MIGRATIONS_DIR)) return [];
  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .map((name) => join(MIGRATIONS_DIR, name));
}

/**
 * The file list, from whichever source applies — and never anything but
 * `*.sql`, whatever the source handed over.
 */
export function resolveFilesToScan(
  argv: string[],
  // Deliberately not NodeJS.ProcessEnv: Next augments that type with a
  // required NODE_ENV, so a test could not pass a bare { DESTRUCTIVE_DDL_FILES }.
  env: Record<string, string | undefined> = process.env,
  options: { all?: boolean; base?: string; cwd?: string } = {},
): string[] {
  const absolute = (file: string) => (file.startsWith('/') ? file : join(REPO_ROOT, file));
  const sqlOnly = (files: string[]) => files.filter((file) => file.endsWith('.sql'));

  if (options.all) return allCommittedMigrations();

  const raw = env.DESTRUCTIVE_DDL_FILES;
  if (raw !== undefined) {
    let listed: string[];
    if (raw.trim().startsWith('[')) {
      try {
        listed = JSON.parse(raw) as string[];
      } catch {
        listed = [];
      }
    } else {
      listed = lines(raw);
    }
    return sqlOnly(listed.map((file) => file.trim()).filter(Boolean)).map(absolute);
  }

  if (argv.length > 0) return sqlOnly(argv).map(absolute);

  const cwd = options.cwd ?? REPO_ROOT;
  const base = options.base ?? resolveDefaultBase(currentBranch(cwd));
  const files = changedMigrations(base, cwd);
  console.log(
    files.length === 0
      ? `check:destructive-ddl — no migrations new or changed against ${base}.`
      : `check:destructive-ddl — ${files.length} migration(s) new or changed against ${base}:\n` +
          files.map((file) => `  ${relative(cwd, file)}`).join('\n'),
  );
  return files;
}

export function report(findings: Finding[], prBody: string | undefined): number {
  if (findings.length === 0) {
    console.log('check:destructive-ddl — no destructive DDL found.');
    return 0;
  }

  console.error(`check:destructive-ddl — ${findings.length} destructive statement(s) found:\n`);
  for (const finding of findings) {
    console.error(`  ${finding.file} — ${finding.rule}`);
    console.error(`    ${finding.statement}`);
  }

  if (ACK_LINE_RE.test(prBody ?? '')) {
    console.log(
      '\nAcknowledged — the PR body carries a "Destructive DDL acknowledged: <reason>" line. Passing.',
    );
    return 0;
  }

  console.error(
    '\nDestructive DDL needs an explicit acknowledgement in the PR body (CLAUDE.md · ' +
      'Non-negotiable architecture rules #10). Add a line reading:\n\n' +
      '  Destructive DDL acknowledged: <reason this is safe / how it was expand/contracted>\n\n' +
      "or, better, avoid the destructive change entirely — see claude-docs/db.md's Migrations " +
      'section for the expand/contract convention and a worked rename example.',
  );
  return 1;
}

// Exercises the checked-in fixtures end to end. tests/guards/destructive-ddl-check.test.ts
// is where the rules and the file-list resolution are actually pinned; this
// stays because it needs no test runner, which is what `make act-*` and a bare
// clone have.
function selfTest(): number {
  let failed = false;

  const bad = scanFile(join(FIXTURES_DIR, 'bad.sql'));
  if (bad.length === 0) {
    console.error('self-test FAILED: bad.sql should have triggered findings but triggered none.');
    failed = true;
  } else {
    console.log(`self-test: bad.sql triggered ${bad.length} finding(s), as expected.`);
  }
  const badRules = new Set(bad.map((finding) => finding.rule));
  const expectedRuleSubstrings = ['DROP', 'RENAME', 'ALTER COLUMN', 'SET NOT NULL', 'ADD COLUMN'];
  for (const expected of expectedRuleSubstrings) {
    if (![...badRules].some((rule) => rule.includes(expected))) {
      console.error(
        `self-test FAILED: expected a finding matching "${expected}" in bad.sql, got none.`,
      );
      failed = true;
    }
  }

  const noAck = report(bad, undefined);
  if (noAck !== 1) {
    console.error('self-test FAILED: bad.sql with no PR body should exit 1.');
    failed = true;
  }
  const withAck = report(
    bad,
    'Some description.\n\nDestructive DDL acknowledged: this is a throwaway fixture.\n',
  );
  if (withAck !== 0) {
    console.error('self-test FAILED: bad.sql with an ack line should exit 0.');
    failed = true;
  }

  const good = scanFile(join(FIXTURES_DIR, 'good.sql'));
  if (good.length !== 0) {
    console.error(
      `self-test FAILED: good.sql should have triggered no findings, got ${good.length}.`,
    );
    failed = true;
  } else {
    console.log('self-test: good.sql triggered no findings, as expected.');
  }
  const goodResult = report(good, undefined);
  if (goodResult !== 0) {
    console.error(
      'self-test FAILED: good.sql with no PR body should still exit 0 (nothing to acknowledge).',
    );
    failed = true;
  }

  if (failed) {
    console.error('\nself-test: FAILED');
    return 1;
  }
  console.log('\nself-test: PASSED');
  return 0;
}

function main(): void {
  const argv = process.argv.slice(2);

  if (argv.includes('--self-test')) {
    process.exit(selfTest());
  }

  const baseIndex = argv.indexOf('--base');
  const base = baseIndex === -1 ? undefined : argv[baseIndex + 1];
  if (baseIndex !== -1 && base === undefined) {
    console.error('check:destructive-ddl — --base needs a ref, e.g. --base origin/main.');
    process.exit(2);
  }

  const files = argv.filter(
    (arg, index) =>
      !arg.startsWith('--') && index !== baseIndex + 1 && arg !== '--all' && arg !== '--self-test',
  );

  let toScan: string[];
  try {
    toScan = resolveFilesToScan(files, process.env, { all: argv.includes('--all'), base });
  } catch (error) {
    console.error((error as Error).message);
    process.exit(2);
  }

  const findings = toScan.flatMap(scanFile);
  process.exit(report(findings, process.env.DESTRUCTIVE_DDL_PR_BODY));
}

if (import.meta.main) {
  main();
}
