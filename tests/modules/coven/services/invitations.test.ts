import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { Forbidden, ValidationError } from '@/lib/errors';
import { invitationSender } from '@/lib/invitation-mail';
import type { Message } from '@/lib/types';
import { createInvitation } from '@/modules/coven';
import { A, B, C, D, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { makeWorkspace, workspaceColumns } from '../../../support/fixtures';
import type { CovenInvitationStateRow } from './types';

// M7.3: an owner invites an address into a coven as a viewer or a member. The
// token is `crypto.randomBytes` output that only the mail carries; the row
// holds its hash. The transport is the test double: the real sender builds the
// link and hands it to a mocked `send`, so what reaches the address is what the
// test reads. The failing transport is the real `send` over a failing `fetch`
// (claude-docs/db/invitations.md, "Inviting into a coven").

const send = vi.hoisted(() => vi.fn<(message: Message) => Promise<void>>(async () => {}));
const mail = vi.hoisted(() => ({ real: false }));
vi.mock('@/lib/mail', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/mail')>();
  return { send: (message: Message) => (mail.real ? real.send(message) : send(message)) };
});

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

const DOMAIN = '@coven-invitations.test';
const INVITED = `invited${DOMAIN}`;
const ORIGIN = 'http://localhost:8000';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

/** The sender the page's mutation uses, bound to the browser's own request. */
const sender = () => invitationSender(new Request(`${ORIGIN}/api/graphql`, { method: 'POST' }));

/** The token in the link mailed to `to`, and the mail it came in. */
function mailedTo(to: string): { token: string; message: Message } {
  const message = send.mock.calls.map(([sent]) => sent).find((sent) => sent.to === to);
  const token = message?.text.match(/\/invite\/([A-Za-z0-9_-]+)/)?.[1];
  if (!message || !token) throw new Error(`no invitation link was mailed to ${to}`);
  return { token, message };
}

const invitations = () => sql<CovenInvitationStateRow[]>`
  select id, workspace_id, role::text, email, token_hash, accepted_at, revoked_at, expires_at,
    created_by, updated_by
  from invitations order by created_at
`;

/** A coven with these members, through the raw client (MB.101). */
async function insertCoven(
  name: string,
  members: [string, 'owner' | 'member' | 'viewer'][],
): Promise<string> {
  const [row] = await sql`
    insert into workspaces ${sql({ ...workspaceColumns(makeWorkspace({ name })), created_by: A.id, updated_by: A.id })}
    returning id`;
  for (const [userId, role] of members) {
    await sql`
      insert into workspace_members (workspace_id, user_id, role, created_by, updated_by)
      values (${row.id}, ${userId}, ${role}, ${A.id}, ${A.id})`;
  }
  return row.id as string;
}

beforeEach(async () => {
  send.mockClear();
  mail.real = false;
  await sql`truncate invitations`;
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('createInvitation', () => {
  it("writes a pending invitation into the owner's coven with the chosen role, stamped as the owner, storing only the hash of the token it mails", async () => {
    const row = await createInvitation(
      asUser(A),
      WORKSPACE_W_ID,
      { email: INVITED, role: 'member' },
      sender(),
    );

    const { token, message } = mailedTo(INVITED);
    const [stored, ...rest] = await invitations();
    expect(rest).toEqual([]);
    expect(stored).toMatchObject({
      id: row.id,
      workspace_id: WORKSPACE_W_ID,
      role: 'member',
      email: INVITED,
      accepted_at: null,
      revoked_at: null,
      created_by: A.id,
      updated_by: A.id,
    });
    expect(stored.expires_at.getTime()).toBeGreaterThan(Date.now());
    expect(stored.token_hash).toBe(sha256(token));
    expect(stored.token_hash).not.toBe(token);
    expect(JSON.stringify(row)).not.toContain(token);
    expect(message.to).toBe(INVITED);
    expect(message.text).toContain(`${ORIGIN}/invite/${token}`);
    expect(send).toHaveBeenCalledOnce();
  });

  it('honours a viewer role as it honours a member one', async () => {
    await createInvitation(asUser(A), WORKSPACE_W_ID, { email: INVITED, role: 'viewer' }, sender());

    expect((await invitations())[0]).toMatchObject({ role: 'viewer' });
  });

  it('normalises the address as the admin tier does, and mails the normalised one', async () => {
    await createInvitation(
      asUser(A),
      WORKSPACE_W_ID,
      { email: `  Invited${DOMAIN.toUpperCase()} `, role: 'viewer' },
      sender(),
    );

    expect((await invitations())[0].email).toBe(INVITED);
    expect(send.mock.calls.map(([message]) => message.to)).toEqual([INVITED]);
  });

  it("invites into a coven that is its owner's first, with no other coven involved", async () => {
    const covenId = await insertCoven('Fixture First Coven', [[D.id, 'owner']]);

    await createInvitation(asUser(D), covenId, { email: INVITED, role: 'member' }, sender());

    expect((await invitations())[0]).toMatchObject({ workspace_id: covenId, created_by: D.id });
  });

  // The precondition: A could invite, so the refusal is the role check's.
  it('refuses owner as the role, in the service, writing and mailing nothing', async () => {
    await expect(
      createInvitation(
        asUser(A),
        WORKSPACE_W_ID,
        // The schema's enum has no owner; the service must refuse it unaided.
        { email: INVITED, role: 'owner' },
        sender(),
      ),
    ).rejects.toMatchObject({ issues: [{ path: ['role'] }] });

    expect(await invitations()).toEqual([]);
    expect(send).not.toHaveBeenCalled();
  });

  it('refuses a malformed address as a ValidationError on the email, writing and mailing nothing', async () => {
    for (const email of ['', 'not-an-address', 'someone@pending.invalid']) {
      await expect(
        createInvitation(asUser(A), WORKSPACE_W_ID, { email, role: 'viewer' }, sender()),
      ).rejects.toThrow(ValidationError);
    }

    expect(await invitations()).toEqual([]);
    expect(send).not.toHaveBeenCalled();
  });

  it('refuses a member and a viewer, who do belong to the coven, writing and mailing nothing', async () => {
    const covenId = await insertCoven('Fixture Invite Refusal Coven', [
      [A.id, 'owner'],
      [B.id, 'member'],
      [C.id, 'viewer'],
    ]);
    // Why the refusal is the permission's: each caller holds a live seat.
    const seats = await sql`
      select user_id, role from workspace_members where workspace_id = ${covenId}`;
    expect(seats.map((seat) => seat.role).sort()).toEqual(['member', 'owner', 'viewer']);

    for (const caller of [B, C]) {
      await expect(
        createInvitation(asUser(caller), covenId, { email: INVITED, role: 'viewer' }, sender()),
      ).rejects.toThrow(Forbidden);
    }

    expect(await invitations()).toEqual([]);
    expect(send).not.toHaveBeenCalled();
  });

  it("refuses an owner of another coven, by this coven's id", async () => {
    // Why the refusal is the coven's: D owns a coven of their own.
    const owned = await insertCoven('Fixture Other Owner Coven', [[D.id, 'owner']]);
    expect(owned).not.toBe(WORKSPACE_X_ID);

    await expect(
      createInvitation(asUser(D), WORKSPACE_W_ID, { email: INVITED, role: 'viewer' }, sender()),
    ).rejects.toThrow(Forbidden);

    expect(await invitations()).toEqual([]);
    expect(send).not.toHaveBeenCalled();
  });

  it('accepts a second pending invitation to an address already invited, each with a link of its own', async () => {
    await createInvitation(asUser(A), WORKSPACE_W_ID, { email: INVITED, role: 'viewer' }, sender());
    await createInvitation(asUser(A), WORKSPACE_W_ID, { email: INVITED, role: 'member' }, sender());

    const rows = await invitations();
    expect(rows.map((row) => row.role)).toEqual(['viewer', 'member']);
    expect(new Set(rows.map((row) => row.token_hash)).size).toBe(2);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('refuses an address that belongs to a live member of the coven, in any case, writing and mailing nothing', async () => {
    // Why the refusal is the check's: B is a live member holding this address.
    const [member] = await sql`
      select m.role from workspace_members m join users u on u.id = m.user_id
      where m.workspace_id = ${WORKSPACE_W_ID} and u.email = ${B.email} and m.deleted_at is null`;
    expect(member.role).toBe('member');

    for (const email of [B.email, B.email.toUpperCase()]) {
      await expect(
        createInvitation(asUser(A), WORKSPACE_W_ID, { email, role: 'viewer' }, sender()),
      ).rejects.toMatchObject({ issues: [{ path: ['email'] }] });
    }

    expect(await invitations()).toEqual([]);
    expect(send).not.toHaveBeenCalled();
  });

  it("invites an address whose membership was removed, which is no member's", async () => {
    const covenId = await insertCoven('Fixture Removed Member Coven', [
      [A.id, 'owner'],
      [B.id, 'member'],
    ]);
    await sql`
      update workspace_members set deleted_at = now()
      where workspace_id = ${covenId} and user_id = ${B.id}`;

    await createInvitation(asUser(A), covenId, { email: B.email, role: 'viewer' }, sender());

    expect((await invitations())[0]).toMatchObject({ workspace_id: covenId, email: B.email });
  });

  it('leaves the invitation pending, and answers it, when the transport fails', async () => {
    mail.real = true;
    vi.stubEnv('VERCEL_ENV', '');
    vi.stubEnv('MAIL_TRANSPORT', 'mailpit');
    vi.stubEnv('MAILPIT_URL', 'http://mailpit.test:8025');
    const fetched = vi.fn(async () => new Response('down', { status: 500 }));
    vi.stubGlobal('fetch', fetched);
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});

    const row = await createInvitation(
      asUser(A),
      WORKSPACE_W_ID,
      { email: INVITED, role: 'member' },
      sender(),
    );

    // Why the failure is the transport's: it was asked, and it refused.
    expect(fetched).toHaveBeenCalledOnce();
    expect(logged).toHaveBeenCalled();
    expect(row.id).toBe((await invitations())[0].id);
    expect((await invitations())[0]).toMatchObject({ accepted_at: null, revoked_at: null });
  });
});
