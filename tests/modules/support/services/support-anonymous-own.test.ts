import { beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { Forbidden, NotFound } from '@/lib/errors';
import type { Session } from '@/lib/session';
import {
  countMySupportRequests,
  getMySupportRequest,
  listMySupportRequests,
  sendSignedOutSupportRequest,
} from '@/modules/support';
import type { AnonymousMinter, SupportNotifier } from '@/modules/support';
import { assertMembership } from '@/modules/coven';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import { insertAnonymousUser } from '../../../support/db/insert-anonymous-user';
import { A } from '../../../support/as-user';
import { makeWorkspace, workspaceColumns } from '../../../support/fixtures';

// What `/account/support` reads for the account a signed-out send minted: its own requests and nobody else's, by list and by id
// (claude-docs/design-decisions/m15.48-anonymous-sender.md). The page guard letting the session reach the page is
// tests/lib/request-session.test.ts's.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

const { startJob } = vi.hoisted(() => ({
  startJob: vi.fn(async (..._args: unknown[]) => 'run-id'),
}));
vi.mock('@/lib/jobs', () => ({ startJob }));

beforeEach(async () => {
  await sql`truncate support_replies, support_timeouts, support_requests cascade`;
  await sql`delete from support_send_counts`;
});

const mail: SupportNotifier = { origin: async () => 'http://localhost:3000' };
const PAGE = { limit: 101, inverted: false };

/** One signed-out send from `email`, as a fresh visitor; returns the minted account's session and the request's id. */
async function sendAs(email: string, subject: string) {
  let userId = '';
  const minter: AnonymousMinter = {
    mint: async () => (userId = await insertAnonymousUser(sql)),
  };
  await sendSignedOutSupportRequest(
    { about: 'account', email, subject, message: 'The code never arrives.' },
    { clientIp: '203.0.113.7', notifier: mail, anonymous: minter },
  );
  const [row] = await sql`select id from support_requests where created_by = ${userId}`;
  const session: Session = { userId, role: 'user', anonymous: true };
  return { session, requestId: row!.id as string };
}

describe('an anonymous account’s own requests', () => {
  it('lists its own request and not another anonymous sender’s', async () => {
    const first = await sendAs('first@example.test', 'The first Testwort request');
    const second = await sendAs('second@example.test', 'The second Testwort request');
    // Precondition: two requests exist, one under each account, so a list of one is the filter's doing.
    expect(await sql`select created_by from support_requests`).toHaveLength(2);
    expect(first.session.userId).not.toBe(second.session.userId);

    const listed = await listMySupportRequests(first.session, PAGE);

    expect(listed.map(({ node }) => node.id)).toEqual([first.requestId]);
    expect(await countMySupportRequests(first.session, undefined)).toMatchObject({ totalCount: 1 });
  });

  it('reads its own request by id, and is refused another anonymous sender’s by its id', async () => {
    const first = await sendAs('first@example.test', 'The first Testwort request');
    const second = await sendAs('second@example.test', 'The second Testwort request');
    // Precondition: the id is real and readable, by the account that sent it.
    await expect(getMySupportRequest(second.session, second.requestId)).resolves.toMatchObject({
      id: second.requestId,
    });

    await expect(getMySupportRequest(first.session, first.requestId)).resolves.toMatchObject({
      id: first.requestId,
    });
    expect(await failureOf(getMySupportRequest(first.session, second.requestId))).toBeInstanceOf(
      NotFound,
    );
  });

  it('holds no seat anywhere: the demo coven refuses it', async () => {
    // The test database holds no demo coven, so the test writes one, before the send as on a live site.
    const live = async () => sql`select id from workspaces where demo and deleted_at is null`;
    if ((await live()).length === 0) {
      await sql`
        insert into workspaces ${sql({ ...workspaceColumns(makeWorkspace({ name: 'Fixture Demo Coven' })), demo: true, created_by: A.id, updated_by: A.id })}`;
    }
    const { session } = await sendAs('first@example.test', 'The first Testwort request');
    const [demo] = await live();
    // Precondition: the demo coven exists, so a refusal is the missing seat and not a missing coven.
    expect(demo).toBeDefined();
    expect(
      await sql`select 1 from workspace_members where user_id = ${session.userId}`,
    ).toHaveLength(0);

    expect(
      await failureOf(assertMembership(session, demo!.id as string, { workspace: ['read'] })),
    ).toBeInstanceOf(Forbidden);
  });
});
