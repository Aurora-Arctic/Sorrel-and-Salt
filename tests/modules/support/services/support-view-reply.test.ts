import { createHash, randomBytes } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { NotFound, RateLimited, ValidationError } from '@/lib/errors';
import { SIGNED_OUT_SENDER_ID } from '@/lib/support-sender';
import {
  SIGNED_OUT_ADDRESS_LIMIT,
  SIGNED_OUT_IP_LIMIT,
  SIGNED_OUT_REPLY_REQUEST_LIMIT,
  replyToSupportRequestByViewToken,
  sendSignedOutSupportRequest,
} from '@/modules/support';
import type { SupportNotifier, SupportStatusMail } from '@/modules/support';
import { MESSAGE_MAX_LENGTH } from '@/modules/support/validation/support';
import { supportStatusMail } from '@/modules/support/jobs/support-status-mail';
import { supportStatusStep } from '@/modules/support/jobs/support-status-mail-steps';
import { retentionBatchStep } from '@/modules/support/jobs/support-retention-batch-steps';
import { B } from '../../../support/as-user';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import { anonymousMinter } from '../../../support/db/insert-anonymous-user';
import { insertSupportRequest } from '../../../support/db/insert-support-request';
import { run } from '../../../support/graphql/run';

// A signed-out sender's reply from the mailed-link page: the token alone finds the request, the reply is written as the
// request's own sender account, and every way the token could be stale answers the same not-found
// (claude-docs/design-decisions/m15.48-anonymous-sender.md, "A signed-out reply through the mailed link"). The page itself
// is tests/e2e/support-view-link.spec.ts's.

const sent = vi.hoisted(() => [] as { to: string; subject: string; text: string; html: string }[]);
vi.mock('@/lib/mail', () => ({
  send: async (message: (typeof sent)[number]) => {
    sent.push(message);
  },
}));
vi.mock('@/lib/mail-transport', () => ({
  deliver: async (message: (typeof sent)[number]) => {
    sent.push(message);
    return true;
  },
}));
const { startJob } = vi.hoisted(() => ({
  startJob: vi.fn(async (..._args: unknown[]) => 'run-id'),
}));
vi.mock('@/lib/jobs', () => ({ startJob }));

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

const ORIGIN = 'http://localhost:3000';
const mail: SupportNotifier = { origin: async () => ORIGIN };
const VIEW_LINK = /\/support\/request\/([A-Za-z0-9_-]{32,})/;
const sha256Hex = (token: string) => createHash('sha256').update(token).digest('hex');
const IP = '203.0.113.7';

beforeEach(async () => {
  vi.stubEnv('MAIL_TRANSPORT', 'smtp');
  startJob.mockClear();
  sent.length = 0;
  await sql`truncate support_replies, support_timeouts, support_requests, support_send_counts cascade`;
});

afterEach(() => {
  vi.unstubAllEnvs();
});

/** A signed-out send from `email` and `clientIp`, its receipt's step run, and the token the receipt carried. */
async function sendSignedOut(email = 'visitor@example.test', clientIp = IP) {
  const subject = `Testwort request ${randomBytes(4).toString('hex')}`;
  await sendSignedOutSupportRequest(
    { about: 'account', email, subject, message: 'It never arrives.' },
    { clientIp, notifier: mail, anonymous: anonymousMinter(sql) },
  );
  const [row] = await sql`select id, created_by from support_requests where subject = ${subject}`;
  const runs = startJob.mock.calls
    .filter(([job]) => job === supportStatusMail)
    .map(([, args]) => (args as [SupportStatusMail])[0]);
  startJob.mockClear();
  sent.length = 0;
  for (const statusRun of runs) await supportStatusStep(statusRun);
  const token = sent.map(({ text }) => text.match(VIEW_LINK)?.[1]).find(Boolean);
  expect(token).toBeDefined();
  return { id: row!.id as string, senderId: row!.created_by as string, token: token! };
}

const reply = (token: string, body = 'It still sticks.', clientIp: string | null = IP) =>
  replyToSupportRequestByViewToken(token, { body }, { clientIp });

const repliesOn = (requestId: string) =>
  sql`select author_role, visibility, body, created_by, updated_by from support_replies where request_id = ${requestId}`;

describe('a reply through the mailed link', () => {
  it('is written as the request’s anonymous sender, needing no session', async () => {
    const { id, senderId, token } = await sendSignedOut();
    // Precondition: the request is the anonymous account's and has no reply yet.
    expect(
      (await sql`select is_anonymous from users where id = ${senderId}`)[0]?.is_anonymous,
    ).toBe(true);
    expect(await repliesOn(id)).toHaveLength(0);

    await reply(token);

    expect(await repliesOn(id)).toEqual([
      {
        author_role: 'sender',
        visibility: 'public',
        body: 'It still sticks.',
        created_by: senderId,
        updated_by: senderId,
      },
    ]);
  });

  it('is written as the seeded signed-out sender on a request from before anonymous accounts', async () => {
    const token = randomBytes(32).toString('base64url');
    const id = await insertSupportRequest(sql, {
      createdBy: SIGNED_OUT_SENDER_ID,
      senderEmail: 'older@example.test',
    });
    await sql`update support_requests set view_token_hash = ${sha256Hex(token)} where id = ${id}`;

    await reply(token);

    expect(await repliesOn(id)).toMatchObject([
      { author_role: 'sender', created_by: SIGNED_OUT_SENDER_ID, updated_by: SIGNED_OUT_SENDER_ID },
    ]);
  });

  it('drops a reply whose hidden field is filled, writing and counting nothing', async () => {
    const { id, token } = await sendSignedOut();
    const counted = await sql`select kind, count from support_send_counts order by kind`;

    await replyToSupportRequestByViewToken(
      token,
      { body: 'Buy now.', website: 'https://spam.example' },
      { clientIp: IP },
    );

    expect(await repliesOn(id)).toHaveLength(0);
    expect(await sql`select kind, count from support_send_counts order by kind`).toEqual(counted);
  });

  it('refuses an empty body and one past the signed-in reply’s limit, and takes one at the limit', async () => {
    const { id, token } = await sendSignedOut();

    expect(await failureOf(reply(token, '   '))).toBeInstanceOf(ValidationError);
    expect(await failureOf(reply(token, 'x'.repeat(MESSAGE_MAX_LENGTH + 1)))).toBeInstanceOf(
      ValidationError,
    );
    expect(await repliesOn(id)).toHaveLength(0);

    await reply(token, 'x'.repeat(MESSAGE_MAX_LENGTH));
    expect(await repliesOn(id)).toHaveLength(1);
  });
});

describe('a stale token', () => {
  it('answers the same not-found to a wrong token and an older one', async () => {
    const { id, token: first } = await sendSignedOut();
    // A second mail mints a newer token: the resolved mail, as staff resolving would start it.
    await sql`update support_requests set status = 'resolved', resolved_at = now() where id = ${id}`;
    await supportStatusStep({ kind: 'resolved', requestId: id, origin: ORIGIN });
    const newest = sent.map(({ text }) => text.match(VIEW_LINK)?.[1]).find(Boolean)!;
    // Preconditions: the tokens differ, and the newest one is honoured.
    expect(newest).not.toBe(first);
    await sql`update support_requests set status = 'open', resolved_at = null where id = ${id}`;
    await reply(newest);
    expect(await repliesOn(id)).toHaveLength(1);

    expect(await failureOf(reply(first))).toBeInstanceOf(NotFound);
    expect(await failureOf(reply(`${newest.slice(0, -1)}x`))).toBeInstanceOf(NotFound);
    expect(await repliesOn(id)).toHaveLength(1);
  });

  it('answers not-found on a closed request and on an anonymised one', async () => {
    const closed = await sendSignedOut('closed@example.test');
    const anonymised = await sendSignedOut('anonymised@example.test');
    // Precondition: both tokens were honoured while their requests were open.
    await reply(closed.token);
    await reply(anonymised.token);
    await sql`
      update support_requests set status = 'closed', resolved_at = now() - interval '13 months',
        closed_at = now() - interval '13 months' where id in (${closed.id}, ${anonymised.id})`;
    await sql`update support_requests set closed_at = now() where id = ${closed.id}`;
    expect(
      await retentionBatchStep({
        kind: 'anonymise',
        ids: [anonymised.id],
        now: Date.now(),
        origin: ORIGIN,
      }),
    ).toBe(1);

    expect(await failureOf(reply(closed.token))).toBeInstanceOf(NotFound);
    expect(await failureOf(reply(anonymised.token))).toBeInstanceOf(NotFound);
    expect(await sql`select 1 from support_replies`).toHaveLength(2);
  });

  it('answers not-found on a request a real account holds, even with its hash still on the row', async () => {
    const token = randomBytes(32).toString('base64url');
    const id = await insertSupportRequest(sql, { createdBy: B.id });
    await sql`update support_requests set view_token_hash = ${sha256Hex(token)} where id = ${id}`;

    expect(await failureOf(reply(token))).toBeInstanceOf(NotFound);
    expect(await repliesOn(id)).toHaveLength(0);
  });
});

describe('the limits', () => {
  it('caps the replies on one request in 24 hours, and not another request’s', async () => {
    // Precondition: the cap is reached before the per-address limit, so the refusal is the cap's.
    expect(SIGNED_OUT_REPLY_REQUEST_LIMIT).toBeLessThan(SIGNED_OUT_ADDRESS_LIMIT - 1);
    const capped = await sendSignedOut('capped@example.test', '203.0.113.20');
    const other = await sendSignedOut('other@example.test', '203.0.113.21');
    for (let n = 0; n < SIGNED_OUT_REPLY_REQUEST_LIMIT; n++) {
      await reply(capped.token, `Reply ${n}`, `198.51.100.${n + 1}`);
    }

    expect(await failureOf(reply(capped.token, 'One more', '198.51.100.200'))).toBeInstanceOf(
      RateLimited,
    );
    expect(await repliesOn(capped.id)).toHaveLength(SIGNED_OUT_REPLY_REQUEST_LIMIT);
    await reply(other.token, 'Mine is separate', '198.51.100.201');
    expect(await repliesOn(other.id)).toHaveLength(1);
  });

  it('counts against the address’s send limit', async () => {
    const first = await sendSignedOut('busy@example.test');
    for (let n = 1; n < SIGNED_OUT_ADDRESS_LIMIT; n++) await sendSignedOut('busy@example.test');
    // Precondition: the address has used its sends, and this request has no reply, so the cap is not the reason.
    expect(
      await sql`select 1 from support_requests where sender_email = 'busy@example.test'`,
    ).toHaveLength(SIGNED_OUT_ADDRESS_LIMIT);

    expect(await failureOf(reply(first.token, 'Still here', '198.51.100.9'))).toBeInstanceOf(
      RateLimited,
    );
    expect(await repliesOn(first.id)).toHaveLength(0);
  });

  it('counts against the client’s send limit', async () => {
    const first = await sendSignedOut('client-0@example.test');
    for (let n = 1; n < SIGNED_OUT_IP_LIMIT; n++) await sendSignedOut(`client-${n}@example.test`);
    expect(await sql`select 1 from support_requests`).toHaveLength(SIGNED_OUT_IP_LIMIT);

    expect(await failureOf(reply(first.token))).toBeInstanceOf(RateLimited);
    expect(await repliesOn(first.id)).toHaveLength(0);
  });
});

describe('the mutation', () => {
  const MUTATION =
    'mutation ($token: String!, $body: String!) { replyToSupportRequestByViewToken(token: $token, body: $body) }';

  it('takes a reply with no session, and its answer carries no token', async () => {
    const { id, token } = await sendSignedOut();

    const answer = await run(null, MUTATION, { token, body: 'From the link.' });

    expect(answer.errors).toBeUndefined();
    expect(answer.data).toEqual({ replyToSupportRequestByViewToken: true });
    expect(await repliesOn(id)).toHaveLength(1);
    expect(JSON.stringify(answer)).not.toContain(token);
  });

  it('answers a stale token as not found, without echoing it', async () => {
    const { token } = await sendSignedOut();
    const wrong = `${token.slice(0, -1)}x`;

    const answer = await run(null, MUTATION, { token: wrong, body: 'From the link.' });

    expect(answer.errors?.[0]).toMatchObject({ extensions: { code: 'NOT_FOUND' } });
    expect(JSON.stringify(answer)).not.toContain(wrong);
    expect(await sql`select 1 from support_replies`).toHaveLength(0);
  });
});
