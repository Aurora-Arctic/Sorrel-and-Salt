import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { getNamedType, isObjectType, type GraphQLObjectType } from 'graphql';
import { schema } from '@/graphql/schema';
import { SIGNED_OUT_SENDER_ID } from '@/lib/support-sender';
import { SYSTEM_ACTOR_ID } from '@/lib/system-actor';
import * as support from '@/modules/support';
import { C, E } from '../../../support/as-user';
import { run } from '../../../support/graphql/run';
import { useTestDatabase } from '../../../support/db/database';
import {
  insertSupportReply,
  insertSupportRequest,
} from '../../../support/db/insert-support-request';

// The link carries its token in the URL fragment, which the browser never sends (claude-docs/design-decisions/support.md, "A signed-out sender reaches their request by a mailed link").

const { mintSupportViewToken } = support;
const viewLimit = () =>
  (support as unknown as { SIGNED_OUT_VIEW_LIMIT?: number }).SIGNED_OUT_VIEW_LIMIT;

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate support_replies, support_timeouts, support_requests, support_send_counts cascade`;
});

const IP = '203.0.113.20';
const ADDRESS = 'visitor@example.test';
const SUBJECT = 'The Testwort jar will not open';

const VIEW = /* GraphQL */ `
  query ($token: String!) {
    supportRequestByViewToken(token: $token) {
      id
      subject
      message
      status
      about
      sentAt
      replies {
        body
        authorRole
      }
    }
  }
`;

const REPLY = /* GraphQL */ `
  mutation ($token: String!, $body: String!) {
    replyToSupportRequestByViewToken(token: $token, body: $body)
  }
`;

type Viewed = {
  supportRequestByViewToken: {
    id: string;
    subject: string;
    message: string;
    status: string;
    about: string;
    sentAt: string;
    replies: { body: string; authorRole: string }[];
  } | null;
};

const view = (token: string, clientIp: string | null = IP) =>
  run<Viewed>(null, VIEW, { token }, { clientIp });
const replyBy = (token: string, body = 'It still sticks.', clientIp: string | null = IP) =>
  run<{ replyToSupportRequestByViewToken: boolean | null }>(
    null,
    REPLY,
    { token, body },
    { clientIp },
  );

async function signedOutRequest(status: 'open' | 'resolved' | 'closed' = 'open') {
  const id = await insertSupportRequest(sql, {
    createdBy: SIGNED_OUT_SENDER_ID,
    senderEmail: ADDRESS,
    subject: SUBJECT,
    status,
  });
  return { id, token: await mintSupportViewToken(id) };
}

const refusal = (answer: {
  errors?: { message: string; extensions?: Record<string, unknown> }[];
}) =>
  answer.errors?.[0] && {
    code: answer.errors[0].extensions?.code,
    message: answer.errors[0].message,
  };

async function secondsLeft(id: string): Promise<number> {
  const [row] = await sql`
    select extract(epoch from view_token_expires_at - now())::float8 as left
    from support_requests where id = ${id}`;
  return row!.left as number;
}

const DAY = 24 * 60 * 60;

describe('Query.supportRequestByViewToken', () => {
  it('shows a caller with no session the request, its status and its public replies, without any internal note', async () => {
    const { id, token } = await signedOutRequest();
    await insertSupportReply(sql, id, {
      role: 'staff',
      createdBy: E.id,
      body: 'Try the code on the card.',
    });
    await insertSupportReply(sql, id, {
      role: 'staff',
      createdBy: E.id,
      body: 'Staff only: a repeat caller.',
      visibility: 'internal',
    });

    const answer = await view(token);

    expect(answer.errors).toBeUndefined();
    expect(answer.data?.supportRequestByViewToken).toMatchObject({
      id,
      subject: SUBJECT,
      message: 'It sticks at the lid.',
      status: 'open',
      about: 'account',
      replies: [{ body: 'Try the code on the card.', authorRole: 'staff' }],
    });
    expect(answer.data?.supportRequestByViewToken?.sentAt).toEqual(expect.any(String));
  });

  it('declares only what the page shows: no address, token, hash or staff field', () => {
    const field = schema.getQueryType()?.getFields().supportRequestByViewToken;
    expect(field, 'Query.supportRequestByViewToken').toBeDefined();
    const type = getNamedType(field!.type);
    expect(isObjectType(type)).toBe(true);
    const fields = Object.keys((type as GraphQLObjectType).getFields());
    expect(fields).toEqual(
      expect.arrayContaining(['id', 'subject', 'message', 'status', 'about', 'sentAt', 'replies']),
    );
    const allowed = [
      'id',
      'subject',
      'message',
      'status',
      'about',
      'sentAt',
      'updatedAt',
      'resolvedAt',
      'replies',
    ];
    expect(fields.filter((name) => !allowed.includes(name))).toEqual([]);

    const reply = getNamedType(
      (type as GraphQLObjectType).getFields().replies!.type,
    ) as GraphQLObjectType;
    expect(
      Object.keys(reply.getFields()).filter(
        (name) => !['id', 'authorRole', 'body', 'sentAt'].includes(name),
      ),
    ).toEqual([]);
  });

  it('answers one NotFound for a wrong, an older, a closed, a claimed and an anonymised token', async () => {
    const wrong = refusal(await view('w'.repeat(43)));
    expect(wrong?.code).toBe('NOT_FOUND');

    const older = await signedOutRequest();
    const newest = await mintSupportViewToken(older.id);
    const closed = await signedOutRequest();
    const claimed = await signedOutRequest();
    const anonymised = await signedOutRequest();

    // Why each could have been found: every token but the older one opens its request before the change.
    for (const token of [newest, closed.token, claimed.token, anonymised.token]) {
      expect((await view(token, '198.51.100.98')).data?.supportRequestByViewToken?.subject).toBe(
        SUBJECT,
      );
    }

    await sql`update support_requests set status = 'closed' where id = ${closed.id}`;
    await sql`update support_requests set created_by = ${C.id}, sender_email = null where id = ${claimed.id}`;
    await sql`update support_requests set created_by = ${SYSTEM_ACTOR_ID}, sender_email = null where id = ${anonymised.id}`;

    for (const token of [older.token, closed.token, claimed.token, anonymised.token]) {
      const answer = await view(token, '198.51.100.99');
      expect(answer.data?.supportRequestByViewToken ?? null).toBeNull();
      expect(refusal(answer)).toEqual(wrong);
    }
  });

  it('counts each read toward a per-client limit, a wrong token too, and refuses the next with a retry time', async () => {
    const limit = viewLimit();
    expect(limit, 'SIGNED_OUT_VIEW_LIMIT').toEqual(expect.any(Number));
    const { token } = await signedOutRequest();

    for (let read = 0; read < limit!; read += 1) {
      expect(refusal(await view('w'.repeat(43)))?.code).toBe('NOT_FOUND');
    }
    const over = await view(token);

    expect(over.data?.supportRequestByViewToken ?? null).toBeNull();
    expect(refusal(over)?.code).toBe('RATE_LIMITED');
    // Why it is the limit and not the token: another client reads the same request.
    expect((await view(token, '198.51.100.7')).data?.supportRequestByViewToken?.subject).toBe(
      SUBJECT,
    );
  });
});

describe('the mailed token’s 30 days', () => {
  it('runs 30 days from the mint, stored on the request', async () => {
    const { id } = await signedOutRequest();

    expect(Math.abs((await secondsLeft(id)) - 30 * DAY)).toBeLessThan(60);
  });

  it('still opens the request and takes a reply 29 days in', async () => {
    const { id, token } = await signedOutRequest();
    await sql`update support_requests set view_token_expires_at = now() + interval '1 day' where id = ${id}`;

    expect((await view(token)).data?.supportRequestByViewToken?.subject).toBe(SUBJECT);
    const replied = await replyBy(token);
    expect(replied.errors).toBeUndefined();
    expect(replied.data?.replyToSupportRequestByViewToken).toBe(true);
  });

  it('answers the wrong token’s NotFound to the query and the reply once the 30 days are out, writing no reply', async () => {
    const { id, token } = await signedOutRequest();
    const wrong = refusal(await view('w'.repeat(43)));
    // Why it could have opened: the token works before its end.
    expect((await view(token)).data?.supportRequestByViewToken?.subject).toBe(SUBJECT);

    await sql`update support_requests set view_token_expires_at = now() - interval '1 second' where id = ${id}`;

    const viewed = await view(token);
    expect(viewed.data?.supportRequestByViewToken ?? null).toBeNull();
    expect(refusal(viewed)).toEqual(wrong);
    const replied = await replyBy(token);
    expect(replied.data?.replyToSupportRequestByViewToken ?? null).toBeNull();
    expect(refusal(replied)).toEqual(wrong);
    expect(await sql`select id from support_replies where request_id = ${id}`).toEqual([]);
  });

  it('starts the 30 days again with each new mail’s token', async () => {
    const { id } = await signedOutRequest();
    await sql`update support_requests set view_token_expires_at = now() - interval '1 second' where id = ${id}`;

    const fresh = await mintSupportViewToken(id);

    expect(Math.abs((await secondsLeft(id)) - 30 * DAY)).toBeLessThan(60);
    expect((await view(fresh)).data?.supportRequestByViewToken?.subject).toBe(SUBJECT);
  });
});
