#!/usr/bin/env node
// Flags destructive DDL in the migrations this branch adds or changes unless an
// acknowledgement sidecar (`<migration>.ack.md`, carrying a line matching
// ACK_LINE_RE) sits beside the migration. The policy, the five forms and the
// sidecar are in claude-docs/db.md, "Expand/contract and the destructive-DDL
// check"; keep ACK_LINE_RE and that doc in sync. It reads nothing from GitHub.
//
// The file list, in precedence order: DESTRUCTIVE_DDL_FILES (CI's changed-file
// list, JSON or newline-separated; set-but-empty means "nothing changed" and
// checks nothing), then positional filenames, then a diff against the
// branch's Gitflow base. Whatever the source, only `*.sql` is scanned.
//
// Limitations: every `ALTER COLUMN ... TYPE` is flagged whether or not it
// narrows, since telling the two apart needs a real SQL parser; `ALTER INDEX
// ... RENAME` is flagged though it cannot break a rollback.
//
// Usage:
//   npm run check:destructive-ddl                        # what this branch adds
//   npm run check:destructive-ddl -- --base origin/main  # against another base
//   npm run check:destructive-ddl -- --all               # every committed migration
//   npm run check:destructive-ddl -- <file> [file...]    # scan only these files
//   npm run check:destructive-ddl -- --self-test         # the fixtures under scripts/__fixtures__/destructive-ddl/

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

// One rule per form in CLAUDE.md rule 10, matched per statement rather than
// per line so a DEFAULT on its own line still counts.
export const RULES: { name: string; test: (statement: string) => boolean }[] = [
  {
    // "DROP" means any object; `DROP NOT NULL` and `DROP DEFAULT` widen and are
    // exempt. A unique-index rebuild is deliberately inside.
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

// Removes what a rule must never read as SQL: `--` comments (including
// `--> statement-breakpoint`), `/* */` comments and string literal contents,
// in one left-to-right scan because the three nest in both directions. Quoted
// identifiers pass through. Dollar-quoted bodies are not handled: a PL/pgSQL
// function is judged as `;`-split fragments, harmless while no rule spans
// `BEGIN ... END`.
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
 * The base a local run diffs against, from the branch prefix — gitflow.yml's
 * rules. Unrecognised gets `staging`.
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
 * Every migration this branch adds or edits against `base`: working tree
 * against the merge base, plus untracked, so a just-generated migration counts.
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

// drizzle-kit does not nest migrations, so no recursion.
function allCommittedMigrations(): string[] {
  if (!existsSync(MIGRATIONS_DIR)) return [];
  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .map((name) => join(MIGRATIONS_DIR, name));
}

/** The file list from whichever source applies, `*.sql` only. */
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

/** `0002_x.sql` → `0002_x.ack.md`. */
export function sidecarPath(sqlPath: string): string {
  return sqlPath.replace(/\.sql$/, '.ack.md');
}

/**
 * The sidecar's text, or undefined. Accepts the relative path a `Finding`
 * carries as readily as an absolute one.
 */
export function readAcknowledgement(sqlPath: string): string | undefined {
  const sidecar = sidecarPath(sqlPath.startsWith('/') ? sqlPath : join(REPO_ROOT, sqlPath));
  try {
    return readFileSync(sidecar, 'utf8');
  } catch {
    return undefined;
  }
}

/**
 * Grouped by file, so an acknowledgement covers exactly the migration it sits
 * beside. `readSidecar` is injected so the correlation can be tested without
 * writing files.
 */
export function report(
  findings: Finding[],
  readSidecar: (file: string) => string | undefined = readAcknowledgement,
): number {
  if (findings.length === 0) {
    console.log('check:destructive-ddl — no destructive DDL found.');
    return 0;
  }

  const byFile = new Map<string, Finding[]>();
  for (const finding of findings) {
    const forFile = byFile.get(finding.file) ?? [];
    forFile.push(finding);
    byFile.set(finding.file, forFile);
  }

  const unacknowledged: string[] = [];

  console.error(`check:destructive-ddl — ${findings.length} destructive statement(s) found:\n`);

  for (const [file, forFile] of [...byFile].sort(([a], [b]) => a.localeCompare(b))) {
    const acknowledged = ACK_LINE_RE.test(readSidecar(file) ?? '');
    console.error(`  ${file} — ${acknowledged ? 'acknowledged' : 'NOT ACKNOWLEDGED'}`);
    for (const finding of forFile) {
      console.error(`    ${finding.rule}`);
      console.error(`      ${finding.statement}`);
    }
    if (!acknowledged) unacknowledged.push(file);
    console.error('');
  }

  if (unacknowledged.length === 0) {
    console.log('Every migration above carries an acknowledgement sidecar. Passing.');
    return 0;
  }

  console.error(
    `${unacknowledged.length} migration(s) need an acknowledgement (CLAUDE.md · ` +
      'Non-negotiable architecture rules #10). Create each file below and put a line ' +
      'reading `Destructive DDL acknowledged: <reason>` in it:\n',
  );
  for (const file of unacknowledged) console.error(`  ${sidecarPath(file)}`);
  console.error(
    '\nThe reason should say why the change is safe, or how it was expand/contracted — ' +
      "see claude-docs/db.md's Migrations section for the convention and a worked rename " +
      'example. Better still, avoid the destructive change entirely.',
  );

  return 1;
}

// Exercises the checked-in fixtures end to end; needs no test runner, which is
// what `make act-*` and a bare clone have.
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

  // The fixtures have no sidecars on disk and must not; both outcomes come from
  // an injected reader, where a stray `bad.ack.md` would turn this green forever.
  const noAck = report(bad, () => undefined);
  if (noAck !== 1) {
    console.error('self-test FAILED: bad.sql with no sidecar should exit 1.');
    failed = true;
  }
  const withAck = report(
    bad,
    () => '# bad\n\nDestructive DDL acknowledged: this is a throwaway fixture.\n',
  );
  if (withAck !== 0) {
    console.error('self-test FAILED: bad.sql with an acknowledged sidecar should exit 0.');
    failed = true;
  }

  // An acknowledgement covers the file it sits beside and no other.
  const otherFileOnly = report(bad, (file) =>
    file.endsWith('good.sql') ? 'Destructive DDL acknowledged: wrong file.\n' : undefined,
  );
  if (otherFileOnly !== 1) {
    console.error("self-test FAILED: another migration's sidecar must not cover bad.sql.");
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
  const goodResult = report(good, () => undefined);
  if (goodResult !== 0) {
    console.error(
      'self-test FAILED: good.sql with no sidecar should still exit 0 (nothing to acknowledge).',
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
  process.exit(report(findings));
}

if (import.meta.main) {
  main();
}
