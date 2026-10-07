import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { withAudit } from '@/db/repository';
import { A, asUser } from '../support/as-user';
import { TEST_POOL_MAX } from '../support/db/bounded-postgres';

// The budget guard reads TEST_POOL_MAX; this proves the server sees it — that
// `postgres` inside the db project is the capped wrapper, for the app's client
// and for a client a test file opens, and that a call site can lower the cap
// but not raise it (claude-docs/testing/db-harness.md, "Connections per run").
// A burst three times the cap wide, counted in pg_stat_activity mid-flight:
// the pool fills to the cap and no further. The app's client is reached
// through withAudit, the one path that may hold it (CLAUDE.md rule 2), each
// call keeping its transaction open for the sleep's length.

/** Long enough for every pooled connection to be mid-sleep when counted. */
const SLEEP_SECONDS = 0.3;
const BURST = TEST_POOL_MAX * 3;

let watcher: postgres.Sql;

beforeAll(() => {
  watcher = postgres(process.env.DATABASE_URL as string, { max: 1 });
});

afterAll(async () => {
  await watcher.end();
});

const sleep = () => new Promise((resolve) => setTimeout(resolve, SLEEP_SECONDS * 1000));

/** How many connections on this database match `where` right now, the watcher's own excluded. */
async function connections(where: postgres.PendingQuery<postgres.Row[]>): Promise<number> {
  const [row] = await watcher<{ count: number }[]>`
    select count(*)::int as count from pg_stat_activity
    where datname = current_database() and pid <> pg_backend_pid() and ${where}
  `;
  return row.count;
}

const sleeping = () => connections(watcher`state = 'active' and query like '%pg_sleep%'`);
const inTransaction = () => connections(watcher`state = 'idle in transaction'`);
const any = () => connections(watcher`true`);

/** `count`'s reading once `burst` is under way, then the burst's completion. */
async function peakDuring(burst: Promise<unknown>, count = sleeping): Promise<number> {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const seen = await count();
  await burst;
  return seen;
}

describe('MB.179: every pool under test is capped', () => {
  // Precondition: a burst no wider than the cap would fill any pool to the
  // burst's width, and a cap of zero would never open a connection.
  it('is tested with a burst wider than the cap', () => {
    expect(TEST_POOL_MAX).toBeGreaterThan(0);
    expect(BURST).toBeGreaterThan(TEST_POOL_MAX);
  });

  it("caps the app's client", async () => {
    const burst = Promise.all(
      Array.from({ length: BURST }, () => withAudit(asUser(A), () => sleep())),
    );

    expect(await peakDuring(burst, inTransaction)).toBe(TEST_POOL_MAX);
  });

  it('caps a client a test file opens', async () => {
    const own = postgres(process.env.DATABASE_URL as string);
    const burst = Promise.all(
      Array.from({ length: BURST }, () => own`select pg_sleep(${SLEEP_SECONDS})`),
    );

    expect(await peakDuring(burst)).toBe(TEST_POOL_MAX);
    await own.end();
  });

  // A burst only as wide as the cap: on one connection the sleeps run in
  // series, and the cap's worth of them already outnumbers the pool.
  it('keeps a lower max a call site asks for', async () => {
    const single = postgres(process.env.DATABASE_URL as string, { max: 1 });
    const burst = Promise.all(
      Array.from({ length: TEST_POOL_MAX }, () => single`select pg_sleep(${SLEEP_SECONDS})`),
    );

    expect(await peakDuring(burst)).toBe(1);
    await single.end();
  });

  it('refuses a higher one', async () => {
    const wide = postgres(process.env.DATABASE_URL as string, { max: BURST });
    const burst = Promise.all(
      Array.from({ length: BURST }, () => wide`select pg_sleep(${SLEEP_SECONDS})`),
    );

    expect(await peakDuring(burst)).toBe(TEST_POOL_MAX);
    await wide.end();
  });
});

describe('MB.179: the app opens one client per process', () => {
  // The twelve OAuth tests reset the module registry to rebuild Better Auth
  // under another environment, and each reset re-evaluates connection.ts. A
  // client per evaluation left the earlier pools idling, so a worker held
  // several caps' worth rather than one.
  it('survives a module reset without a second pool', async () => {
    await Promise.all(Array.from({ length: BURST }, () => withAudit(asUser(A), () => sleep())));
    const before = await any();

    vi.resetModules();
    const fresh = await import('@/db/repository');
    await Promise.all(
      Array.from({ length: BURST }, () => fresh.withAudit(asUser(A), () => sleep())),
    );

    // Precondition: the first burst filled the one pool, so the earlier
    // connections are there to be counted had a second pool opened beside them.
    expect(before).toBe(TEST_POOL_MAX);
    expect(await any()).toBe(TEST_POOL_MAX);
  });
});
