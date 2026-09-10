#!/usr/bin/env node
// M1.5 gate — flag destructive DDL in new/changed migrations unless the PR
// body carries an explicit acknowledgement line.
//
// CLAUDE.md's "Non-negotiable architecture rules" #10: migrations are
// expand/contract and forward-only — no down migrations exist in this repo
// (Drizzle doesn't generate them, and nothing here should either), so the
// only rollback path is a deploy rollback to older app code running against
// the *same* schema. That only works if every migration is backward
// compatible with the previous release: adding a column is safe, but
// DROP COLUMN, DROP TABLE, a RENAME, a column type change, or a new NOT NULL
// constraint can all break code that hasn't been redeployed yet. See
// claude-docs/db.md's Migrations section for the full policy and a worked
// rename example across two releases.
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
// PR*. This script itself doesn't compute that list — it takes filenames as
// positional args, because "diff against the PR base" is a CI-context
// question (see .github/workflows/destructive-ddl.yml, which gets it from
// pr-gate.yml's dorny/paths-filter `list-files: json` output — the same
// action already used for lint/typecheck/build path filtering, rather than
// reaching for a second changed-files action).
//
// LOCAL / AD HOC USE — run with no arguments and it falls back to scanning
// every file under src/db/migrations/*.sql, which is what makes
// `npm run check:destructive-ddl` a useful smoke test on its own (and is
// why it's wired to `make check-destructive-ddl` and `act-destructive-ddl`,
// but deliberately NOT into the `pre-commit` chain — "what changed in this
// PR" isn't a well-defined question against an arbitrary local branch; this
// is a PR-gate-time check, not a pre-commit hook). That fallback is *only*
// for no-args invocations — the CI workflow always passes an explicit
// (possibly empty) file list via DESTRUCTIVE_DDL_FILES, so "no migrations
// changed" there correctly checks nothing rather than falling back to a
// full-repo scan.
//
// LIMITATIONS — type-narrowing detection is unreliable from raw SQL text
// (e.g. telling `varchar(50) -> varchar(100)` apart from `varchar(100) ->
// varchar(50)` would need a real SQL parser and the previous column
// definition). Rather than guess, every `ALTER COLUMN ... TYPE` is flagged
// for human review, whether or not it actually narrows.
//
// Usage:
//   npm run check:destructive-ddl                       # scan every committed migration
//   npm run check:destructive-ddl -- <file> [file...]    # scan only these files
//   npm run check:destructive-ddl -- --self-test         # run the fixtures under
//                                                         # scripts/__fixtures__/destructive-ddl/
//                                                         # as a permanent regression check
//
// Env:
//   DESTRUCTIVE_DDL_FILES  newline-separated file list. Takes precedence over
//                          argv when *set* (even to an empty string) — this is
//                          how CI distinguishes "no migrations changed" (empty
//                          string, check nothing) from "run locally with no
//                          args" (unset, fall back to scanning everything).
//   DESTRUCTIVE_DDL_PR_BODY  the PR body text to search for the ack line.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const REPO_ROOT = join(import.meta.dirname, '..');
const MIGRATIONS_DIR = join(REPO_ROOT, 'src', 'db', 'migrations');
const FIXTURES_DIR = join(import.meta.dirname, '__fixtures__', 'destructive-ddl');

export const ACK_LINE_RE = /^destructive ddl acknowledged:\s*\S.*$/im;

interface Finding {
  file: string;
  rule: string;
  statement: string;
}

// One rule per destructive DDL form named in CLAUDE.md rule 10 / the M1.5
// task. Matched per-statement (the file is split on `;`) rather than
// per-line so a multi-line `ALTER TABLE ... ADD COLUMN ... NOT NULL` is
// judged as a whole — in particular so "does this statement contain DEFAULT
// anywhere" isn't fooled by DEFAULT appearing on its own line.
const RULES: { name: string; test: (statement: string) => boolean }[] = [
  {
    name: 'DROP COLUMN',
    test: (s) => /\bdrop\s+column\b/i.test(s),
  },
  {
    name: 'DROP TABLE',
    test: (s) => /\bdrop\s+table\b/i.test(s),
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

function splitStatements(sql: string): string[] {
  // Strip `--` line comments before splitting on `;` — otherwise a leading
  // comment block with no semicolon of its own merges into the first real
  // statement's chunk, and a naive `startsWith('--')` filter then drops that
  // whole chunk (statement included) instead of just the comment.
  const withoutComments = sql
    .split('\n')
    .map((line) => (line.trim().startsWith('--') ? '' : line))
    .join('\n');
  return withoutComments
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function scanFile(path: string): Finding[] {
  const sql = readFileSync(path, 'utf8');
  const findings: Finding[] = [];
  for (const statement of splitStatements(sql)) {
    for (const rule of RULES) {
      if (rule.test(statement)) {
        findings.push({
          file: relative(REPO_ROOT, path),
          rule: rule.name,
          statement: statement.replace(/\s+/g, ' ').slice(0, 160),
        });
      }
    }
  }
  return findings;
}

// Every *.sql directly under src/db/migrations — drizzle-kit doesn't nest
// migrations, so this doesn't need to recurse the way check-component-stories
// does for src/components.
function allCommittedMigrations(): string[] {
  if (!existsSync(MIGRATIONS_DIR)) return [];
  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .map((name) => join(MIGRATIONS_DIR, name));
}

function resolveFilesToScan(argv: string[]): string[] {
  const envFiles = process.env.DESTRUCTIVE_DDL_FILES;
  if (envFiles !== undefined) {
    return envFiles
      .split('\n')
      .map((f) => f.trim())
      .filter((f) => f.length > 0)
      .map((f) => (f.startsWith('/') ? f : join(REPO_ROOT, f)));
  }
  if (argv.length > 0) {
    return argv.map((f) => (f.startsWith('/') ? f : join(REPO_ROOT, f)));
  }
  return allCommittedMigrations();
}

function report(findings: Finding[], prBody: string | undefined): number {
  if (findings.length === 0) {
    console.log('check:destructive-ddl — no destructive DDL found.');
    return 0;
  }

  console.error(`check:destructive-ddl — ${findings.length} destructive statement(s) found:\n`);
  for (const f of findings) {
    console.error(`  ${f.file} — ${f.rule}`);
    console.error(`    ${f.statement}`);
  }

  const acked = ACK_LINE_RE.test(prBody ?? '');
  if (acked) {
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

// Exercises the checked-in fixtures so this script has a permanent
// regression test even though no test runner exists yet (Vitest arrives
// M1.7). Not part of any npm script other than this flag — kept out of
// pre-commit/CI for the same reason the main check is: it's a developer
// convenience, not a gate.
function selfTest(): number {
  let failed = false;

  const bad = scanFile(join(FIXTURES_DIR, 'bad.sql'));
  if (bad.length === 0) {
    console.error('self-test FAILED: bad.sql should have triggered findings but triggered none.');
    failed = true;
  } else {
    console.log(`self-test: bad.sql triggered ${bad.length} finding(s), as expected.`);
  }
  const badRules = new Set(bad.map((f) => f.rule));
  const expectedRuleSubstrings = [
    'DROP COLUMN',
    'DROP TABLE',
    'RENAME',
    'ALTER COLUMN',
    'SET NOT NULL',
    'ADD COLUMN',
  ];
  for (const expected of expectedRuleSubstrings) {
    if (![...badRules].some((r) => r.includes(expected))) {
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

  const files = resolveFilesToScan(argv.filter((a) => a !== '--self-test'));
  const findings = files.flatMap(scanFile);
  process.exit(report(findings, process.env.DESTRUCTIVE_DDL_PR_BODY));
}

main();
