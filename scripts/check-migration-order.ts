#!/usr/bin/env node
// Refuses a migration journal drizzle's migrator would apply out of order.
// `migrate` applies only the entries whose `when` is later than the newest
// `created_at` it has recorded, comparing no name or hash, and each `when` is
// stamped when its author runs `generate`: so an entry merged older than one
// already applied is skipped on staging and production without a word, while a
// test database, which starts empty, runs it. The incident and the regenerate
// step are claude-docs/db/migrations-and-scripts.md, "Migration order" (MB.173).
//
// The branch's journal is the working tree's, so a just-generated migration
// counts; the base's is the base ref's committed one. The base resolves as
// check:destructive-ddl's does. CI fetches it and passes `--base`, since its
// checkout is a detached merge commit no prefix can be read off.
//
// Usage:
//   npm run check:migration-order                        # against this branch's Gitflow base
//   npm run check:migration-order -- --base origin/main  # against another base

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { currentBranch, resolveDefaultBase } from './check-destructive-ddl.ts';
import type { JournalEntry } from './types.ts';

const REPO_ROOT = join(import.meta.dirname, '..');

export const JOURNAL_PATH = 'src/db/migrations/meta/_journal.json';

export function parseJournal(text: string): JournalEntry[] {
  const { entries } = JSON.parse(text) as { entries: JournalEntry[] };
  return entries.map(({ idx, tag, when }) => ({ idx, tag, when }));
}

/** The journal `base` has committed — never the working tree's. */
export function readBaseJournal(base: string, cwd: string = REPO_ROOT): JournalEntry[] {
  let text: string;
  try {
    // CI runs as root over a checkout another user owns (claude-docs/ci/container-jobs.md).
    text = execFileSync('git', ['-c', 'safe.directory=*', 'show', `${base}:${JOURNAL_PATH}`], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch {
    throw new Error(
      `check:migration-order — cannot read ${JOURNAL_PATH} at '${base}'. Run \`git fetch origin\`, ` +
        'or pass --base <ref> to compare against something else.',
    );
  }
  return parseJournal(text);
}

/**
 * Every way `branch`'s journal would leave an entry unapplied once merged onto
 * `base`, as one line each; empty when there is none. An entry is the
 * branch's when `base` has no entry of its tag.
 */
export function orderProblems(
  branch: JournalEntry[],
  base: JournalEntry[],
  baseName: string,
): string[] {
  const problems: string[] = [];

  // The migrator's comparison is `<`, so a tie is skipped too.
  for (let at = 1; at < branch.length; at += 1) {
    const [before, entry] = [branch[at - 1], branch[at]];
    if (entry.when <= before.when) {
      problems.push(
        `${entry.tag} (when ${entry.when}) is no later than ${before.tag} before it (when ${before.when})`,
      );
    }
  }

  const onBase = new Set(base.map((entry) => entry.tag));
  if (base.length === 0) return problems;
  const newest = base.reduce((latest, entry) => (entry.when > latest.when ? entry : latest));
  const lastOnBase = branch.reduce((last, entry, at) => (onBase.has(entry.tag) ? at : last), -1);

  branch.forEach((entry, at) => {
    if (onBase.has(entry.tag)) return;
    if (at < lastOnBase) {
      problems.push(`${entry.tag} sits ahead of ${branch[lastOnBase].tag}, which ${baseName} has`);
    }
    if (entry.when <= newest.when) {
      problems.push(
        `${entry.tag} (when ${entry.when}) is no later than ${baseName}'s newest, ${newest.tag} (when ${newest.when})`,
      );
    }
  });

  return problems;
}

/** Prints the outcome; the exit code. */
export function report(
  problems: string[],
  baseName: string,
  log: (line: string) => void = console.error,
): number {
  if (problems.length === 0) {
    log(`check:migration-order — every entry follows ${baseName}'s, in order. Passing.`);
    return 0;
  }
  log(`check:migration-order — ${problems.length} problem(s) against ${baseName}:\n`);
  for (const problem of problems) log(`  ${problem}`);
  log(
    `\nRegenerate each migration named on the current base: merge ${baseName}, delete the ` +
      "migration's `.sql`, its `meta/` snapshot and its `_journal.json` entry, run " +
      '`npm run db:generate`, and put back anything written into the SQL by hand ' +
      '(claude-docs/db/migrations-and-scripts.md, "Migration order").',
  );
  return 1;
}

function main(): void {
  const argv = process.argv.slice(2);
  const baseIndex = argv.indexOf('--base');
  const base = baseIndex === -1 ? resolveDefaultBase(currentBranch()) : argv[baseIndex + 1];
  if (base === undefined) {
    console.error('check:migration-order — --base needs a ref, e.g. --base origin/main.');
    process.exit(2);
  }

  let problems: string[];
  try {
    const branch = parseJournal(readFileSync(join(REPO_ROOT, JOURNAL_PATH), 'utf8'));
    problems = orderProblems(branch, readBaseJournal(base), base);
  } catch (error) {
    console.error((error as Error).message);
    process.exit(2);
  }
  process.exit(report(problems, base));
}

if (import.meta.main) {
  main();
}
