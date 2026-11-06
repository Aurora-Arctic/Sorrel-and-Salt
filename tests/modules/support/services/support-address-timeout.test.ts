import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { Forbidden } from '@/lib/errors';
import { addressCountKey } from '@/lib/send-count-key';
import { SIGNED_OUT_SENDER_ID } from '@/lib/support-sender';
import * as support from '@/modules/support';
import type { SupportNotifier, SupportTimeoutRow } from '@/modules/support';
import type { Session } from '@/lib/session';
import { C, E, F, asUser } from '../../../support/as-user';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import { insertSupportRequest } from '../../../support/db/insert-support-request';
import { insertSupportTimeout } from '../../../support/db/insert-support-timeout';
import { PAUSE_MESSAGE, noPauseNotifier } from '../../../support/email-verification';

// A signed-out sender has no account of its own: every signed-out request is written as the one seeded stand-in. So a
// keeper's time-out on a signed-out request names the address it came from, kept as its HMAC key and never in clear, with
// no account, and that time-out refuses the next signed-out send from the address
// (claude-docs/design-decisions/m15.48-anonymous-sender.md). The mailed-link reply is support-view-reply.test.ts's, and the
// claim by email tests/db/support-claim-by-email.test.ts's.

const { sendSignedOutSupportRequest, sendSupportRequest, timeOutSupportSender } = support;

/** The keeper's time-out of a signed-out request's sender, named by the request, as this task adds it. */
const timeOutSignedOutSender = (
  support as unknown as {
    timeOutSignedOutSender: (
      session: Session,
      requestId: string,
      until: Date | null,
      note: string,
      notifier: typeof noPauseNotifier,
      message: string | null,
    ) => Promise<SupportTimeoutRow>;
  }
).timeOutSignedOutSender;

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
});

afterEach(() => {
  vi.unstubAllEnvs();
});

const TIMED_OUT = 'timed-out@example.test';
const mail: SupportNotifier = { origin: async () => 'http://localhost:3000' };

const input = (email: string, subject = `Testwort from ${email}`) =>
  ({ about: 'account', email, subject, message: 'The code never arrives.' }) as const;

const sendSignedOut = (email: string) =>
  sendSignedOutSupportRequest(input(email), {
    clientIp: '203.0.113.7',
    notifier: mail,
  } as Parameters<typeof sendSignedOutSupportRequest>[1]);

const requestsFrom = async (email: string) =>
  (await sql`select id from support_requests where sender_email = ${email}`).length;
const userCount = async () => (await sql`select count(*)::int as n from users`)[0]!.n as number;

/** A signed-out request from TIMED_OUT, and a keeper's time-out on its address with no account. */
async function timedOutAddress(timeout: { endsIn?: string | null; lifted?: boolean } = {}) {
  await insertSupportRequest(sql, { createdBy: SIGNED_OUT_SENDER_ID, senderEmail: TIMED_OUT });
  return insertSupportTimeout(sql, null, { ...timeout, address: TIMED_OUT });
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

describe('a signed-out send from a timed-out address', () => {
  it('is refused as a timed-out signed-in sender is, writing no request and making no account', async () => {
    await timedOutAddress();
    const wording = await signedInRefusal();
    // Precondition: the same send from another address saves, so the refusal is the address's.
    await sendSignedOut('someone-else@example.test');
    expect(await requestsFrom('someone-else@example.test')).toBe(1);
    const users = await userCount();
    const requests = await requestsFrom(TIMED_OUT);

    const refusal = await failureOf(sendSignedOut(TIMED_OUT));

    expect(refusal).toBeInstanceOf(Forbidden);
    expect((refusal as Error).message).toBe(wording);
    expect(await requestsFrom(TIMED_OUT)).toBe(requests);
    expect(await userCount()).toBe(users);
  });

  it('matches the address however it is spelt', async () => {
    await timedOutAddress();

    expect(await failureOf(sendSignedOut('  Timed-Out@EXAMPLE.test '))).toBeInstanceOf(Forbidden);
  });
});

describe('a time-out that no longer stands', () => {
  it('blocks nothing by address once lifted', async () => {
    await timedOutAddress({ lifted: true });

    await sendSignedOut(TIMED_OUT);

    expect(await requestsFrom(TIMED_OUT)).toBe(2);
  });

  it('blocks nothing by address once run out', async () => {
    await timedOutAddress({ endsIn: '-1 hour' });

    await sendSignedOut(TIMED_OUT);

    expect(await requestsFrom(TIMED_OUT)).toBe(2);
  });
});

describe('a keeper timing out a signed-out request’s sender', () => {
  it('records the HMAC key of the request’s address and no account, never the address', async () => {
    const request = await insertSupportRequest(sql, {
      createdBy: SIGNED_OUT_SENDER_ID,
      senderEmail: 'Newest@Example.test',
    });

    const { id } = await timeOutSignedOutSender(
      asUser(E),
      request,
      null,
      'Spam',
      noPauseNotifier,
      PAUSE_MESSAGE,
    );

    const [row] = await sql`select user_id, address_key from support_timeouts where id = ${id}`;
    expect(row!.user_id).toBeNull();
    expect(row!.address_key).toBe(addressCountKey('newest@example.test'));
    expect(String(row!.address_key).toLowerCase()).not.toContain('newest');
  });

  it('then refuses the next signed-out send from that address', async () => {
    const request = await insertSupportRequest(sql, {
      createdBy: SIGNED_OUT_SENDER_ID,
      senderEmail: TIMED_OUT,
    });
    // Precondition: before the time-out the address sends.
    await sendSignedOut(TIMED_OUT);
    expect(await requestsFrom(TIMED_OUT)).toBe(2);

    await timeOutSignedOutSender(asUser(E), request, null, 'Spam', noPauseNotifier, PAUSE_MESSAGE);

    expect(await failureOf(sendSignedOut(TIMED_OUT))).toBeInstanceOf(Forbidden);
    expect(await requestsFrom(TIMED_OUT)).toBe(2);
  });

  it('refuses a request with no address, writing no time-out', async () => {
    const request = await insertSupportRequest(sql, { createdBy: C.id });

    const error = await failureOf(
      timeOutSignedOutSender(asUser(E), request, null, 'Spam', noPauseNotifier, PAUSE_MESSAGE),
    );

    expect(error).toBeInstanceOf(Forbidden);
    expect(await sql`select 1 from support_timeouts`).toHaveLength(0);
  });

  it('refuses a curator, writing no time-out', async () => {
    const request = await insertSupportRequest(sql, {
      createdBy: SIGNED_OUT_SENDER_ID,
      senderEmail: TIMED_OUT,
    });
    // Precondition: the same call as a keeper writes one, so the refusal below is the role's.
    await timeOutSignedOutSender(asUser(E), request, null, 'Spam', noPauseNotifier, PAUSE_MESSAGE);
    await sql`truncate support_timeouts`;

    const error = await failureOf(
      timeOutSignedOutSender(asUser(F), request, null, 'Spam', noPauseNotifier, PAUSE_MESSAGE),
    );

    expect(error).toBeInstanceOf(Forbidden);
    expect(await sql`select 1 from support_timeouts`).toHaveLength(0);
  });

  it('still refuses a time-out naming the stand-in account itself', async () => {
    await insertSupportRequest(sql, { createdBy: SIGNED_OUT_SENDER_ID, senderEmail: TIMED_OUT });

    const error = await failureOf(
      timeOutSupportSender(
        asUser(E),
        SIGNED_OUT_SENDER_ID,
        null,
        'Spam',
        noPauseNotifier,
        PAUSE_MESSAGE,
      ),
    );

    expect(error).toBeInstanceOf(Forbidden);
    expect(await sql`select 1 from support_timeouts`).toHaveLength(0);
  });
});

describe('a keeper timing out a signed-in sender', () => {
  it('records the account and no address key', async () => {
    await insertSupportRequest(sql, { createdBy: C.id });

    const { id } = await timeOutSupportSender(
      asUser(E),
      C.id,
      null,
      'Spam',
      noPauseNotifier,
      PAUSE_MESSAGE,
    );

    expect(await sql`select user_id, address_key from support_timeouts where id = ${id}`).toEqual([
      { user_id: C.id, address_key: null },
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
