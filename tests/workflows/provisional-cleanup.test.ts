import { afterEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { start } from 'workflow/api';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import { provisionalCleanup } from '@/modules/identity/jobs/provisional-cleanup';
import { provisionalCleanupBatch } from '@/modules/identity/jobs/provisional-cleanup-batch';
import { useTestDatabase } from '../support/db/database';

// No run sleeps, so none is woken. Other files share the database and may leave lapsed rows of their own, so a coordinator's batch count is asserted only as a floor.

const DOMAIN = '@provisional-cleanup-run.test';

let sql: ReturnType<typeof postgres>;

useTestDatabase((client) => {
  sql = client;
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function signUp(label: string, verified: boolean, age: string): Promise<string> {
  const [{ id }] = await sql`
    insert into users (name, email, email_verified, created_by, updated_by)
    values (${label}, ${`${label}-${crypto.randomUUID()}${DOMAIN}`}, ${verified}, ${BOOTSTRAP_USER_ID}, ${BOOTSTRAP_USER_ID})
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

async function runDay(): Promise<number> {
  const run = await start(provisionalCleanup, []);
  return run.returnValue;
}

describe('the daily provisional cleanup, run end to end', () => {
  it('starts a batch for the lapsed accounts, which deletes them and keeps a verified one and an unlapsed one', async () => {
    const lapsed = await signUp('lapsed', false, '2 days');
    const verified = await signUp('verified', true, '2 days');
    const inside = await signUp('inside', false, '10 minutes');
    // The precondition: the lapsed account is there to delete.
    expect(await exists(lapsed)).toBe(true);

    expect(await runDay()).toBeGreaterThanOrEqual(1);

    // The coordinator ends once it has started its batches, so the deletion is waited for.
    await vi.waitFor(async () => expect(await exists(lapsed)).toBe(false), { timeout: 10_000 });
    expect(await exists(verified)).toBe(true);
    expect(await exists(inside)).toBe(true);
  });

  it('ends with no error on a second run, and the account left inside its window stays', async () => {
    const inside = await signUp('inside-again', false, '10 minutes');
    await runDay();

    await expect(runDay()).resolves.toEqual(expect.any(Number));

    expect(await exists(inside)).toBe(true);
  });
});

describe('a cleanup batch', () => {
  it('deletes each account of its page that has lapsed, and none that has not', async () => {
    const lapsed = await signUp('batch-lapsed', false, '4 hours');
    const verified = await signUp('batch-verified', true, '4 hours');

    const run = await start(provisionalCleanupBatch, [[lapsed, verified]]);

    expect(await run.returnValue).toBe(1);
    expect(await exists(lapsed)).toBe(false);
    expect(await exists(verified)).toBe(true);
  });

  it('two batches over the same ids at once delete each account once, with no error', async () => {
    const lapsed = await signUp('overlap', false, '2 days');

    const runs = await Promise.all([
      start(provisionalCleanupBatch, [[lapsed]]),
      start(provisionalCleanupBatch, [[lapsed]]),
    ]);
    const removed = await Promise.all(runs.map((run) => run.returnValue));

    expect(removed.reduce((sum, count) => (sum ?? 0) + (count ?? 0), 0)).toBe(1);
    expect(await exists(lapsed)).toBe(false);
  });

  it('logs an account the database refuses to delete, counts it as not removed, and leaves it for the next day', async () => {
    const doomed = await signUp('doomed', false, '2 days');
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    await sql`
      create or replace function refuse_cleanup_delete() returns trigger language plpgsql as $$
      begin
        if old.email like '%${sql.unsafe(DOMAIN)}' then raise exception 'removal refused'; end if;
        return old;
      end $$
    `;
    await sql`create trigger refuse_cleanup_delete before delete on users for each row execute function refuse_cleanup_delete()`;
    try {
      const run = await start(provisionalCleanupBatch, [[doomed]]);

      expect(await run.returnValue).toBe(0);
      expect(await exists(doomed)).toBe(true);
      expect(
        logged.mock.calls.some(([line]) =>
          String(line).includes(`Could not delete the lapsed provisional account ${doomed}`),
        ),
      ).toBe(true);
    } finally {
      await sql`drop trigger refuse_cleanup_delete on users`;
      await sql`drop function refuse_cleanup_delete()`;
    }

    const retry = await start(provisionalCleanupBatch, [[doomed]]);
    expect(await retry.returnValue).toBe(1);
    expect(await exists(doomed)).toBe(false);
  });
  it('reports a batch that fails every attempt outside the per-account delete, removes nothing, and leaves it for the next day', async () => {
    // The step can throw past the per-account catch only from that catch itself: the database refuses the delete, and the log
    // of the refusal throws, so every attempt fails and the run falls to its failure report.
    const doomed = await signUp('lost-batch', false, '2 days');
    const logged = vi.spyOn(console, 'error').mockImplementation((line) => {
      if (String(line).includes('Could not delete the lapsed provisional account'))
        throw new Error('log down');
    });
    await sql`
      create or replace function refuse_cleanup_delete() returns trigger language plpgsql as $$
      begin
        if old.email like '%${sql.unsafe(DOMAIN)}' then raise exception 'removal refused'; end if;
        return old;
      end $$
    `;
    await sql`create trigger refuse_cleanup_delete before delete on users for each row execute function refuse_cleanup_delete()`;
    try {
      const run = await start(provisionalCleanupBatch, [[doomed]]);

      expect(await run.returnValue).toBeNull();
      expect(await exists(doomed)).toBe(true);
      expect(
        logged.mock.calls.some(([line]) =>
          String(line).includes('every attempt failed; a batch of 1 accounts is left'),
        ),
      ).toBe(true);
    } finally {
      await sql`drop trigger refuse_cleanup_delete on users`;
      await sql`drop function refuse_cleanup_delete()`;
      logged.mockRestore();
    }

    const retry = await start(provisionalCleanupBatch, [[doomed]]);
    expect(await retry.returnValue).toBe(1);
    expect(await exists(doomed)).toBe(false);
  });
});
