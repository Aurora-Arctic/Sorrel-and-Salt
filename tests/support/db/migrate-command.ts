import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cp, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fromRoot } from '../paths';

// `npm run db:migrate`, run as CI's migrate step and the test template build run it, pointed at a migrations folder
// the test owns. The folder rides as the one argument after `--`, so the run reads no folder but the one it is given.

export const MIGRATIONS = fromRoot('src/db/migrations');

export type JournalEntry = {
  idx: number;
  version: string;
  when: number;
  tag: string;
  breakpoints: boolean;
};

export type MigrateRun = {
  code: number | null;
  killed: boolean;
  output: string;
  elapsedMs: number;
};

export type ProbeMigration = { tag: string; sql: string };

type Journal = { entries: JournalEntry[] };

async function readJournal(folder: string): Promise<Journal> {
  return JSON.parse(await readFile(join(folder, 'meta/_journal.json'), 'utf8')) as Journal;
}

export async function journalEntries(folder = MIGRATIONS): Promise<JournalEntry[]> {
  return (await readJournal(folder)).entries;
}

/** The hash drizzle's migrator records for a migration: the sha256 of its whole `.sql` file. */
export async function migrationHash(folder: string, tag: string): Promise<string> {
  return createHash('sha256')
    .update(await readFile(join(folder, `${tag}.sql`), 'utf8'))
    .digest('hex');
}

/** A temporary copy of the real migrations, with each probe appended to the journal after the newest. */
export async function migrationsWith(probes: ProbeMigration[] = []): Promise<string> {
  const folder = await mkdtemp(join(tmpdir(), 'migrations-'));
  await cp(MIGRATIONS, folder, { recursive: true });
  const journal = await readJournal(folder);
  for (const probe of probes) {
    const last = journal.entries[journal.entries.length - 1];
    journal.entries.push({ ...last, idx: last.idx + 1, when: last.when + 1, tag: probe.tag });
    await writeFile(join(folder, `${probe.tag}.sql`), probe.sql);
  }
  await writeFile(join(folder, 'meta/_journal.json'), JSON.stringify(journal));
  return folder;
}

function settle(started: number, resolve: (run: MigrateRun) => void) {
  return (error: Error | null, stdout: string, stderr: string) => {
    const failed = error as (Error & { code?: number; killed?: boolean }) | null;
    resolve({
      code: failed ? (typeof failed.code === 'number' ? failed.code : null) : 0,
      killed: failed?.killed ?? false,
      output: `${stdout}\n${stderr}`,
      elapsedMs: Date.now() - started,
    });
  };
}

// Killed past `killAfterMs`, so a run that hangs fails its test rather than the suite.
export function runMigrate(url: string, folder: string, killAfterMs = 60_000): Promise<MigrateRun> {
  const started = Date.now();
  return new Promise((resolve) => {
    execFile(
      'npm',
      ['run', '-s', 'db:migrate', '--', folder],
      {
        cwd: fromRoot(),
        env: { ...process.env, DATABASE_URL: url },
        timeout: killAfterMs,
        encoding: 'utf8',
      },
      settle(started, resolve),
    );
  });
}

/** `drizzle-kit migrate` on the real migrations, the command a deployed database was first migrated by. */
export function runDrizzleKitMigrate(url: string): Promise<MigrateRun> {
  const started = Date.now();
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      ['node_modules/drizzle-kit/bin.cjs', 'migrate'],
      {
        cwd: fromRoot(),
        env: { ...process.env, DATABASE_URL: url },
        timeout: 120_000,
        encoding: 'utf8',
      },
      settle(started, resolve),
    );
  });
}
