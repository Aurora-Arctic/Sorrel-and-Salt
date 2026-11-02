import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { readOpenedRequest } from '@/app/(shell)/account/(tabs)/support/reads';
import {
  addSupportInternalNote,
  replyToSupportRequest,
  sendSenderMessage,
  sendSupportRequest,
} from '@/modules/support';
import type { SupportNotifier } from '@/modules/support';
import { C, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';

// What the sender's page receives for one request: the thread in order with the sender's own messages marked, and no internal
// note anywhere in it.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate support_replies, support_timeouts, support_requests cascade`;
});

const mail: SupportNotifier = {
  replyWaiting: async () => undefined,
  signedOutReceived: async () => undefined,
  signedOutReply: async () => undefined,
};

describe('the thread the sender’s page receives', () => {
  it('is in order, marks the sender’s own messages and carries no internal note', async () => {
    const request = await sendSupportRequest(asUser(C), {
      about: 'bug',
      subject: 'The jar will not open',
      message: 'It sticks.',
    });
    await replyToSupportRequest(asUser(E), request.id, 'Which jar?', mail, {
      waitingOnSender: true,
    });
    await addSupportInternalNote(asUser(E), request.id, 'Probably the red jar, ask Testwort.');
    await sendSenderMessage(asUser(C), request.id, 'The red one.');

    const [{ n }] = await sql`
      select count(*)::int as n from support_replies where request_id = ${request.id} and visibility = 'internal'`;
    const opened = await readOpenedRequest(asUser(C), request.id);

    expect(n).toBe(1);
    expect(opened?.replies.map(({ body, fromSender }) => [body, fromSender])).toEqual([
      ['Which jar?', false],
      ['The red one.', true],
    ]);
    expect(JSON.stringify(opened)).not.toContain('Testwort');
  });

  it('is not readable by another sender', async () => {
    const request = await sendSupportRequest(asUser(C), {
      about: 'bug',
      subject: 'The jar will not open',
      message: 'It sticks.',
    });
    expect(await readOpenedRequest(asUser(E), request.id)).toBeUndefined();
  });
});
