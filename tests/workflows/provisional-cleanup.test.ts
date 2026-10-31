import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { getHookByToken, getRun, start } from 'workflow/api';
import { waitForSleep } from '@workflow/vitest';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import { provisionalCleanup } from '@/modules/identity/jobs/provisional-cleanup';
import { PROVISIONAL_CLEANUP_TOKEN } from '@/modules/identity/jobs/provisional-cleanup-token';
import { ensureProvisionalCleanup } from '@/modules/identity';

// The daily cleanup, run end to end by the SDK's local world: its sleep is woken by the test rather
// than waited out, and its steps read the database as it stands.

const DOMAIN = '@provisional-cleanup-run.test';

let sql: ReturnType<typeof postgres>;
const started: string[] = [];

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
});

afterEach(async () => {
  // A chain left sleeping would hold the token against the next test.
  for (const runId of started.splice(0)) {
    await getRun(runId)
      .cancel()
      .catch(() => {});
  }
});

afterAll(async () => {
  await sql.end();
});

/** A user holding a provider sign-in, as a sign-up through one leaves it, last touched `age` ago. */
async function signUp(label: string, verified: boolean, age: string): Promise<string> {
  const [{ id }] = await sql`
    insert into users (name, email, email_verified, created_by, updated_by)
    values (${label}, ${`${label}${DOMAIN}`}, ${verified}, ${BOOTSTRAP_USER_ID}, ${BOOTSTRAP_USER_ID})
    returning id
  `;
  await sql`
    insert into accounts (account_id, provider_id, user_id, updated_at)
    values (${id}, 'facebook', ${id}, now())
  `;
  // The `set_updated_at` trigger overwrites an `updated_at` an UPDATE supplies, so it is off for the statement.
  await sql.begin(async (tx) => {
    await tx`alter table users disable trigger set_updated_at`;
    await tx`
      update users
      set created_at = now() - ${age}::interval, updated_at = now() - ${age}::interval,
        verification_sent_at = now() - ${age}::interval
      where id = ${id}
    `;
    await tx`alter table users enable trigger set_updated_at`;
  });
  return id as string;
}

const exists = async (userId: string) =>
  (await sql`select 1 from users where id = ${userId}`).length === 1;

async function startChain() {
  const run = await start(provisionalCleanup, []);
  started.push(run.runId);
  return run;
}

/** Waits until a run other than `previous` holds the cleanup token, and returns its id. */
async function successorOf(previous: string): Promise<string> {
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      const hook = await getHookByToken(PROVISIONAL_CLEANUP_TOKEN);
      if (hook.runId !== previous) {
        started.push(hook.runId);
        return hook.runId;
      }
    } catch {
      // The predecessor has let go and the successor has not claimed it yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('No successor run took the token');
}

describe('the daily provisional cleanup, run end to end', () => {
  it('deletes a lapsed unverified account and keeps a verified one and an unlapsed one', async () => {
    const lapsed = await signUp('lapsed', false, '2 days');
    const verified = await signUp('verified', true, '2 days');
    const inside = await signUp('inside', false, '10 minutes');
    expect(await exists(lapsed)).toBe(true);

    const run = await startChain();
    await waitForSleep(run);

    expect(await exists(lapsed)).toBe(false);
    expect(await exists(verified)).toBe(true);
    expect(await exists(inside)).toBe(true);
  });

  it('sleeps, then starts its successor and ends', async () => {
    const run = await startChain();
    const sleepId = await waitForSleep(run);

    await getRun(run.runId).wakeUp({ correlationIds: [sleepId] });

    await expect(run.returnValue).resolves.toBe('continued');
    expect(await successorOf(run.runId)).not.toBe(run.runId);
  });

  it('starts no second chain while one runs: the second start ends as a duplicate', async () => {
    const first = await startChain();
    await waitForSleep(first);
    // The precondition: the first run holds the token, so the second could not own it.
    expect((await getHookByToken(PROVISIONAL_CLEANUP_TOKEN)).runId).toBe(first.runId);

    const second = await startChain();

    await expect(second.returnValue).resolves.toBe('duplicate');
    expect((await getHookByToken(PROVISIONAL_CLEANUP_TOKEN)).runId).toBe(first.runId);
  });

  it('is started by the service only when no chain holds the token', async () => {
    const first = await ensureProvisionalCleanup();
    expect(first).toEqual(expect.any(String));
    started.push(first as string);
    await waitForSleep(getRun(first as string));

    await expect(ensureProvisionalCleanup()).resolves.toBeNull();
  });

  it('begins a new chain from a start point once the previous chain has ended', async () => {
    // Both start points (the sign-up hook and the admin users page) call this one service.
    const first = await ensureProvisionalCleanup();
    started.push(first as string);
    await waitForSleep(getRun(first as string));
    // The precondition: the chain is alive, so a start point refuses.
    await expect(ensureProvisionalCleanup()).resolves.toBeNull();

    await getRun(first as string).cancel();
    await expect(getRun(first as string).status).resolves.toBe('cancelled');

    const second = await ensureProvisionalCleanup();
    expect(second).toEqual(expect.any(String));
    expect(second).not.toBe(first);
    started.push(second as string);
    // The new run registers its hook shortly after it starts.
    await waitForSleep(getRun(second as string));
    expect((await getHookByToken(PROVISIONAL_CLEANUP_TOKEN)).runId).toBe(second);
  });
});
