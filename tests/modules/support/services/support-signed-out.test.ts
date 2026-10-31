import { beforeEach, describe, expect, it } from 'vitest';
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
import type { SupportNotifier } from '@/modules/support';
import { A, E, asUser } from '../../../support/as-user';
import { failureOf, useTestDatabase } from '../../../support/db/database';

// A visitor with no account writes about accessibility or signing in: the row, the two topics, the limits that guard it, and
// the reply that reaches them by email alone (claude-docs/design-decisions/m15-support-review.md).

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate support_replies, support_timeouts, support_requests cascade`;
  await sql`delete from rate_limits where key like 'support-%'`;
});

const INPUT = {
  about: 'account',
  email: 'visitor@example.test',
  subject: 'I cannot sign in',
  message: 'The code never arrives.',
} as const;

function notifier() {
  const received: string[] = [];
  const replies: { to: string; body: string }[] = [];
  const mail: SupportNotifier = {
    replyWaiting: async () => undefined,
    signedOutReceived: async (to) => {
      received.push(to);
    },
    signedOutReply: async (to, body) => {
      replies.push({ to, body });
    },
  };
  return { mail, received, replies };
}

const send = (
  input: Parameters<typeof sendSignedOutSupportRequest>[0] = INPUT,
  context: { clientIp?: string | null; now?: Date; mail?: SupportNotifier } = {},
) =>
  sendSignedOutSupportRequest(input, {
    clientIp: context.clientIp === undefined ? '203.0.113.7' : context.clientIp,
    notifier: context.mail ?? notifier().mail,
    now: context.now,
  });

const count = async () => (await sql`select count(*)::int as n from support_requests`)[0]!.n;

describe('sendSignedOutSupportRequest', () => {
  it('stores the request under the signed-out sender with the address beside it, and mails a receipt', async () => {
    const { mail, received } = notifier();

    await send(INPUT, { mail });

    const [row] = await sql`select * from support_requests`;
    expect(row!.created_by).toBe(SIGNED_OUT_SENDER_ID);
    expect(row!.sender_email).toBe('visitor@example.test');
    expect(row!.about).toBe('account');
    expect(row!.status).toBe('open');
    expect(received).toEqual(['visitor@example.test']);
  });

  it.each(['accessibility', 'account'] as const)('accepts %s', async (about) => {
    await send({ ...INPUT, about });

    expect(await count()).toBe(1);
  });

  it.each(['bug', 'compendium', 'privacy', 'feedback', 'question'] as const)(
    'refuses %s, which needs an account',
    async (about) => {
      // Precondition: the same send passes on an allowed topic.
      await send();
      expect(await count()).toBe(1);

      const error = await failureOf(send({ ...INPUT, about }));

      expect(error).toBeInstanceOf(Forbidden);
      expect(await count()).toBe(1);
    },
  );

  it('refuses an address that is not one', async () => {
    const error = await failureOf(send({ ...INPUT, email: 'not an address' }));

    expect(error).toBeInstanceOf(ValidationError);
    expect(await count()).toBe(0);
  });

  it('drops a send whose hidden field is filled, storing, counting and mailing nothing', async () => {
    const { mail, received } = notifier();

    await send({ ...INPUT, website: 'https://spam.example' }, { mail });

    expect(await count()).toBe(0);
    expect(received).toEqual([]);
    expect(await sql`select 1 from rate_limits where key like 'support-%'`).toHaveLength(0);
  });

  it('treats an address that belongs to an account as only an address', async () => {
    const [account] = await sql`select email from users where id = ${A.id}`;

    await send({ ...INPUT, email: account!.email as string });

    const [row] = await sql`select created_by, sender_email from support_requests`;
    expect(row!.created_by).toBe(SIGNED_OUT_SENDER_ID);
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
  it('is mailed to the visitor in full, and the account notice is not sent', async () => {
    await send();
    const [request] = await sql`select id from support_requests`;
    const { mail, replies } = notifier();
    let notices = 0;
    mail.replyWaiting = async () => {
      notices += 1;
    };

    await replyToSupportRequest(asUser(E), request!.id as string, 'Try the recovery link.', mail);

    expect(replies).toEqual([{ to: 'visitor@example.test', body: 'Try the recovery link.' }]);
    expect(notices).toBe(0);
  });
});
