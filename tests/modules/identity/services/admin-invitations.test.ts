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
import { A, B, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { asManualFix } from '../../../support/db/privileges';
import type { InvitationStateRow } from './types';

// An admin invites an address to become an admin. The token is
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
    select id, workspace_id, role::text, site_role::text, email, token_hash, note, accepted_at, revoked_at,
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
      'admin',
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
        site_role: 'admin',
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
    await createAdminInvitation(asUser(E), INVITED, 'admin', undefined, sender());
    const first = mailedToken().token;
    send.mockClear();
    await createAdminInvitation(asUser(E), INVITED, 'admin', undefined, sender());

    expect(mailedToken().token).not.toBe(first);
  });

  describe('a repeat invitation', () => {
    const pendingFor = async (email: string) =>
      (await invitations()).filter(
        (row) => row.email === email && row.revoked_at === null && row.accepted_at === null,
      );

    it('replaces the pending site-tier invitation to the address, in any case, with the newest role, stamped revoked by the admin', async () => {
      const first = await createAdminInvitation(asUser(E), INVITED, 'curator', undefined, sender());
      expect(await pendingFor(INVITED)).toHaveLength(1);

      const second = await createAdminInvitation(
        asUser(E),
        INVITED.toUpperCase(),
        'admin',
        undefined,
        sender(),
      );

      const pending = await pendingFor(INVITED);
      expect(pending.map((row) => [row.id, row.site_role])).toEqual([[second.id, 'admin']]);
      const replaced = (await invitations()).find((row) => row.id === first.id);
      expect(replaced?.revoked_at).not.toBeNull();
      expect(replaced?.updated_by).toBe(E.id);
    });

    it("leaves a coven's invitation to the address alone, and is left alone by it", async () => {
      await sql`
        insert into invitations (email, token_hash, workspace_id, role, created_by, updated_by, expires_at)
        values (${INVITED}, 'coven-hash', ${WORKSPACE_W_ID}, 'member', ${A.id}, ${A.id}, now() + interval '7 days')`;

      await createAdminInvitation(asUser(E), INVITED, 'admin', undefined, sender());

      expect(await pendingFor(INVITED)).toHaveLength(2);
    });

    it('leaves an accepted and a lapsed invitation to the address as they were', async () => {
      await sql`
        insert into invitations (email, token_hash, site_role, created_by, updated_by, expires_at, accepted_at, accepted_by)
        values (${INVITED}, 'accepted-hash', 'admin', ${E.id}, ${E.id}, now() + interval '7 days', now(), ${B.id}),
               (${INVITED}, 'lapsed-hash', 'admin', ${E.id}, ${E.id}, now() - interval '1 second', null, null)`;
      const before = await invitations();

      await createAdminInvitation(asUser(E), INVITED, 'admin', undefined, sender());

      expect((await invitations()).slice(0, 2)).toEqual(before);
    });
  });

  it('stores a blank reason as none', async () => {
    await createAdminInvitation(asUser(E), INVITED, 'admin', '   ', sender());

    expect((await invitations())[0].note).toBeNull();
  });

  // The address rules are email.ts's (tests/modules/identity/services/email.test.ts);
  // one row proves this service parses its input before writing or mailing.
  it('refuses a malformed address as a ValidationError on the email, writing and mailing nothing', async () => {
    const refusal = createAdminInvitation(
      asUser(E),
      'not-an-address',
      'admin',
      undefined,
      sender(),
    );

    await expect(refusal).rejects.toThrow(ValidationError);
    await expect(refusal).rejects.toMatchObject({ issues: [{ path: ['email'] }] });
    expect(await invitations()).toEqual([]);
    expect(send).not.toHaveBeenCalled();
  });

  it('refuses the address of a live admin, who has nothing to accept', async () => {
    const refusal = createAdminInvitation(
      asUser(E),
      PRIMARY_EMAIL.toUpperCase(),
      'admin',
      undefined,
      sender(),
    );

    await expect(refusal).rejects.toThrow(ValidationError);
    await expect(refusal).rejects.toMatchObject({ issues: [{ path: ['email'] }] });
    expect(await invitations()).toEqual([]);
  });

  // The site role is the admin's pick, and the row records it.
  it('invites to the curator role, recording it on the row', async () => {
    await createAdminInvitation(asUser(E), INVITED, 'curator', undefined, sender());

    expect(mailedToken().message.to).toBe(INVITED);
    expect(await invitations()).toEqual([
      expect.objectContaining({ workspace_id: null, role: null, site_role: 'curator' }),
    ]);
  });

  // Accepting never lowers a role, so an invitation that could only stamp the
  // row is refused up front. A curator's address may still be invited to admin.
  describe('against the role the address holds', () => {
    const CURATOR = '00000000-0000-0000-0000-0000000000c1';
    const CURATOR_EMAIL = `curator${DOMAIN}`;

    beforeEach(async () => {
      await asManualFix(
        sql,
        (tx) => tx`
        insert into users (id, name, email, email_verified, role, can_create_workspace, created_by, updated_by)
        values (${CURATOR}, 'Fixture Curator', ${CURATOR_EMAIL}, true, 'curator', true, ${CURATOR}, ${CURATOR})
      `,
      );
    });

    it.each([
      ['a curator', CURATOR_EMAIL, 'curator'],
      ['an admin', PRIMARY_EMAIL, 'curator'],
    ] as const)(
      'refuses %s’s address invited to %s, writing and mailing nothing',
      async (_holder, email, siteRole) => {
        const refusal = createAdminInvitation(asUser(E), email, siteRole, undefined, sender());

        await expect(refusal).rejects.toThrow(ValidationError);
        await expect(refusal).rejects.toMatchObject({ issues: [{ path: ['email'] }] });
        expect(await invitations()).toEqual([]);
        expect(send).not.toHaveBeenCalled();
      },
    );

    it('invites a curator’s address to admin', async () => {
      await createAdminInvitation(asUser(E), CURATOR_EMAIL, 'admin', undefined, sender());

      expect(await invitations()).toEqual([
        expect.objectContaining({ email: CURATOR_EMAIL, site_role: 'admin' }),
      ]);
    });
  });
});

describe('revokeAdminInvitation', () => {
  async function invite(): Promise<string> {
    const row = await createAdminInvitation(asUser(E), INVITED, 'admin', undefined, sender());
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
});

describe('listPendingAdminInvitations', () => {
  it('lists the pending site-tier invitations newest first, and nothing accepted, revoked, expired or a coven’s', async () => {
    await sql`
        insert into invitations (email, token_hash, note, created_at, created_by, updated_by, accepted_at, accepted_by, revoked_at, expires_at, workspace_id, role, site_role)
        values
          (${`older${DOMAIN}`}, 'h1', 'first', now() - interval '2 hours', ${E.id}, ${E.id}, null, null, null, now() + interval '1 day', null, null, 'admin'),
          (${`newer${DOMAIN}`}, 'h2', null, now() - interval '1 hour', ${E.id}, ${E.id}, null, null, null, now() + interval '1 day', null, null, 'admin'),
          (${`accepted${DOMAIN}`}, 'h3', null, now(), ${E.id}, ${E.id}, now(), ${E.id}, null, now() + interval '1 day', null, null, 'admin'),
          (${`revoked${DOMAIN}`}, 'h4', null, now(), ${E.id}, ${E.id}, null, null, now(), now() + interval '1 day', null, null, 'admin'),
          (${`expired${DOMAIN}`}, 'h5', null, now(), ${E.id}, ${E.id}, null, null, null, now() - interval '1 second', null, null, 'admin'),
          (${`coven${DOMAIN}`}, 'h6', null, now(), ${A.id}, ${A.id}, null, null, null, now() + interval '1 day', ${WORKSPACE_W_ID}, 'member', null)
      `;

    const listed = await pending();

    expect(listed.map(({ email, note }) => ({ email, note }))).toEqual([
      { email: `newer${DOMAIN}`, note: null },
      { email: `older${DOMAIN}`, note: 'first' },
    ]);
  });

  // The list's two filters, each in the finder's SQL.
  const listedEmails = async (filter: Parameters<typeof listPendingAdminInvitations>[1]) =>
    (await pending(filter)).map(({ email }) => email).sort();

  it('narrows by a fragment of the address, in any case, trimmed', async () => {
    await sql`
        insert into invitations (email, token_hash, created_by, updated_by, expires_at, site_role)
        values
          (${`fern.moss${DOMAIN}`}, 'h1', ${E.id}, ${E.id}, now() + interval '1 day', 'admin'),
          (${`bracken${DOMAIN}`}, 'h2', ${E.id}, ${E.id}, now() + interval '1 day', 'admin')
      `;
    // Why the second could have been listed: it is pending, as the first is.
    expect(await listedEmails({})).toEqual([`bracken${DOMAIN}`, `fern.moss${DOMAIN}`]);

    expect(await listedEmails({ email: '  ERN.MO  ' })).toEqual([`fern.moss${DOMAIN}`]);
  });

  it('narrows to the pending invitations lapsing within 24 hours', async () => {
    await sql`
        insert into invitations (email, token_hash, created_by, updated_by, accepted_at, accepted_by, revoked_at, expires_at, site_role)
        values
          (${`soon${DOMAIN}`}, 'h1', ${E.id}, ${E.id}, null, null, null, now() + interval '23 hours', 'admin'),
          (${`later${DOMAIN}`}, 'h2', ${E.id}, ${E.id}, null, null, null, now() + interval '25 hours', 'admin'),
          (${`expired${DOMAIN}`}, 'h3', ${E.id}, ${E.id}, null, null, null, now() - interval '1 second', 'admin'),
          (${`accepted${DOMAIN}`}, 'h4', ${E.id}, ${E.id}, now(), ${E.id}, null, now() + interval '23 hours', 'admin'),
          (${`revoked${DOMAIN}`}, 'h5', ${E.id}, ${E.id}, null, null, now(), now() + interval '23 hours', 'admin')
      `;
    // Why the later one could have been listed: it is pending, as the soon one is.
    expect(await listedEmails({})).toEqual([`later${DOMAIN}`, `soon${DOMAIN}`]);

    expect(await listedEmails({ expiringSoon: true })).toEqual([`soon${DOMAIN}`]);
  });

  // A page at a time, as every admin list reads (CLAUDE.md rule 8).
  const id = (n: number) => `00000000-0000-0000-0000-0000000001${String(n).padStart(2, '0')}`;

  // Five pending invitations an hour apart but for two sharing an instant,
  // as one statement's `now()` is shared, which only the id can order. Named
  // fern or bracken by turn, so a filter picks rows from every page.
  async function fivePending() {
    await sql`
        insert into invitations (id, email, token_hash, created_at, created_by, updated_by, expires_at, site_role)
        values
          (${id(1)}, ${`fern.one${DOMAIN}`}, 'h1', now() - interval '1 hour', ${E.id}, ${E.id}, now() + interval '1 day', 'admin'),
          (${id(3)}, ${`bracken.one${DOMAIN}`}, 'h3', now() - interval '2 hours', ${E.id}, ${E.id}, now() + interval '1 day', 'admin'),
          (${id(2)}, ${`fern.two${DOMAIN}`}, 'h2', now() - interval '2 hours', ${E.id}, ${E.id}, now() + interval '1 day', 'admin'),
          (${id(4)}, ${`bracken.two${DOMAIN}`}, 'h4', now() - interval '3 hours', ${E.id}, ${E.id}, now() + interval '1 day', 'admin'),
          (${id(5)}, ${`fern.three${DOMAIN}`}, 'h5', now() - interval '4 hours', ${E.id}, ${E.id}, now() + interval '1 day', 'admin'),
          (${id(6)}, ${`fern.revoked${DOMAIN}`}, 'h6', now() - interval '1 hour', ${E.id}, ${E.id}, now() + interval '1 day', 'admin')
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
});

describe('countPendingAdminInvitations', () => {
  it('counts the pending invitations under the filter, and those before a page', async () => {
    await sql`
        insert into invitations (email, token_hash, created_at, created_by, updated_by, expires_at, revoked_at, site_role)
        values
          (${`fern.one${DOMAIN}`}, 'h1', now() - interval '1 hour', ${E.id}, ${E.id}, now() + interval '1 day', null, 'admin'),
          (${`bracken${DOMAIN}`}, 'h2', now() - interval '2 hours', ${E.id}, ${E.id}, now() + interval '1 day', null, 'admin'),
          (${`fern.two${DOMAIN}`}, 'h3', now() - interval '3 hours', ${E.id}, ${E.id}, now() + interval '1 day', null, 'admin'),
          (${`fern.three${DOMAIN}`}, 'h4', now() - interval '4 hours', ${E.id}, ${E.id}, now() + interval '1 day', null, 'admin'),
          (${`fern.revoked${DOMAIN}`}, 'h5', now() - interval '5 hours', ${E.id}, ${E.id}, now() + interval '1 day', now(), 'admin')
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
});

describe('while admin changes are paused', () => {
  beforeEach(async () => {
    await pauseAdminRoleChanges(asUser(AS_PRIMARY));
  });

  it('refuses another admin’s invitation, naming nobody, and sends it once resumed', async () => {
    const refusal = createAdminInvitation(asUser(E), INVITED, 'admin', undefined, sender());

    await expect(refusal).rejects.toThrow(Forbidden);
    await expect(refusal).rejects.toThrow(PAUSED_REFUSAL);
    expect(await invitations()).toEqual([]);
    expect(send).not.toHaveBeenCalled();

    await resumeAdminRoleChanges(asUser(AS_PRIMARY));
    await expect(
      createAdminInvitation(asUser(E), INVITED, 'admin', undefined, sender()),
    ).resolves.toMatchObject({ email: INVITED });
  });

  it('refuses another admin’s revoke, and revokes once resumed', async () => {
    const { id } = await createAdminInvitation(
      asUser(AS_PRIMARY),
      INVITED,
      'admin',
      undefined,
      sender(),
    );

    await expect(revokeAdminInvitation(asUser(E), id)).rejects.toThrow(PAUSED_REFUSAL);
    expect((await invitations())[0].revoked_at).toBeNull();

    await resumeAdminRoleChanges(asUser(AS_PRIMARY));
    await expect(revokeAdminInvitation(asUser(E), id)).resolves.toMatchObject({ id });
  });

  it('lets the primary admin invite and revoke', async () => {
    const { id } = await createAdminInvitation(
      asUser(AS_PRIMARY),
      INVITED,
      'admin',
      undefined,
      sender(),
    );
    await revokeAdminInvitation(asUser(AS_PRIMARY), id);

    expect(await invitations()).toEqual([
      expect.objectContaining({ created_by: PRIMARY, updated_by: PRIMARY }),
    ]);
    expect((await invitations())[0].revoked_at).toBeInstanceOf(Date);
  });

  it('still lists the pending invitations to every admin', async () => {
    await createAdminInvitation(asUser(AS_PRIMARY), INVITED, 'admin', undefined, sender());

    expect(await pending()).toHaveLength(1);
  });
});
