import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { getNamedType, isEnumType, isObjectType, type GraphQLObjectType } from 'graphql';
import { schema } from '@/graphql/schema';
import { NotFound } from '@/lib/errors';
import {
  addSupportInternalNote,
  getSupportRequestByViewToken,
  replyToSupportRequest,
  resolveSupportRequest,
  sendSignedOutSupportRequest,
  sendSupportRequest,
} from '@/modules/support';
import type { SupportNotifier, SupportStatusMail } from '@/modules/support';
import { supportStatusMail } from '@/modules/support/jobs/support-status-mail';
import { supportStatusStep } from '@/modules/support/jobs/support-status-mail-steps';
import { replyNoticeStep } from '@/modules/support/jobs/support-reply-notice-steps';
import { retentionBatchStep } from '@/modules/support/jobs/support-retention-batch-steps';
import { C, E, asUser } from '../../../support/as-user';
import { run } from '../../../support/graphql/run';
import { failureOf, useTestDatabase } from '../../../support/db/database';

// Only the newest mailed link works (claude-docs/design-decisions/support.md, "The mailed link and the signed-out reply"); the last describe holds every GraphQL answer to carrying neither token nor hash.

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
const VIEW_LINK = /http:\/\/localhost:3000\/support\/request#([A-Za-z0-9_-]{32,})/;
const sha256Hex = (token: string) => createHash('sha256').update(token).digest('hex');
const noticeDay = () => Date.now() + 6 * 24 * 60 * 60 * 1000;

beforeEach(async () => {
  // Set, so the received and resolved mails start runs whose steps the tests call, as the job would.
  vi.stubEnv('MAIL_TRANSPORT', 'smtp');
  startJob.mockClear();
  sent.length = 0;
  await sql`truncate support_replies, support_timeouts, support_requests, support_send_counts cascade`;
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function tokenIn(text: string): string {
  const token = text.match(VIEW_LINK)?.[1];
  expect(token, text).toBeDefined();
  return token!;
}

async function runStatusMails() {
  const runs = startJob.mock.calls
    .filter(([job]) => job === supportStatusMail)
    .map(([, args]) => (args as [SupportStatusMail])[0]);
  startJob.mockClear();
  sent.length = 0;
  for (const run of runs) await supportStatusStep(run);
  return [...sent];
}

const hashOf = async (id: string) =>
  (await sql`select view_token_hash from support_requests where id = ${id}`)[0]?.view_token_hash as
    string | null;

async function sendSignedOut(email = 'visitor@example.test', subject = 'The Testwort code') {
  await sendSignedOutSupportRequest(
    { about: 'account', email, subject, message: 'It never arrives.' },
    { clientIp: '203.0.113.7', notifier: mail } as Parameters<
      typeof sendSignedOutSupportRequest
    >[1],
  );
  const [row] = await sql`select id from support_requests where subject = ${subject}`;
  const [receipt] = await runStatusMails();
  return { id: row!.id as string, receipt: receipt!, token: tokenIn(receipt!.text) };
}

describe('the receipt’s link', () => {
  it('stores only the SHA-256 hash of the token it mails', async () => {
    const { id, receipt, token } = await sendSignedOut();

    expect(receipt.to).toBe('visitor@example.test');
    expect(receipt.html).toContain(`/support/request#${token}`);
    expect(await hashOf(id)).toBe(sha256Hex(token));
    const [row] = await sql`select * from support_requests where id = ${id}`;
    expect(JSON.stringify(row)).not.toContain(token);
  });

  it('opens that request and its public replies with no session, and nothing of another request', async () => {
    const first = await sendSignedOut('first@example.test', 'The first Testwort request');
    const second = await sendSignedOut('second@example.test', 'The second Testwort request');
    await replyToSupportRequest(asUser(E), first.id, 'Which code?', mail);
    await addSupportInternalNote(asUser(E), first.id, 'Internal: a repeat caller.');
    // Precondition: two requests with links of their own, so one answer per link is the lookup's doing.
    expect(first.token).not.toBe(second.token);

    const view = await getSupportRequestByViewToken(first.token);

    expect(view).toMatchObject({ id: first.id, subject: 'The first Testwort request' });
    expect(view.replies.map(({ body }) => body)).toEqual(['Which code?']);
    expect(JSON.stringify(view)).not.toContain('repeat caller');
    expect(JSON.stringify(view)).not.toContain('first@example.test');
    expect(await getSupportRequestByViewToken(second.token)).toMatchObject({ id: second.id });
  });

  it('answers not-found to a token no mail carried', async () => {
    const { token } = await sendSignedOut();
    // Precondition: the real token opens the request, so the refusal is the token's.
    await expect(getSupportRequestByViewToken(token)).resolves.toBeDefined();

    expect(await failureOf(getSupportRequestByViewToken(`${token.slice(0, -1)}x`))).toBeInstanceOf(
      NotFound,
    );
    expect(await failureOf(getSupportRequestByViewToken(''))).toBeInstanceOf(NotFound);
  });
});

describe('each later mail', () => {
  it('mints a fresh link in the staff reply, the resolved mail and the closing notice, and each makes the one before it not-found', async () => {
    const { id, token: receiptToken } = await sendSignedOut();
    const tokens = [receiptToken];

    const reply = await replyToSupportRequest(asUser(E), id, 'Use the card.', mail);
    sent.length = 0;
    expect(await replyNoticeStep(reply.id, ORIGIN)).toBe(true);
    tokens.push(tokenIn(sent[0]!.text));

    await resolveSupportRequest(asUser(E), id, mail);
    tokens.push(tokenIn((await runStatusMails())[0]!.text));

    sent.length = 0;
    expect(
      await retentionBatchStep({ kind: 'notice', ids: [id], now: noticeDay(), origin: ORIGIN }),
    ).toBe(1);
    tokens.push(tokenIn(sent[0]!.text));

    expect(new Set(tokens).size).toBe(4);
    expect(await hashOf(id)).toBe(sha256Hex(tokens[3]!));
    await expect(getSupportRequestByViewToken(tokens[3]!)).resolves.toMatchObject({ id });
    for (const older of tokens.slice(0, 3)) {
      expect(await failureOf(getSupportRequestByViewToken(older))).toBeInstanceOf(NotFound);
    }
  });
});

describe('an anonymised request', () => {
  it('answers not-found to its newest link', async () => {
    const { id, token } = await sendSignedOut();
    // Precondition: the link opened it before the anonymising.
    await expect(getSupportRequestByViewToken(token)).resolves.toMatchObject({ id });
    await sql`
      update support_requests set status = 'closed', resolved_at = now() - interval '13 months',
        closed_at = now() - interval '13 months' where id = ${id}`;
    expect(
      await retentionBatchStep({ kind: 'anonymise', ids: [id], now: Date.now(), origin: ORIGIN }),
    ).toBe(1);

    expect(await failureOf(getSupportRequestByViewToken(token))).toBeInstanceOf(NotFound);
  });
});

describe('a signed-in sender’s mail', () => {
  it('links to the account’s support page and mints no view link', async () => {
    const request = await sendSupportRequest(
      asUser(C),
      { about: 'bug', subject: 'The jar will not open', message: 'It sticks.' },
      mail,
    );
    const [receipt] = await runStatusMails();

    expect(receipt!.text).toContain(`/account/support?request=${request.id}`);
    expect(receipt!.text).not.toMatch(VIEW_LINK);
    expect(await hashOf(request.id)).toBeNull();
  });
});

describe('the GraphQL schema', () => {
  function scalarsOf(type: GraphQLObjectType, staff: boolean): string {
    return Object.values(type.getFields())
      .filter((field) => !isObjectType(getNamedType(field.type)))
      .filter(
        (field) =>
          staff || !(field.extensions.pothosOptions as { authScopes?: unknown }).authScopes,
      )
      .filter((field) =>
        field.args.every(
          (arg) => arg.defaultValue !== undefined || !String(arg.type).endsWith('!'),
        ),
      )
      .map((field) => field.name)
      .join(' ');
  }

  it('names no field for the token or its hash on any type', () => {
    // A token or hash is a string, so a field answering only a Boolean, number or enum cannot carry one, whatever its
    // name: replyToSupportRequestByViewToken takes the token and answers a Boolean.
    const fields = Object.values(schema.getTypeMap())
      .filter((type) => isObjectType(type) && !type.name.startsWith('__'))
      .flatMap((type) =>
        Object.entries((type as GraphQLObjectType).getFields())
          .filter(([, field]) => {
            const named = getNamedType(field.type);
            return !isEnumType(named) && !['Boolean', 'Int', 'Float'].includes(named.name);
          })
          .map(([name]) => `${type.name}.${name}`),
      );
    // Precondition: the walk reaches the support request type.
    expect(fields).toContain('SupportRequest.subject');

    expect(
      fields.filter(
        (name) => /viewToken|tokenHash/i.test(name) && name !== 'Query.supportRequestByViewToken',
      ),
    ).toEqual([]);
  });

  it('carries neither the token nor its hash in the mailed-link page’s or a keeper’s answer about the request', async () => {
    const { id, token } = await sendSignedOut();
    const request = schema.getType('SupportRequest') as GraphQLObjectType;
    const reply = schema.getType('SupportReply') as GraphQLObjectType;
    const selection = `{ ${scalarsOf(request, true)} replies { ${scalarsOf(reply, true)} } }`;
    expect(selection).toContain('errorReference');
    await replyToSupportRequest(asUser(E), id, 'Which code?', mail);

    const answers = [
      await run(asUser(E), `query ($id: ID!) { supportRequest(id: $id) ${selection} }`, {
        id,
      }),
      { errors: undefined, data: await getSupportRequestByViewToken(token) },
    ];

    for (const answer of answers) {
      // Precondition: the request came back, so an absent token is not an absent answer.
      expect(answer.errors).toBeUndefined();
      expect(JSON.stringify(answer.data)).toContain(id);
      expect(JSON.stringify(answer.data)).not.toContain(token);
      expect(JSON.stringify(answer.data)).not.toContain(sha256Hex(token));
    }
  });
});
