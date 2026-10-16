import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { decodeCursor, resolvePage } from '@/lib/pagination';
import { countReceivedInvitations, listReceivedInvitations } from '@/modules/identity';
import type { PageRequest } from '@/lib/types';
import { A, B, D, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import type { InvitationFixture } from './types';

// M10.32: the coven invitations addressed to the signed-in account, as the
// `/coven` landing lists them. The session is the scope, so a call needs no
// permission and names no workspace; the repository matches the verified
// address (tests/db/repository/invitations.test.ts). What this proves is the
// service's own: the fields it assembles from three reads, and that another
// account sees none of them.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

const PAGE: PageRequest = { limit: 101, inverted: false };
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

/** A coven invitation into W for D's address from A, pending, unless the fixture says otherwise. */
async function invite(fixture: InvitationFixture & { expiresInDays?: number } = {}) {
  const {
    email = D.email,
    token = 'fixture-token-received',
    createdBy = A.id,
    note = null,
    workspaceId = WORKSPACE_W_ID,
    role = 'viewer',
    expiresInDays = 7,
    revoked = false,
  } = fixture;
  const [row] = await sql`
    insert into invitations (email, token_hash, note, workspace_id, role, created_by, updated_by,
      expires_at, revoked_at)
    values (${email}, ${sha256(token)}, ${note}, ${workspaceId}, ${role}, ${createdBy}, ${createdBy},
      now() + make_interval(days => ${expiresInDays}), ${revoked ? sql`now()` : null})
    returning id, expires_at
  `;
  return { id: row!.id as string, expiresAt: row!.expires_at as Date };
}

const idsFor = async (user: typeof D) =>
  (await listReceivedInvitations(asUser(user), PAGE)).map(({ node }) => node.id);

beforeEach(async () => {
  await sql`truncate invitations`;
  await sql`update users set email_verified = true where id in (${A.id}, ${B.id}, ${D.id})`;
  await sql`update users set deleted_at = null, deleted_by = null where id = ${A.id}`;
});

describe('listReceivedInvitations', () => {
  it('lists a pending invitation with its coven, role, sender, expiry and note, and no token or address', async () => {
    const { id, expiresAt } = await invite({ note: 'Bring salt' });
    const [{ name, slug }] =
      await sql`select name, slug from workspaces where id = ${WORKSPACE_W_ID}`;
    const [sender] = await sql`select name from users where id = ${A.id}`;

    const entries = await listReceivedInvitations(asUser(D), PAGE);

    expect(entries).toHaveLength(1);
    expect(entries[0]!.node).toEqual({
      id,
      covenName: name,
      covenSlug: slug,
      role: 'viewer',
      inviterName: sender!.name,
      expiresAt,
      note: 'Bring salt',
    });
    expect(entries[0]!.cursor).toBeTruthy();
  });

  it('gives the sender no name once their account is deleted, and the name back when it is not', async () => {
    const { id } = await invite();
    await sql`update users set deleted_at = now(), deleted_by = ${E.id} where id = ${A.id}`;

    expect((await listReceivedInvitations(asUser(D), PAGE))[0]?.node).toMatchObject({
      id,
      inviterName: null,
    });

    await sql`update users set deleted_at = null, deleted_by = null where id = ${A.id}`;
    expect((await listReceivedInvitations(asUser(D), PAGE))[0]?.node.inviterName).toEqual(
      expect.any(String),
    );
  });

  it('shows another account none of it, though the invitation is pending in a live coven', async () => {
    const { id } = await invite();
    // Why B, or the sender, could have been shown it: it exists, pending, in a live coven, and D is shown it.
    expect(await idsFor(D)).toEqual([id]);

    expect(await idsFor(B)).toEqual([]);
    expect(await idsFor(A)).toEqual([]);
    expect(await countReceivedInvitations(asUser(B), undefined)).toMatchObject({ totalCount: 0 });
  });

  it('never lists an admin invitation to the same address', async () => {
    const { id } = await invite();
    await sql`
      insert into invitations (email, token_hash, site_role, created_by, updated_by, expires_at)
      values (${D.email}, ${sha256('fixture-token-site')}, 'admin', ${E.id}, ${E.id}, now() + interval '7 days')
    `;
    // Why it could have been listed: pending, to D's verified address, and one more row there.
    expect(await sql`select id from invitations where workspace_id is null`).toHaveLength(1);

    expect(await idsFor(D)).toEqual([id]);
    expect(await countReceivedInvitations(asUser(D), undefined)).toMatchObject({ totalCount: 1 });
  });

  it('leaves out a revoked invitation and a deleted coven’s, which return when undone', async () => {
    const { id } = await invite();
    const { id: revoked } = await invite({ token: 'fixture-token-revoked', revoked: true });
    expect(await idsFor(D)).toEqual([id]);

    await sql`update invitations set revoked_at = null where id = ${revoked}`;
    expect((await idsFor(D)).sort()).toEqual([id, revoked].sort());

    await sql`update workspaces set deleted_at = now(), deleted_by = ${A.id} where id = ${WORKSPACE_W_ID}`;
    try {
      expect(await idsFor(D)).toEqual([]);
    } finally {
      await sql`update workspaces set deleted_at = null, deleted_by = null where id = ${WORKSPACE_W_ID}`;
    }
    expect(await idsFor(D)).toHaveLength(2);
  });

  it('pages newest first through the cursor helper and counts the rows before a page’s first', async () => {
    const ids: string[] = [];
    for (const n of [1, 2, 3, 4]) {
      const { id } = await invite({ token: `fixture-token-page-${n}` });
      await sql`update invitations set created_at = now() - make_interval(hours => ${5 - n}) where id = ${id}`;
      ids.push(id);
    }
    const newestFirst = [...ids].reverse();

    const first = await resolvePage({ first: 3 }, (request) =>
      listReceivedInvitations(asUser(D), request),
    );
    const second = await resolvePage({ first: 3, after: first.pageInfo.endCursor }, (request) =>
      listReceivedInvitations(asUser(D), request),
    );

    expect(first.edges.map((edge) => edge.node.id)).toEqual(newestFirst.slice(0, 3));
    expect(second.edges.map((edge) => edge.node.id)).toEqual(newestFirst.slice(3));
    const start = decodeCursor(second.pageInfo.startCursor ?? '');
    expect(await countReceivedInvitations(asUser(D), start)).toEqual({
      totalCount: 4,
      countBefore: 3,
    });
  });
});
