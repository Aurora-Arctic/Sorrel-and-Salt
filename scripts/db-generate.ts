#!/usr/bin/env node
// `drizzle-kit generate`, then deletes every `meta/` snapshot but the newest journal entry's
// (claude-docs/db/migrations-and-scripts.md, "One snapshot"). generate diffs against the newest alone
// and migrate reads none, so the older ones are dead weight that git history keeps anyway.
// Usage: npm run db:generate [-- <drizzle-kit generate flags>]

import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { parseJournal } from './check-migration-order.ts';
import type { JournalEntry } from './types.ts';

const REPO_ROOT = join(import.meta.dirname, '..');

export const META_DIR = 'src/db/migrations/meta';

const SNAPSHOT = /^\d+_snapshot\.json$/;

export function snapshotFor(tag: string): string {
  return `${tag.split('_')[0]}_snapshot.json`;
}

export function snapshotProblems(files: string[], entries: JournalEntry[]): string[] {
  const newest = snapshotFor(entries[entries.length - 1].tag);
  const problems = files
    .filter((name) => SNAPSHOT.test(name) && name !== newest)
    .sort()
    .map((name) => `${name} is not the newest migration’s snapshot (${newest})`);
  if (!files.includes(newest)) {
    problems.push(`${newest}, the newest migration’s snapshot, is missing`);
  }
  return problems;
}

export function pruneSnapshots(dir: string): string[] {
  const entries = parseJournal(readFileSync(join(dir, '_journal.json'), 'utf8'));
  const newest = snapshotFor(entries[entries.length - 1].tag);
  const stale = readdirSync(dir)
    .filter((name) => SNAPSHOT.test(name) && name !== newest)
    .sort();
  for (const name of stale) rmSync(join(dir, name));
  return stale;
}

function main(): number {
  const generate = spawnSync(
    join(REPO_ROOT, 'node_modules/.bin/drizzle-kit'),
    ['generate', ...process.argv.slice(2)],
    { cwd: REPO_ROOT, stdio: 'inherit' },
  );
  if (generate.status !== 0) return generate.status ?? 1;

  const dir = join(REPO_ROOT, META_DIR);
  const removed = pruneSnapshots(dir);
  if (removed.length > 0) console.log(`db:generate — removed ${removed.join(', ')}`);

  const entries = parseJournal(readFileSync(join(dir, '_journal.json'), 'utf8'));
  const problems = snapshotProblems(readdirSync(dir), entries);
  for (const problem of problems) console.error(`db:generate — ${problem}`);
  return problems.length > 0 ? 1 : 0;
}

if (import.meta.main) {
  process.exitCode = main();
}
