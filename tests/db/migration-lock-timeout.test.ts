import { rm } from 'node:fs/promises';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { useTestDatabase } from '../support/db/database';
import {
  journalEntries,
  migrationsWith,
  runMigrate,
  type MigrateRun,
} from '../support/db/migrate-command';

// `npm run db:migrate` against this file's migrated clone with one pending probe migration that alters `users` while
// another connection holds a read transaction open on it. Without a lock timeout the ALTER queues behind that reader
// for as long as it stays open.

const PROBE_TAG = '9999_lock_probe';
const PROBE_COLUMN = 'lock_probe';
const LOCK_TIMEOUT_MS = 5_000;
// The run is killed past this, so a migration that queues fails the test rather than hanging the suite.
const KILL_AFTER_MS = 30_000;
// The lock timeout plus npm's and the script's start-up, with room for a loaded machine.
const FAILS_WITHIN_MS = 12_000;

let sql: postgres.Sql;
let folder: string;

useTestDatabase((client) => {
  sql = client;
});

const migrate = () => runMigrate(process.env.DATABASE_URL as string, folder, KILL_AFTER_MS);

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
  folder = await migrationsWith([
    { tag: PROBE_TAG, sql: `ALTER TABLE "users" ADD COLUMN "${PROBE_COLUMN}" text;` },
  ]);
});

afterAll(async () => {
  await rm(folder, { recursive: true, force: true });
});

describe('a migration that meets a busy table', () => {
  it('gives up within the lock timeout naming the lock and its file, rolls back whole, and applies cleanly on a rerun', async () => {
    // Preconditions: the clone is at the head of the real migrations, so the probe is the only pending one.
    const before = await appliedCount();
    expect(before).toBe((await journalEntries()).length);
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

    let busy: MigrateRun;
    try {
      busy = await migrate();
    } finally {
      release();
      await reader;
    }

    expect(busy.killed, `npm run db:migrate queued past ${KILL_AFTER_MS}ms`).toBe(false);
    expect(busy.code).not.toBe(0);
    // At least the timeout: the run waited on the lock rather than failing for some other reason first.
    expect(busy.elapsedMs).toBeGreaterThanOrEqual(LOCK_TIMEOUT_MS);
    expect(busy.elapsedMs).toBeLessThan(FAILS_WITHIN_MS);
    expect(busy.output).toContain('55P03');
    expect(busy.output).toContain('lock timeout');
    expect(busy.output).toContain(`${PROBE_TAG}.sql`);
    expect(await probeColumnExists()).toBe(false);
    expect(await appliedCount()).toBe(before);

    const rerun = await migrate();
    expect(rerun.code, rerun.output).toBe(0);
    expect(await probeColumnExists()).toBe(true);
    expect(await appliedCount()).toBe(before + 1);
  }, 90_000);
});
