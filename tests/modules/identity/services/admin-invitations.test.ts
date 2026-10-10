import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { invitationSender } from '@/lib/invitation-mail';
import { Forbidden, NotFound, ValidationError } from '@/lib/errors';
import type { Message } from '@/lib/types';
import {
  createAdminInvitation,
  listPendingAdminInvitations,
  pauseAdminRoleChanges,
  resumeAdminRoleChanges,
  revokeAdminInvitation,
} from '@/modules/identity';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { A, B, C, D, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { asManualFix } from '../../../support/db/privileges';
import type { InvitationStateRow } from './types';

// MB.70: an admin invites an address to become an admin. The token is
// `crypto.randomBytes` output that only the mail carries; the row holds its
// hash. Creating and revoking are a site admin's alone and paused with the
// rest of the admin changes for every admin but the primary one
// (claude-docs/auth/admin-users.md, "Inviting an admin"). The transport is the
// test double: the real sender builds the link and hands it to a mocked
// `send`, so what reaches the address is what the test reads.

const send = vi.hoisted(() => vi.fn<(message: Message) => Promise<void>>(async () => {}));
vi.mock('@/lib/mail', () => ({ send }));

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

const DOMAIN = '@admin-invitations.test';
const INVITED = `invited${DOMAIN}`;
const PRIMARY = '00000000-0000-0000-0000-0000000000b1';
const PRIMARY_EMAIL = `primary${DOMAIN}`;
const AS_PRIMARY = { id: PRIMARY, role: 'admin' as const };
const ORIGIN = 'http://localhost:8000';

const PAUSED_REFUSAL =
  "Admin changes are paused, so admin invitations can't be sent or withdrawn until they are resumed.";

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

/** The sender the page's mutation uses, bound to the browser's own request. */
const sender = () => invitationSender(new Request(`${ORIGIN}/api/graphql`, { method: 'POST' }));

/** The token in the one link mailed since the last reset, and the mail it came in. */
function mailedToken(): { token: string; message: Message } {
  expect(send).toHaveBeenCalledTimes(1);
  const [message] = send.mock.calls[0];
  const token = message.text.match(new RegExp(`${ORIGIN}/invite/([A-Za-z0-9_-]+)`))?.[1];
  if (!token) throw new Error(`no invitation link in: ${message.text}`);
  return { token, message };
}

async function invitations(): Promise<InvitationStateRow[]> {
  return sql<InvitationStateRow[]>`
    select id, workspace_id, role::text, email, token_hash, note, accepted_at, revoked_at,
      expires_at, created_by, updated_by
    from invitations order by created_at
  `;
}

beforeEach(async () => {
  send.mockClear();
  await sql`truncate invitations`;
  await sql`truncate admin_role_change_pauses`;
  await sql`truncate user_privilege_changes`;
  await sql`delete from users where email like ${`%${DOMAIN}`}`;
  await asManualFix(sql, async (tx) => {
    await tx`update users set role = 'admin', can_create_workspace = true where id = ${E.id}`;
    await tx`
      insert into users (id, name, email, email_verified, role, can_create_workspace, created_by, updated_by)
      values (${PRIMARY}, 'Fixture Primary', ${PRIMARY_EMAIL}, true, 'admin', true, ${PRIMARY}, ${PRIMARY})
    `;
  });
  vi.stubEnv('ADMIN_BOOTSTRAP_EMAIL', PRIMARY_EMAIL);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('createAdminInvitation', () => {
  it('writes a pending site-tier invitation stamped as the admin, storing only the hash of the token it mails', async () => {
    const row = await createAdminInvitation(
      asUser(E),
      `  ${INVITED.toUpperCase()} `,
      '  Helps with the herbals  ',
      sender(),
    );

    const { token, message } = mailedToken();
    expect(message.to).toBe(INVITED);
    // 32 random bytes in base64url: unguessable, and safe in a path.
    expect(token).toHaveLength(43);
    expect(message.html).toContain(`href="${ORIGIN}/invite/${token}"`);
    expect(await invitations()).toEqual([
      expect.objectContaining({
        id: row.id,
        workspace_id: null,
        role: null,
        email: INVITED,
        token_hash: sha256(token),
        note: 'Helps with the herbals',
        accepted_at: null,
        revoked_at: null,
        created_by: E.id,
        updated_by: E.id,
      }),
    ]);
    // Nothing in the answer carries the token, so only the inbox holds it.
    expect(JSON.stringify(row)).not.toContain(token);
  });

  it('mints a fresh token for every invitation', async () => {
    await createAdminInvitation(asUser(E), INVITED, undefined, sender());
    const first = mailedToken().token;
    send.mockClear();
    await createAdminInvitation(asUser(E), INVITED, undefined, sender());

    expect(mailedToken().token).not.toBe(first);
  });

  it('stores a blank reason as none', async () => {
    await createAdminInvitation(asUser(E), INVITED, '   ', sender());

    expect((await invitations())[0].note).toBeNull();
  });

  it.each([
    ['', 'Enter an email address'],
    ['not-an-address', "That doesn't look like an email address"],
    ['someone@pending.invalid', "That address can't receive mail"],
  ])(
    'refuses %j as a ValidationError on the email, writing and mailing nothing',
    async (email, message) => {
      const refusal = createAdminInvitation(asUser(E), email, undefined, sender());

      await expect(refusal).rejects.toThrow(ValidationError);
      await expect(refusal).rejects.toMatchObject({ issues: [{ path: ['email'], message }] });
      expect(await invitations()).toEqual([]);
      expect(send).not.toHaveBeenCalled();
    },
  );

  it('refuses the address of a live admin, who has nothing to accept', async () => {
    const refusal = createAdminInvitation(
      asUser(E),
      PRIMARY_EMAIL.toUpperCase(),
      undefined,
      sender(),
    );

    await expect(refusal).rejects.toMatchObject({
      issues: [{ path: ['email'], message: 'That address belongs to an admin already' }],
    });
    expect(await invitations()).toEqual([]);
  });

  // E creates one in the first test; each of these holds no admin role.
  it.each([
    ['A, an owner', A],
    ['B, a member', B],
    ['C, a viewer', C],
    ['D, a member elsewhere', D],
  ])('refuses %s as Forbidden by direct call, writing and mailing nothing', async (_who, user) => {
    expect(asUser(user).role).toBe('user');

    await expect(createAdminInvitation(asUser(user), INVITED, undefined, sender())).rejects.toThrow(
      Forbidden,
    );
    expect(await invitations()).toEqual([]);
    expect(send).not.toHaveBeenCalled();
  });
});

describe('revokeAdminInvitation', () => {
  async function invite(): Promise<string> {
    const row = await createAdminInvitation(asUser(E), INVITED, undefined, sender());
    send.mockClear();
    return row.id;
  }

  it('stamps a pending invitation revoked, as the admin, and lists it no longer', async () => {
    const id = await invite();
    expect((await listPendingAdminInvitations(asUser(E))).map((row) => row.id)).toEqual([id]);

    const revoked = await revokeAdminInvitation(asUser(AS_PRIMARY), id);

    expect(revoked.id).toBe(id);
    const [row] = await invitations();
    expect(row.revoked_at).toBeInstanceOf(Date);
    expect(row.updated_by).toBe(PRIMARY);
    expect(await listPendingAdminInvitations(asUser(E))).toEqual([]);
  });

  it('answers NotFound for one already revoked, and for an id that names none', async () => {
    const id = await invite();
    await revokeAdminInvitation(asUser(E), id);

    await expect(revokeAdminInvitation(asUser(E), id)).rejects.toThrow(NotFound);
    await expect(
      revokeAdminInvitation(asUser(E), '00000000-0000-0000-0000-00000000dead'),
    ).rejects.toThrow(NotFound);
  });

  // The direct id is a real pending invitation, which E then revokes.
  it.each([
    ['A, an owner', A],
    ['B, a member', B],
    ['C, a viewer', C],
    ['D, a member elsewhere', D],
  ])('refuses %s as Forbidden by direct id, leaving it pending', async (_who, user) => {
    const id = await invite();

    await expect(revokeAdminInvitation(asUser(user), id)).rejects.toThrow(Forbidden);
    expect((await invitations())[0].revoked_at).toBeNull();
    await expect(revokeAdminInvitation(asUser(E), id)).resolves.toMatchObject({ id });
  });
});

describe('listPendingAdminInvitations', () => {
  it('lists the pending site-tier invitations newest first, and nothing accepted, revoked, expired or a coven’s', async () => {
    await sql`
        insert into invitations (email, token_hash, note, created_at, created_by, updated_by, accepted_at, accepted_by, revoked_at, expires_at, workspace_id, role)
        values
          (${`older${DOMAIN}`}, 'h1', 'first', now() - interval '2 hours', ${E.id}, ${E.id}, null, null, null, now() + interval '1 day', null, null),
          (${`newer${DOMAIN}`}, 'h2', null, now() - interval '1 hour', ${E.id}, ${E.id}, null, null, null, now() + interval '1 day', null, null),
          (${`accepted${DOMAIN}`}, 'h3', null, now(), ${E.id}, ${E.id}, now(), ${E.id}, null, now() + interval '1 day', null, null),
          (${`revoked${DOMAIN}`}, 'h4', null, now(), ${E.id}, ${E.id}, null, null, now(), now() + interval '1 day', null, null),
          (${`expired${DOMAIN}`}, 'h5', null, now(), ${E.id}, ${E.id}, null, null, null, now() - interval '1 second', null, null),
          (${`coven${DOMAIN}`}, 'h6', null, now(), ${A.id}, ${A.id}, null, null, null, now() + interval '1 day', ${WORKSPACE_W_ID}, 'member')
      `;

    const listed = await listPendingAdminInvitations(asUser(E));

    expect(listed.map(({ email, note }) => ({ email, note }))).toEqual([
      { email: `newer${DOMAIN}`, note: null },
      { email: `older${DOMAIN}`, note: 'first' },
    ]);
  });

  it.each([
    ['A, an owner', A],
    ['B, a member', B],
    ['C, a viewer', C],
    ['D, a member elsewhere', D],
  ])('refuses %s as Forbidden', async (_who, user) => {
    await createAdminInvitation(asUser(E), INVITED, undefined, sender());
    expect(await listPendingAdminInvitations(asUser(E))).toHaveLength(1);

    await expect(listPendingAdminInvitations(asUser(user))).rejects.toThrow(Forbidden);
  });
});

describe('while admin changes are paused', () => {
  beforeEach(async () => {
    await pauseAdminRoleChanges(asUser(AS_PRIMARY));
  });

  it('refuses another admin’s invitation, naming nobody, and sends it once resumed', async () => {
    const refusal = createAdminInvitation(asUser(E), INVITED, undefined, sender());

    await expect(refusal).rejects.toThrow(Forbidden);
    await expect(refusal).rejects.toThrow(PAUSED_REFUSAL);
    expect(await invitations()).toEqual([]);
    expect(send).not.toHaveBeenCalled();

    await resumeAdminRoleChanges(asUser(AS_PRIMARY));
    await expect(
      createAdminInvitation(asUser(E), INVITED, undefined, sender()),
    ).resolves.toMatchObject({ email: INVITED });
  });

  it('refuses another admin’s revoke, and revokes once resumed', async () => {
    const { id } = await createAdminInvitation(asUser(AS_PRIMARY), INVITED, undefined, sender());

    await expect(revokeAdminInvitation(asUser(E), id)).rejects.toThrow(PAUSED_REFUSAL);
    expect((await invitations())[0].revoked_at).toBeNull();

    await resumeAdminRoleChanges(asUser(AS_PRIMARY));
    await expect(revokeAdminInvitation(asUser(E), id)).resolves.toMatchObject({ id });
  });

  it('lets the primary admin invite and revoke', async () => {
    const { id } = await createAdminInvitation(asUser(AS_PRIMARY), INVITED, undefined, sender());
    await revokeAdminInvitation(asUser(AS_PRIMARY), id);

    expect(await invitations()).toEqual([
      expect.objectContaining({ created_by: PRIMARY, updated_by: PRIMARY }),
    ]);
    expect((await invitations())[0].revoked_at).toBeInstanceOf(Date);
  });

  it('still lists the pending invitations to every admin', async () => {
    await createAdminInvitation(asUser(AS_PRIMARY), INVITED, undefined, sender());

    expect(await listPendingAdminInvitations(asUser(E))).toHaveLength(1);
  });
});
