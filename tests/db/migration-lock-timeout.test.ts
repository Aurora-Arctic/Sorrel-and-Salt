import { execFile } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';

// `drizzle-kit migrate`, run as `npm run db:migrate` runs it, against this file's migrated clone with one
// pending probe migration that alters `users` while another connection holds a read transaction open on it.
// Without a lock timeout the ALTER queues behind that reader for as long as it stays open.

const MIGRATIONS = join(process.cwd(), 'src/db/migrations');
const PROBE_CONFIG = join(process.cwd(), 'tests/support/db/lock-probe.drizzle.config.ts');
const PROBE_TAG = '9999_lock_probe';
const PROBE_COLUMN = 'lock_probe';
// The run is killed past this, so a migration that queues fails the test rather than hanging the suite.
const KILL_AFTER_MS = 30_000;
// The lock timeout plus drizzle-kit's start-up, with room for a loaded machine.
const FAILS_WITHIN_MS = 20_000;

const sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
let folder: string;

type Run = { code: number | null; killed: boolean; output: string; elapsedMs: number };

function migrate(): Promise<Run> {
  const started = Date.now();
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      ['node_modules/drizzle-kit/bin.cjs', 'migrate', '--config', PROBE_CONFIG],
      {
        env: { ...process.env, LOCK_PROBE_MIGRATIONS: folder },
        timeout: KILL_AFTER_MS,
        encoding: 'utf8',
      },
      (error, stdout, stderr) => {
        const failed = error as (Error & { code?: number; killed?: boolean }) | null;
        resolve({
          code: failed ? (typeof failed.code === 'number' ? failed.code : null) : 0,
          killed: failed?.killed ?? false,
          output: `${stdout}\n${stderr}`,
          elapsedMs: Date.now() - started,
        });
      },
    );
  });
}

async function probeColumnExists(): Promise<boolean> {
  const rows = await sql`
    select 1 from information_schema.columns
    where table_name = 'users' and column_name = ${PROBE_COLUMN}`;
  return rows.length > 0;
}

async function appliedCount(): Promise<number> {
  const [row] = await sql<{ count: number }[]>`
    select count(*)::int as count from drizzle.__drizzle_migrations`;
  return row.count;
}

beforeAll(async () => {
  folder = await mkdtemp(join(tmpdir(), 'lock-probe-'));
  await cp(MIGRATIONS, folder, { recursive: true });
  const journalPath = join(folder, 'meta/_journal.json');
  const journal = JSON.parse(await readFile(journalPath, 'utf8')) as {
    entries: { idx: number; version: string; when: number; tag: string; breakpoints: boolean }[];
  };
  const last = journal.entries[journal.entries.length - 1];
  journal.entries.push({ ...last, idx: last.idx + 1, when: last.when + 1, tag: PROBE_TAG });
  await writeFile(journalPath, JSON.stringify(journal));
  await writeFile(
    join(folder, `${PROBE_TAG}.sql`),
    `ALTER TABLE "users" ADD COLUMN "${PROBE_COLUMN}" text;`,
  );
});

afterAll(async () => {
  await sql.end();
  await rm(folder, { recursive: true, force: true });
});

describe('a migration that meets a busy table', () => {
  it('fails within the lock timeout, rolls back whole, and applies cleanly on a rerun', async () => {
    // Preconditions: the clone is at the head of the real migrations, so the probe is the only pending one.
    const before = await appliedCount();
    expect(before).toBe(
      (
        JSON.parse(await readFile(join(MIGRATIONS, 'meta/_journal.json'), 'utf8')) as {
          entries: unknown[];
        }
      ).entries.length,
    );
    expect(await probeColumnExists()).toBe(false);

    // A reader's open transaction holds ACCESS SHARE on `users`, which the ALTER's ACCESS EXCLUSIVE waits for.
    let release!: () => void;
    const held = new Promise<void>((resolve) => (release = resolve));
    let locked!: () => void;
    const lockTaken = new Promise<void>((resolve) => (locked = resolve));
    const reader = sql.begin(async (tx) => {
      await tx`select count(*) from users`;
      locked();
      await held;
    });
    await lockTaken;

    let busy: Run;
    try {
      busy = await migrate();
    } finally {
      release();
      await reader;
    }

    expect(busy.killed, `drizzle-kit migrate queued past ${KILL_AFTER_MS}ms`).toBe(false);
    expect(busy.code).not.toBe(0);
    expect(busy.elapsedMs).toBeLessThan(FAILS_WITHIN_MS);
    expect(await probeColumnExists()).toBe(false);
    expect(await appliedCount()).toBe(before);

    const rerun = await migrate();
    expect(rerun.code, rerun.output).toBe(0);
    expect(await probeColumnExists()).toBe(true);
    expect(await appliedCount()).toBe(before + 1);
  }, 90_000);
});
