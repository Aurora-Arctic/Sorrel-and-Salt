import { beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { SYSTEM_ACTOR_ID } from '@/lib/system-actor';
import { useTestDatabase } from '../../../support/db/database';
import { insertAnonymousUser } from '../../../support/db/insert-anonymous-user';
import { insertSupportTimeout } from '../../../support/db/insert-support-timeout';

const startJob = vi.hoisted(() => vi.fn<(job: unknown, args: unknown[]) => Promise<string>>());
vi.mock('@/lib/jobs', () => ({ startJob }));

const { deleteLapsedProvisionalAccounts, findLapsedProvisionalPage, startProvisionalCleanup } =
  await import('@/modules/identity');
const { retentionBatchStep: runRetentionBatch } =
  await import('@/modules/support/jobs/support-retention-batch-steps');
const { provisionalCleanup } = await import('@/modules/identity/jobs/provisional-cleanup');

beforeEach(() => {
  startJob.mockReset();
  startJob.mockResolvedValue('run-1');
});

describe('starting the daily provisional cleanup', () => {
  it('starts one coordinator run with no arguments and returns its id', async () => {
    await expect(startProvisionalCleanup()).resolves.toBe('run-1');

    expect(startJob).toHaveBeenCalledExactlyOnceWith(provisionalCleanup, []);
  });

  it('lets a failed start throw, so the cron call answers with an error and Vercel shows it', async () => {
    startJob.mockRejectedValue(new Error('queue down'));

    await expect(startProvisionalCleanup()).rejects.toThrow('queue down');
  });
});

// The account a signed-out support send mints is collected by the same daily run, on its own rule: once none of its requests is
// live (every one it sent is anonymised, which hands the row to the System account), or 7 days after it was made if it holds
// none. Its sessions go with it (claude-docs/design-decisions/m15.48-anonymous-sender.md). The database's clock decides, so
// each account is written already as old as the case needs.
describe('the daily cleanup of anonymous accounts', () => {
  let sql: postgres.Sql;
  useTestDatabase((client) => {
    sql = client;
  });

  beforeEach(async () => {
    await sql`truncate support_replies, support_timeouts, support_requests cascade`;
    await sql`delete from users where is_anonymous`;
  });

  /** One full day's run, as its steps call the service: every lapsed page read, then deleted. */
  async function runDay(): Promise<string[]> {
    const ids = await findLapsedProvisionalPage(null);
    await deleteLapsedProvisionalAccounts(ids);
    return ids;
  }

  async function present(userId: string) {
    const [{ users, sessions }] = await sql`
      select (select count(*)::int from users where id = ${userId}) as users,
        (select count(*)::int from sessions where user_id = ${userId}) as sessions`;
    return { users, sessions } as { users: number; sessions: number };
  }

  /** A request the account sent, closed `closedAgo` before now and not yet anonymised. */
  async function closedRequest(userId: string, closedAgo: string): Promise<string> {
    const [row] = await sql`
      insert into support_requests
        (about, subject, message, path, status, resolved_at, closed_at, sender_email, created_by, updated_by)
      values ('account', 'The Testwort code never came', 'It never arrives.', '/support', 'closed',
        now() - ${closedAgo}::interval - interval '7 days', now() - ${closedAgo}::interval,
        'visitor@example.test', ${userId}, ${userId})
      returning id`;
    return row!.id as string;
  }

  it('removes one 7 days old that holds no request, with its sessions, and keeps one younger', async () => {
    const lapsed = await insertAnonymousUser(sql, { createdAgo: '8 days', withSession: true });
    const young = await insertAnonymousUser(sql, { createdAgo: '6 days', withSession: true });
    expect(await present(lapsed)).toEqual({ users: 1, sessions: 1 });

    await runDay();

    expect(await present(lapsed)).toEqual({ users: 0, sessions: 0 });
    expect(await present(young)).toEqual({ users: 1, sessions: 1 });
  });

  it('keeps one whose request is still live, and removes it once retention has anonymised that request', async () => {
    const sender = await insertAnonymousUser(sql, { createdAgo: '400 days', withSession: true });
    const request = await closedRequest(sender, '13 months');

    // The request is closed but not yet anonymised, so the account still holds it.
    await runDay();
    expect(await present(sender)).toEqual({ users: 1, sessions: 1 });

    const now = Date.now();
    expect(
      await runRetentionBatch({
        kind: 'anonymise',
        ids: [request],
        now,
        origin: 'http://localhost:3000',
      }),
    ).toBe(1);
    await runDay();

    expect(await present(sender)).toEqual({ users: 0, sessions: 0 });
    // The anonymised request stays, held by the System account.
    expect(await sql`select created_by from support_requests where id = ${request}`).toEqual([
      { created_by: SYSTEM_ACTOR_ID },
    ]);
  });

  it('keeps an account that is not anonymous, made as long ago and holding nothing', async () => {
    const anonymous = await insertAnonymousUser(sql, { createdAgo: '8 days', withSession: true });
    const linked = await insertAnonymousUser(sql, {
      createdAgo: '8 days',
      withSession: true,
      anonymous: false,
    });

    const ids = await runDay();

    // Precondition: the run did collect the anonymous twin, so keeping the other is the flag's doing.
    expect(ids).toContain(anonymous);
    expect(ids).not.toContain(linked);
    expect(await present(linked)).toEqual({ users: 1, sessions: 1 });
    await sql`delete from users where id = ${linked}`;
  });

  // The time-out binds the address the account wrote from, and goes with the account by cascade, so the account must stay
  // while the time-out stands.
  it('keeps one holding no request while a time-out on it stands, and removes it once that is lifted', async () => {
    const held = await insertAnonymousUser(sql, { createdAgo: '8 days', withSession: true });
    const timeout = await insertSupportTimeout(sql, held, { address: 'held@example.test' });

    await runDay();
    expect(await present(held)).toEqual({ users: 1, sessions: 1 });

    // Precondition: the lifted time-out is all that changed, so keeping it before was the time-out's doing.
    await sql`update support_timeouts set lifted_at = now() where id = ${timeout}`;
    await runDay();
    expect(await present(held)).toEqual({ users: 0, sessions: 0 });
  });

  it('removes one whose time-out has run out', async () => {
    const held = await insertAnonymousUser(sql, { createdAgo: '8 days', withSession: true });
    await insertSupportTimeout(sql, held, { endsIn: '-1 hour', address: 'held@example.test' });

    await runDay();

    expect(await present(held)).toEqual({ users: 0, sessions: 0 });
  });
});
