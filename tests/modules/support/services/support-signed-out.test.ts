import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { Forbidden, RateLimited, ValidationError } from '@/lib/errors';
import { SIGNED_OUT_SENDER_ID } from '@/lib/support-sender';
import {
  SIGNED_OUT_ADDRESS_LIMIT,
  SIGNED_OUT_IP_LIMIT,
  SIGNED_OUT_WINDOW_SECONDS,
  listMySupportRequests,
  replyToSupportRequest,
  sendSignedOutSupportRequest,
} from '@/modules/support';
import type { AnonymousMinter, SupportNotifier } from '@/modules/support';
import { supportReplyNotice } from '@/modules/support/jobs/support-reply-notice';
import { supportStatusMail } from '@/modules/support/jobs/support-status-mail';
import { A, E, asUser } from '../../../support/as-user';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import { insertAnonymousUser } from '../../../support/db/insert-anonymous-user';

// A visitor with no account writes about accessibility or signing in: the provisional account the send mints and writes the
// row as, the topics, the limits that guard it, and the reply that reaches them by email
// (claude-docs/design-decisions/m15-support-review.md, m15.48-anonymous-sender.md). Better Auth minting the account and
// setting its cookie is tests/db/anonymous-link.test.ts's; here the minter stands in, writing the row the plugin would.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

// A reply's notice goes out through its job, whose mail is tested in tests/workflows/support-reply-notice.test.ts.
const { startJob } = vi.hoisted(() => ({
  startJob: vi.fn(async (..._args: unknown[]) => 'run-id'),
}));
vi.mock('@/lib/jobs', () => ({ startJob }));
const replyNotices = () =>
  startJob.mock.calls.filter(([job]) => job === supportReplyNotice).map(([, args]) => args);

beforeEach(async () => {
  startJob.mockClear();
  // Set, so the receipt starts its job rather than being tried once here.
  vi.stubEnv('MAIL_TRANSPORT', 'smtp');
  await sql`truncate support_replies, support_timeouts, support_requests cascade`;
  await sql`delete from support_send_counts`;
});

afterEach(() => {
  vi.unstubAllEnvs();
});

const INPUT = {
  about: 'account',
  email: 'visitor@example.test',
  subject: 'I cannot sign in',
  message: 'The code never arrives.',
} as const;

// The receipt goes out through its job too, whose mail is tested in tests/modules/support/services/support-status-mail.test.ts.
const receipts = () =>
  startJob.mock.calls.filter(([job]) => job === supportStatusMail).map(([, args]) => args);

function notifier() {
  const mail: SupportNotifier = { origin: async () => 'http://localhost:3000' };
  return { mail };
}

/** The ids of the accounts the stand-in minter made, in order. */
let minted: string[] = [];
const minter: AnonymousMinter = {
  mint: async () => {
    const id = await insertAnonymousUser(sql);
    minted.push(id);
    return id;
  },
};
beforeEach(() => {
  minted = [];
});

const send = (
  input: Parameters<typeof sendSignedOutSupportRequest>[0] = INPUT,
  context: { clientIp?: string | null; now?: Date; mail?: SupportNotifier } = {},
) =>
  sendSignedOutSupportRequest(input, {
    clientIp: context.clientIp === undefined ? '203.0.113.7' : context.clientIp,
    notifier: context.mail ?? notifier().mail,
    now: context.now,
    anonymous: minter,
  });

const count = async () => (await sql`select count(*)::int as n from support_requests`)[0]!.n;

describe('sendSignedOutSupportRequest', () => {
  it('mints one anonymous account and stores the request as it, with the address beside it, and mails a receipt', async () => {
    const { mail } = notifier();

    await send(INPUT, { mail });

    expect(minted).toHaveLength(1);
    const [row] = await sql`select * from support_requests`;
    // Written through withAudit as the minted account: both stamps are its, never the seeded signed-out sender's.
    expect(row!.created_by).toBe(minted[0]);
    expect(row!.updated_by).toBe(minted[0]);
    expect(row!.created_by).not.toBe(SIGNED_OUT_SENDER_ID);
    expect(row!.sender_email).toBe('visitor@example.test');
    expect(row!.about).toBe('account');
    expect(row!.status).toBe('open');
    // The run carries the request id and the origin; its step reads the address from the row.
    expect(receipts()).toEqual([
      [{ kind: 'received', requestId: row!.id, origin: 'http://localhost:3000' }],
    ]);
    expect(JSON.stringify(receipts())).not.toContain('visitor@example.test');
  });

  it.each(['accessibility', 'account', 'bug', 'privacy', 'question'] as const)(
    'accepts %s',
    async (about) => {
      await send({ ...INPUT, about });

      expect(await count()).toBe(1);
    },
  );

  it.each(['compendium', 'feedback'] as const)(
    'refuses %s, which needs an account',
    async (about) => {
      // Precondition: the same send passes on an allowed topic.
      await send();
      expect(await count()).toBe(1);

      const error = await failureOf(send({ ...INPUT, about }));

      expect(error).toBeInstanceOf(Forbidden);
      expect(await count()).toBe(1);
      // Only the allowed send minted an account.
      expect(minted).toHaveLength(1);
    },
  );

  it('keeps one audited count row per key, written as the signed-out sender', async () => {
    await send(INPUT);
    await send(INPUT);

    const rows = await sql`select kind, count, created_by from support_send_counts order by kind`;
    expect(rows.map((row) => [row.kind, row.count, row.created_by])).toEqual([
      ['address', 2, SIGNED_OUT_SENDER_ID],
      ['client', 2, SIGNED_OUT_SENDER_ID],
    ]);
  });

  it('stores neither the email address nor the client address in its counts, only a keyed hash of each', async () => {
    await send(INPUT);

    const rows =
      await sql`select kind, key, row_to_json(c)::text as whole from support_send_counts c order by kind`;
    // Precondition: both keys were counted, so a stored address would have a row to sit in.
    expect(rows.map((row) => row.kind)).toEqual(['address', 'client']);
    for (const row of rows) {
      expect(row.key).toMatch(/^[0-9a-f]{64}$/);
      expect(row.whole).not.toContain(INPUT.email);
      expect(row.whole).not.toContain('visitor@');
      expect(row.whole).not.toContain('203.0.113.7');
    }
  });

  it('counts one address however its case and spacing are written', async () => {
    await send(INPUT);
    await send({ ...INPUT, email: '  Visitor@Example.TEST ' });

    const rows = await sql`select count from support_send_counts where kind = 'address'`;
    expect(rows.map((row) => row.count)).toEqual([2]);
  });

  it('refuses an address that is not one', async () => {
    const error = await failureOf(send({ ...INPUT, email: 'not an address' }));

    expect(error).toBeInstanceOf(ValidationError);
    expect(await count()).toBe(0);
    expect(minted).toEqual([]);
  });

  it('drops a send whose hidden field is filled, storing, counting and mailing nothing', async () => {
    const { mail } = notifier();

    await send({ ...INPUT, website: 'https://spam.example' }, { mail });

    expect(await count()).toBe(0);
    expect(receipts()).toEqual([]);
    expect(await sql`select 1 from support_send_counts`).toHaveLength(0);
    expect(minted).toEqual([]);
  });

  // A returning visitor whose anonymous cookie is still set: the send names that session, and the service writes as it.
  it('reuses the anonymous account of the session it is sent from, minting none', async () => {
    await send(INPUT);
    // Precondition: the first send minted the account the second one is sent from.
    expect(minted).toHaveLength(1);
    const returning = minted[0]!;

    await sendSignedOutSupportRequest(
      { ...INPUT, subject: 'A second Testwort request' },
      {
        clientIp: '203.0.113.7',
        notifier: notifier().mail,
        anonymous: minter,
        session: { userId: returning, role: 'user', anonymous: true },
      },
    );

    expect(minted).toEqual([returning]);
    expect(await sql`select created_by from support_requests order by created_at`).toEqual([
      { created_by: returning },
      { created_by: returning },
    ]);
    expect(await sql`select 1 from users where is_anonymous`).toHaveLength(1);
  });

  it('treats an address that belongs to an account as only an address', async () => {
    const [account] = await sql`select email from users where id = ${A.id}`;

    await send({ ...INPUT, email: account!.email as string });

    const [row] = await sql`select created_by, sender_email from support_requests`;
    expect(row!.created_by).toBe(minted[0]);
    expect(row!.created_by).not.toBe(A.id);
    expect(await listMySupportRequests(asUser(A), { limit: 101, inverted: false })).toHaveLength(0);
  });

  describe('the limits', () => {
    const now = new Date('2026-10-31T12:00:00Z');

    it('refuses the send after the address limit, with the seconds to wait, and passes under it', async () => {
      for (let n = 0; n < SIGNED_OUT_ADDRESS_LIMIT; n++) {
        await send(INPUT, { now, clientIp: `198.51.100.${n}` });
      }
      expect(await count()).toBe(SIGNED_OUT_ADDRESS_LIMIT);

      const error = await failureOf(send(INPUT, { now, clientIp: '198.51.100.99' }));

      expect(error).toBeInstanceOf(RateLimited);
      expect(error).toMatchObject({ retryAfterSeconds: SIGNED_OUT_WINDOW_SECONDS });
      expect(await count()).toBe(SIGNED_OUT_ADDRESS_LIMIT);
      // A refused send mints no account: one per stored request.
      expect(minted).toHaveLength(SIGNED_OUT_ADDRESS_LIMIT);
      // Another address from the same client passes: the address limit, not the send, was the guard.
      await send({ ...INPUT, email: 'other@example.test' }, { now, clientIp: '198.51.100.99' });
      expect(await count()).toBe(SIGNED_OUT_ADDRESS_LIMIT + 1);
    });

    it('refuses the send after the client limit however many addresses it writes from', async () => {
      for (let n = 0; n < SIGNED_OUT_IP_LIMIT; n++) {
        await send({ ...INPUT, email: `visitor${n}@example.test` }, { now });
      }

      const error = await failureOf(send({ ...INPUT, email: 'one-more@example.test' }, { now }));

      expect(error).toBeInstanceOf(RateLimited);
      expect(await count()).toBe(SIGNED_OUT_IP_LIMIT);
      // A different client passes.
      await send({ ...INPUT, email: 'one-more@example.test' }, { now, clientIp: '198.51.100.1' });
      expect(await count()).toBe(SIGNED_OUT_IP_LIMIT + 1);
    });

    it('lets the address send again once the window has passed', async () => {
      for (let n = 0; n < SIGNED_OUT_ADDRESS_LIMIT; n++) {
        await send(INPUT, { now, clientIp: `198.51.100.${n}` });
      }
      const later = new Date(now.getTime() + (SIGNED_OUT_WINDOW_SECONDS + 1) * 1000);

      await send(INPUT, { now: later, clientIp: '198.51.100.99' });

      expect(await count()).toBe(SIGNED_OUT_ADDRESS_LIMIT + 1);
    });
  });
});

describe('a reply to a signed-out request', () => {
  it('starts its notice with the reply’s id and the origin, and nothing of the visitor’s', async () => {
    await send();
    const [request] = await sql`select id from support_requests`;
    const { mail } = notifier();

    const reply = await replyToSupportRequest(
      asUser(E),
      request!.id as string,
      'Try the recovery link.',
      mail,
    );

    expect(replyNotices()).toEqual([[reply.id, 'http://localhost:3000']]);
  });
});
