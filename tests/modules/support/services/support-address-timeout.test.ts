import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { Forbidden } from '@/lib/errors';
import { addressCountKey } from '@/lib/send-count-key';
import {
  sendSignedOutSupportRequest,
  sendSupportRequest,
  timeOutSupportSender,
} from '@/modules/support';
import type { AnonymousMinter, SupportNotifier } from '@/modules/support';
import { C, E, asUser } from '../../../support/as-user';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import { insertAnonymousUser } from '../../../support/db/insert-anonymous-user';
import { insertSupportRequest } from '../../../support/db/insert-support-request';
import { insertSupportTimeout } from '../../../support/db/insert-support-timeout';
import { PAUSE_MESSAGE, noPauseNotifier } from '../../../support/email-verification';

// A keeper's time-out on an anonymous sender also binds the address the sender wrote from, kept as its HMAC key and never in
// clear, so a new anonymous account from that address is refused as the timed-out one is
// (claude-docs/design-decisions/m15.48-anonymous-sender.md). The mailed-link reply is support-view-reply.test.ts's, the
// claim by email tests/db/support-claim-by-email.test.ts's, and the cleanup provisional-cleanup.test.ts's.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

const { startJob } = vi.hoisted(() => ({
  startJob: vi.fn(async (..._args: unknown[]) => 'run-id'),
}));
vi.mock('@/lib/jobs', () => ({ startJob }));

beforeEach(async () => {
  startJob.mockClear();
  vi.stubEnv('MAIL_TRANSPORT', 'smtp');
  await sql`truncate support_replies, support_timeouts, support_requests cascade`;
  await sql`delete from support_send_counts`;
  minted = [];
});

afterEach(() => {
  vi.unstubAllEnvs();
});

const TIMED_OUT = 'timed-out@example.test';
const mail: SupportNotifier = { origin: async () => 'http://localhost:3000' };

let minted: string[] = [];
const minter: AnonymousMinter = {
  mint: async () => {
    const id = await insertAnonymousUser(sql);
    minted.push(id);
    return id;
  },
};

const input = (email: string, subject = `Testwort from ${email}`) =>
  ({ about: 'account', email, subject, message: 'The code never arrives.' }) as const;

/** A signed-out send from `email`, as a new visitor when `session` is absent, or as the returning account it names. */
const sendSignedOut = (email: string, session?: string) =>
  sendSignedOutSupportRequest(input(email), {
    clientIp: '203.0.113.7',
    notifier: mail,
    anonymous: minter,
    ...(session ? { session: { userId: session, role: 'user', anonymous: true } } : {}),
  });

const requestsFrom = async (email: string) =>
  (await sql`select id from support_requests where sender_email = ${email}`).length;
const userCount = async () => (await sql`select count(*)::int as n from users`)[0]!.n as number;

/** The anonymous account a keeper timed out, with the address it wrote from bound to the time-out. */
async function timedOutSender(timeout: { endsIn?: string | null; lifted?: boolean } = {}) {
  const sender = await insertAnonymousUser(sql);
  await insertSupportRequest(sql, { createdBy: sender, senderEmail: TIMED_OUT });
  return {
    sender,
    timeout: await insertSupportTimeout(sql, sender, { ...timeout, address: TIMED_OUT }),
  };
}

/** The sentence a timed-out signed-in sender's send is refused with, from the same kind of time-out. */
async function signedInRefusal(): Promise<string> {
  await insertSupportTimeout(sql, C.id);
  const refusal = (await failureOf(
    sendSupportRequest(
      asUser(C),
      { about: 'account', subject: 'Signed in', message: 'It sticks.' },
      mail,
    ),
  )) as Error;
  expect(refusal).toBeInstanceOf(Forbidden);
  return refusal.message;
}

describe('a new visitor sending from a timed-out address', () => {
  it('is refused as a timed-out signed-in sender is, writing no request and minting no account', async () => {
    await timedOutSender();
    const wording = await signedInRefusal();
    // Precondition: the same new-visitor send from another address saves and mints, so the refusal is the address's.
    await sendSignedOut('someone-else@example.test');
    expect(await requestsFrom('someone-else@example.test')).toBe(1);
    expect(minted).toHaveLength(1);
    const users = await userCount();
    const requests = await requestsFrom(TIMED_OUT);

    const refusal = await failureOf(sendSignedOut(TIMED_OUT));

    expect(refusal).toBeInstanceOf(Forbidden);
    expect((refusal as Error).message).toBe(wording);
    expect(await requestsFrom(TIMED_OUT)).toBe(requests);
    expect(minted).toHaveLength(1);
    expect(await userCount()).toBe(users);
  });

  it('matches the address however it is spelt', async () => {
    await timedOutSender();

    expect(await failureOf(sendSignedOut('  Timed-Out@EXAMPLE.test '))).toBeInstanceOf(Forbidden);
    expect(minted).toEqual([]);
  });
});

describe('a returning visitor sending from a timed-out address', () => {
  it('is refused though its own account is not timed out', async () => {
    await timedOutSender();
    const returning = await insertAnonymousUser(sql);
    await insertSupportRequest(sql, { createdBy: returning, senderEmail: 'mine@example.test' });
    // Precondition: the returning account holds no time-out, and its send from its own address saves.
    expect(await sql`select 1 from support_timeouts where user_id = ${returning}`).toHaveLength(0);
    await sendSignedOut('mine@example.test', returning);
    expect(await requestsFrom('mine@example.test')).toBe(2);

    expect(await failureOf(sendSignedOut(TIMED_OUT, returning))).toBeInstanceOf(Forbidden);
    expect(await sql`select 1 from support_requests where created_by = ${returning}`).toHaveLength(
      2,
    );
  });
});

describe('a time-out that no longer stands', () => {
  it('blocks nothing by address once lifted', async () => {
    await timedOutSender({ lifted: true });

    await sendSignedOut(TIMED_OUT);

    expect(await requestsFrom(TIMED_OUT)).toBe(2);
  });

  it('blocks nothing by address once run out', async () => {
    await timedOutSender({ endsIn: '-1 hour' });

    await sendSignedOut(TIMED_OUT);

    expect(await requestsFrom(TIMED_OUT)).toBe(2);
  });
});

describe('a keeper timing out a sender', () => {
  it('records the HMAC key of the address on the anonymous sender’s newest request, never the address', async () => {
    const sender = await insertAnonymousUser(sql);
    const older = await insertSupportRequest(sql, {
      createdBy: sender,
      senderEmail: 'older@example.test',
    });
    await sql`update support_requests set created_at = now() - interval '2 days' where id = ${older}`;
    await insertSupportRequest(sql, { createdBy: sender, senderEmail: 'Newest@Example.test' });

    const { id } = await timeOutSupportSender(
      asUser(E),
      sender,
      null,
      'Spam',
      noPauseNotifier,
      PAUSE_MESSAGE,
    );

    const [row] = await sql`select address_key from support_timeouts where id = ${id}`;
    expect(row!.address_key).toBe(addressCountKey('newest@example.test'));
    expect(String(row!.address_key).toLowerCase()).not.toContain('newest');
  });

  it('records no key for a signed-in sender, whose requests carry no address', async () => {
    await insertSupportRequest(sql, { createdBy: C.id });

    const { id } = await timeOutSupportSender(
      asUser(E),
      C.id,
      null,
      'Spam',
      noPauseNotifier,
      PAUSE_MESSAGE,
    );

    expect(await sql`select address_key from support_timeouts where id = ${id}`).toEqual([
      { address_key: null },
    ]);
  });
});

describe('the address binding’s lookup', () => {
  it('has a partial index on the key over the time-outs not lifted', async () => {
    const indexes = await sql`
      select indexdef from pg_indexes where tablename = 'support_timeouts' and indexdef like '%address_key%'`;

    expect(indexes).toHaveLength(1);
    expect(indexes[0]!.indexdef).toMatch(/WHERE \(?lifted_at IS NULL\)?/);
  });
});
