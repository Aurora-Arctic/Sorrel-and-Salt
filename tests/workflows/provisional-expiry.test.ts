import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { getRun, start } from 'workflow/api';
import { waitForSleep } from '@workflow/vitest';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import { provisionalAccountExpiry } from '@/modules/identity/jobs/provisional-expiry';

// The provisional-expiry job, run end to end by the SDK's local world: the run's first sleep is
// woken by the test rather than waited out, and its step then reads the database as it stands.

const DOMAIN = '@provisional-expiry-run.test';

let sql: ReturnType<typeof postgres>;

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
});

afterAll(async () => {
  await sql.end();
});

/** A user holding a provider sign-in, as a sign-up through one leaves it. */
async function signUp(label: string, verified: boolean): Promise<string> {
  const [{ id }] = await sql`
    insert into users (name, email, email_verified, created_by, updated_by)
    values (${label}, ${`${label}${DOMAIN}`}, ${verified}, ${BOOTSTRAP_USER_ID}, ${BOOTSTRAP_USER_ID})
    returning id
  `;
  await sql`
    insert into accounts (account_id, provider_id, user_id, updated_at)
    values (${id}, 'facebook', ${id}, now())
  `;
  return id as string;
}

/** Moves the sign-up and last touch back by `by`; the `set_updated_at` trigger overwrites an `updated_at` an UPDATE supplies, so it is off for the statement. */
async function backdate(userId: string, by: string): Promise<void> {
  await sql.begin(async (tx) => {
    await tx`alter table users disable trigger set_updated_at`;
    await tx`
      update users
      set created_at = now() - ${by}::interval, updated_at = now() - ${by}::interval,
        verification_sent_at = now() - ${by}::interval
      where id = ${userId}
    `;
    await tx`alter table users enable trigger set_updated_at`;
  });
}

const exists = async (userId: string) =>
  (await sql`select 1 from users where id = ${userId}`).length === 1;

/** Wakes the run's pending sleep, standing in for the window passing. */
async function wake(run: Awaited<ReturnType<typeof start>>): Promise<void> {
  const sleepId = await waitForSleep(run);
  await getRun(run.runId).wakeUp({ correlationIds: [sleepId] });
}

describe('the provisional-expiry job, run end to end', () => {
  it('deletes an unverified account once its window has lapsed', async () => {
    const id = await signUp('lapsed', false);
    await backdate(id, '61 minutes');
    expect(await exists(id)).toBe(true);

    const run = await start(provisionalAccountExpiry, [id]);
    await wake(run);
    await run.returnValue;

    expect(await exists(id)).toBe(false);
  });

  it('keeps an unverified account still inside its window, and sleeps again for what is left', async () => {
    const id = await signUp('inside', false);
    await backdate(id, '50 minutes');

    const run = await start(provisionalAccountExpiry, [id]);
    await wake(run);
    // The step found time left, so the run is waiting again rather than finished.
    const second = await waitForSleep(run);
    expect(second).toEqual(expect.any(String));
    expect(await run.status).toBe('running');
    expect(await exists(id)).toBe(true);

    await backdate(id, '61 minutes');
    await getRun(run.runId).wakeUp({ correlationIds: [second] });
    await run.returnValue;
    expect(await exists(id)).toBe(false);
  });

  it('keeps a verified account and ends the run', async () => {
    const id = await signUp('verified', true);
    await backdate(id, '10 years');

    const run = await start(provisionalAccountExpiry, [id]);
    await wake(run);
    await run.returnValue;

    expect(await run.status).toBe('completed');
    expect(await exists(id)).toBe(true);
  });
});
