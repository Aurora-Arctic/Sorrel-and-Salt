import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { invitationSender } from '@/lib/invitation-mail';
import { Forbidden, NotFound, ValidationError } from '@/lib/errors';
import { decodeCursor, resolvePage } from '@/lib/pagination';
import { ADMIN_CHANGES_PAUSED_REFUSAL as PAUSED_REFUSAL } from '@/lib/primary-admin';
import type { Message, PageRequest } from '@/lib/types';
import {
  countPendingAdminInvitations,
  createAdminInvitation,
  listPendingAdminInvitations,
  pauseAdminRoleChanges,
  resumeAdminRoleChanges,
  revokeAdminInvitation,
} from '@/modules/identity';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { A, B, C, E, asUser } from '../../../support/as-user';
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

/** More than the list's page, so every row is read in one. */
const PAGE: PageRequest = { limit: 101, inverted: false };

/** The pending invitations an admin is listed, in the list's order, on one page. */
const pending = async (filter: Parameters<typeof listPendingAdminInvitations>[1] = {}) =>
  (await listPendingAdminInvitations(asUser(E), filter, PAGE)).map(({ node }) => node);

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

  // The address rules are email.ts's (tests/modules/identity/services/email.test.ts);
  // one row proves this service parses its input before writing or mailing.
  it('refuses a malformed address as a ValidationError on the email, writing and mailing nothing', async () => {
    const refusal = createAdminInvitation(asUser(E), 'not-an-address', undefined, sender());

    await expect(refusal).rejects.toThrow(ValidationError);
    await expect(refusal).rejects.toMatchObject({ issues: [{ path: ['email'] }] });
    expect(await invitations()).toEqual([]);
    expect(send).not.toHaveBeenCalled();
  });

  it('refuses the address of a live admin, who has nothing to accept', async () => {
    const refusal = createAdminInvitation(
      asUser(E),
      PRIMARY_EMAIL.toUpperCase(),
      undefined,
      sender(),
    );

    await expect(refusal).rejects.toThrow(ValidationError);
    await expect(refusal).rejects.toMatchObject({ issues: [{ path: ['email'] }] });
    expect(await invitations()).toEqual([]);
  });

  // E creates one in the first test. The check reads the site role alone, so
  // one non-admin — A, a coven owner — stands for every one.
  it('refuses a non-admin as Forbidden by direct call, writing and mailing nothing', async () => {
    expect(asUser(A).role).toBe('user');

    await expect(createAdminInvitation(asUser(A), INVITED, undefined, sender())).rejects.toThrow(
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
    expect((await pending()).map((row) => row.id)).toEqual([id]);

    const revoked = await revokeAdminInvitation(asUser(AS_PRIMARY), id);

    expect(revoked.id).toBe(id);
    const [row] = await invitations();
    expect(row.revoked_at).toBeInstanceOf(Date);
    expect(row.updated_by).toBe(PRIMARY);
    expect(await pending()).toEqual([]);
  });

  it('answers NotFound for one already revoked, and for an id that names none', async () => {
    const id = await invite();
    await revokeAdminInvitation(asUser(E), id);

    await expect(revokeAdminInvitation(asUser(E), id)).rejects.toThrow(NotFound);
    await expect(
      revokeAdminInvitation(asUser(E), '00000000-0000-0000-0000-00000000dead'),
    ).rejects.toThrow(NotFound);
  });

  // The direct id is a real pending invitation, which E then revokes; B holds
  // no site role, which is all the check reads.
  it('refuses a non-admin as Forbidden by direct id, leaving it pending', async () => {
    const id = await invite();
    expect(asUser(B).role).toBe('user');

    await expect(revokeAdminInvitation(asUser(B), id)).rejects.toThrow(Forbidden);
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

    const listed = await pending();

    expect(listed.map(({ email, note }) => ({ email, note }))).toEqual([
      { email: `newer${DOMAIN}`, note: null },
      { email: `older${DOMAIN}`, note: 'first' },
    ]);
  });

  // MB.115: the list's two filters, each in the finder's SQL.
  const listedEmails = async (filter: Parameters<typeof listPendingAdminInvitations>[1]) =>
    (await pending(filter)).map(({ email }) => email).sort();

  it('narrows by a fragment of the address, in any case, trimmed', async () => {
    await sql`
        insert into invitations (email, token_hash, created_by, updated_by, expires_at)
        values
          (${`fern.moss${DOMAIN}`}, 'h1', ${E.id}, ${E.id}, now() + interval '1 day'),
          (${`bracken${DOMAIN}`}, 'h2', ${E.id}, ${E.id}, now() + interval '1 day')
      `;
    // Why the second could have been listed: it is pending, as the first is.
    expect(await listedEmails({})).toEqual([`bracken${DOMAIN}`, `fern.moss${DOMAIN}`]);

    expect(await listedEmails({ email: '  ERN.MO  ' })).toEqual([`fern.moss${DOMAIN}`]);
  });

  it('narrows to the pending invitations lapsing within 24 hours', async () => {
    await sql`
        insert into invitations (email, token_hash, created_by, updated_by, accepted_at, accepted_by, revoked_at, expires_at)
        values
          (${`soon${DOMAIN}`}, 'h1', ${E.id}, ${E.id}, null, null, null, now() + interval '23 hours'),
          (${`later${DOMAIN}`}, 'h2', ${E.id}, ${E.id}, null, null, null, now() + interval '25 hours'),
          (${`expired${DOMAIN}`}, 'h3', ${E.id}, ${E.id}, null, null, null, now() - interval '1 second'),
          (${`accepted${DOMAIN}`}, 'h4', ${E.id}, ${E.id}, now(), ${E.id}, null, now() + interval '23 hours'),
          (${`revoked${DOMAIN}`}, 'h5', ${E.id}, ${E.id}, null, null, now(), now() + interval '23 hours')
      `;
    // Why the later one could have been listed: it is pending, as the soon one is.
    expect(await listedEmails({})).toEqual([`later${DOMAIN}`, `soon${DOMAIN}`]);

    expect(await listedEmails({ expiringSoon: true })).toEqual([`soon${DOMAIN}`]);
  });

  // MB.115: a page at a time, as every admin list reads (CLAUDE.md rule 8).
  const id = (n: number) => `00000000-0000-0000-0000-0000000001${String(n).padStart(2, '0')}`;

  // Five pending invitations an hour apart but for two sharing an instant,
  // as one statement's `now()` is shared, which only the id can order. Named
  // fern or bracken by turn, so a filter picks rows from every page.
  async function fivePending() {
    await sql`
        insert into invitations (id, email, token_hash, created_at, created_by, updated_by, expires_at)
        values
          (${id(1)}, ${`fern.one${DOMAIN}`}, 'h1', now() - interval '1 hour', ${E.id}, ${E.id}, now() + interval '1 day'),
          (${id(3)}, ${`bracken.one${DOMAIN}`}, 'h3', now() - interval '2 hours', ${E.id}, ${E.id}, now() + interval '1 day'),
          (${id(2)}, ${`fern.two${DOMAIN}`}, 'h2', now() - interval '2 hours', ${E.id}, ${E.id}, now() + interval '1 day'),
          (${id(4)}, ${`bracken.two${DOMAIN}`}, 'h4', now() - interval '3 hours', ${E.id}, ${E.id}, now() + interval '1 day'),
          (${id(5)}, ${`fern.three${DOMAIN}`}, 'h5', now() - interval '4 hours', ${E.id}, ${E.id}, now() + interval '1 day'),
          (${id(6)}, ${`fern.revoked${DOMAIN}`}, 'h6', now() - interval '1 hour', ${E.id}, ${E.id}, now() + interval '1 day')
      `;
    await sql`update invitations set revoked_at = now() where id = ${id(6)}`;
  }

  /** The page `args` asks for under `filter`, as the page reads it. */
  const page = (
    args: Parameters<typeof resolvePage>[0],
    filter: Parameters<typeof listPendingAdminInvitations>[1] = {},
  ) => resolvePage(args, (request) => listPendingAdminInvitations(asUser(E), filter, request));
  const ids = (read: Awaited<ReturnType<typeof page>>) => read.edges.map(({ node }) => node.id);

  it('reads a page newest first, an instant’s rows by id, and the next cursor the rest', async () => {
    await fivePending();

    const first = await page({ first: 2 });
    expect(ids(first)).toEqual([id(1), id(2)]);
    expect(first.pageInfo.hasNextPage).toBe(true);

    const second = await page({ first: 3, after: first.pageInfo.endCursor ?? undefined });
    expect(ids(second)).toEqual([id(3), id(4), id(5)]);
    expect(second.pageInfo.hasNextPage).toBe(false);

    const back = await page({ last: 2, before: second.pageInfo.startCursor ?? undefined });
    expect(ids(back)).toEqual([id(1), id(2)]);
  });

  it('narrows every page by the filter, not only the first', async () => {
    await fivePending();

    const first = await page({ first: 2 }, { email: 'fern' });
    expect(ids(first)).toEqual([id(1), id(2)]);

    const second = await page(
      { first: 2, after: first.pageInfo.endCursor ?? undefined },
      {
        email: 'fern',
      },
    );
    expect(ids(second)).toEqual([id(5)]);
    expect(second.pageInfo.hasNextPage).toBe(false);
  });

  it('refuses a non-admin as Forbidden', async () => {
    await createAdminInvitation(asUser(E), INVITED, undefined, sender());
    expect(await pending()).toHaveLength(1);
    expect(asUser(C).role).toBe('user');

    await expect(listPendingAdminInvitations(asUser(C), {}, PAGE)).rejects.toThrow(Forbidden);
  });
});

describe('countPendingAdminInvitations', () => {
  it('counts the pending invitations under the filter, and those before a page', async () => {
    await sql`
        insert into invitations (email, token_hash, created_at, created_by, updated_by, expires_at, revoked_at)
        values
          (${`fern.one${DOMAIN}`}, 'h1', now() - interval '1 hour', ${E.id}, ${E.id}, now() + interval '1 day', null),
          (${`bracken${DOMAIN}`}, 'h2', now() - interval '2 hours', ${E.id}, ${E.id}, now() + interval '1 day', null),
          (${`fern.two${DOMAIN}`}, 'h3', now() - interval '3 hours', ${E.id}, ${E.id}, now() + interval '1 day', null),
          (${`fern.three${DOMAIN}`}, 'h4', now() - interval '4 hours', ${E.id}, ${E.id}, now() + interval '1 day', null),
          (${`fern.revoked${DOMAIN}`}, 'h5', now() - interval '5 hours', ${E.id}, ${E.id}, now() + interval '1 day', now())
      `;
    const fern = { email: 'fern' };
    const first = await resolvePage({ first: 2 }, (request) =>
      listPendingAdminInvitations(asUser(E), fern, request),
    );
    const second = await resolvePage(
      { first: 2, after: first.pageInfo.endCursor ?? undefined },
      (request) => listPendingAdminInvitations(asUser(E), fern, request),
    );

    expect(
      await countPendingAdminInvitations(
        asUser(E),
        fern,
        decodeCursor(second.pageInfo.startCursor ?? ''),
      ),
    ).toEqual({ totalCount: 3, countBefore: 2 });
    expect(await countPendingAdminInvitations(asUser(E), {}, undefined)).toEqual({
      totalCount: 4,
      countBefore: null,
    });
  });

  // Why the refusal is the role's: the same count as an admin finds a row.
  it('refuses a non-admin as Forbidden', async () => {
    await createAdminInvitation(asUser(E), INVITED, undefined, sender());
    expect((await countPendingAdminInvitations(asUser(E), {}, undefined)).totalCount).toBe(1);
    expect(asUser(C).role).toBe('user');

    await expect(countPendingAdminInvitations(asUser(C), {}, undefined)).rejects.toThrow(Forbidden);
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

    expect(await pending()).toHaveLength(1);
  });
});
