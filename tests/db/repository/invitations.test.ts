import { createHash } from 'node:crypto';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  findInvitationByToken,
  findInvitationInWorkspace,
  findReceivedInvitation,
  findReceivedInvitationCount,
  findReceivedInvitationCovens,
  findReceivedInvitationInviters,
  findReceivedInvitationPage,
  findPendingWorkspaceInvitationCount,
  findPendingWorkspaceInvitationPage,
  findPendingSiteInvitationPage,
  findCardArrivalPage,
  findCardArrivalCount,
  findCardCount,
  findCardPage,
  withAudit,
  type AuditWriter,
  type InvitationRow,
  type SiteInvitationValues,
  type WorkspaceInvitationValues,
} from '@/db/repository';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { workspaces } from '@/modules/coven/schema/workspaces';
import { eq } from 'drizzle-orm';
import { makeWorkspace } from '../../support/fixtures';
import { type Membership, assertMembership } from '@/modules/coven';
import { assertSiteAdmin } from '@/modules/identity';
import { A, B, D, E, asUser } from '../../support/as-user';
import type { SessionUser } from '../../support/types';
import { sql, useRawClient } from '../../support/db/probe-tables';
import type { InvitationOverrides } from './types';

useRawClient();

// The invitation's named writes and finders by tier (claude-docs/db/invitations.md): a `Membership` writes and revokes in its own workspace, a `SiteAdmin` on the site tier (workspace and role both null);
// the accept and token read take no proof, since the invitee holds none yet, and match either tier. The insert stores the token's hash and the read and accept match one, so a dumped row's hash redeems nothing.

// Fixed strings, the shape of a `crypto.randomBytes` token in base64url.
const TOKEN = 'fixture-token-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const OTHER_TOKEN = 'fixture-token-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
// A's address in another case: the match is case-insensitive.
const INVITED = A.email.toUpperCase();
const PAST = () => new Date(Date.now() - 1000);

// Computed here rather than imported, so the test does not grade the
// repository's hash against itself.
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

const admin = assertSiteAdmin(asUser(E));
// A owns W; D is a member of X, which is all a repository test needs of a
// proof: the repository reads its workspace, and the service its role.
let inW: Membership;
let inX: Membership;

beforeAll(async () => {
  inW = await assertMembership(asUser(A), WORKSPACE_W_ID, { member: ['invite'] });
  inX = await assertMembership(asUser(D), WORKSPACE_X_ID, { workspace: ['read'] });
});

beforeEach(async () => {
  await sql`truncate invitations`;
  await sql`update users set email_verified = true where id in (${A.id}, ${B.id})`;
});

const inviteIntoW = (values: InvitationOverrides = {}, proof = () => inW) =>
  withAudit(asUser(A), (write) =>
    write.insertInvitation(proof(), { email: INVITED, role: 'member', token: TOKEN, ...values }),
  );

const inviteToSite = (
  values: InvitationOverrides = {},
  siteRole: SiteInvitationValues['siteRole'] = 'admin',
) =>
  withAudit(asUser(E), (write) =>
    write.insertInvitation(admin, { email: INVITED, token: TOKEN, siteRole, ...values }),
  );

const acceptAs = (user: SessionUser, token = TOKEN) =>
  withAudit(asUser(user), (write) => write.acceptInvitation(token));

const revokeInWorkspace = (id: string, proof = () => inW) =>
  withAudit(asUser(A), (write) => write.revokeInvitation(proof(), id));

const declineAs = (user: SessionUser, id: string) =>
  withAudit(asUser(user), (write) => write.declineReceivedInvitation(id));

const revokeOnSite = (id: string) =>
  withAudit(asUser(E), (write) => write.revokeInvitation(admin, id));

const rowOf = async (id: string) => (await sql`select * from invitations where id = ${id}`)[0];

describe('insertInvitation', () => {
  it('writes an owner’s invitation into the proof’s workspace with its role, storing the token as its hash', async () => {
    const [inserted] = await inviteIntoW();

    expect(inserted).toMatchObject({
      workspaceId: WORKSPACE_W_ID,
      role: 'member',
      email: INVITED,
      tokenHash: sha256(TOKEN),
      note: null,
      acceptedAt: null,
      acceptedBy: null,
      revokedAt: null,
      createdBy: A.id,
      updatedBy: A.id,
    });
    expect(Object.values(await rowOf(inserted!.id))).not.toContain(TOKEN);
  });

  it('writes an admin’s invitation on the site tier, a null pair, with its note', async () => {
    const [inserted] = await inviteToSite({ note: 'Takes over the vocabularies' });

    expect(inserted).toMatchObject({
      workspaceId: null,
      role: null,
      siteRole: 'admin',
      email: INVITED,
      tokenHash: sha256(TOKEN),
      note: 'Takes over the vocabularies',
      createdBy: E.id,
    });
    expect(Object.values(await rowOf(inserted!.id))).not.toContain(TOKEN);
  });

  it('writes the site role a site-tier invitation names, and none on a coven invitation', async () => {
    const [curators] = await inviteToSite({}, 'curator');
    const [owners] = await inviteIntoW({ token: OTHER_TOKEN });

    expect(curators).toMatchObject({ workspaceId: null, siteRole: 'curator' });
    expect(owners).toMatchObject({ workspaceId: WORKSPACE_W_ID, siteRole: null });
  });

  // The tier is the proof's, whatever a cast smuggled into the values.
  it('takes the tier from the proof alone', async () => {
    const [owners] = await withAudit(asUser(A), (write) =>
      write.insertInvitation(inW, {
        email: INVITED,
        role: 'viewer',
        token: TOKEN,
        workspaceId: WORKSPACE_X_ID,
        siteRole: 'admin',
      } as WorkspaceInvitationValues),
    );
    const [admins] = await withAudit(asUser(E), (write) =>
      write.insertInvitation(admin, {
        email: INVITED,
        token: OTHER_TOKEN,
        siteRole: 'curator',
        workspaceId: WORKSPACE_W_ID,
        role: 'member',
        acceptedBy: E.id,
      } as SiteInvitationValues),
    );

    expect(owners).toMatchObject({ workspaceId: WORKSPACE_W_ID, role: 'viewer', siteRole: null });
    expect(admins).toMatchObject({
      workspaceId: null,
      role: null,
      siteRole: 'curator',
      acceptedBy: null,
    });
  });
});

describe('findInvitationByToken', () => {
  it('finds an invitation on either tier by its token', async () => {
    const [owners] = await inviteIntoW();
    const [admins] = await inviteToSite({ token: OTHER_TOKEN });

    expect(await findInvitationByToken(TOKEN)).toEqual(owners);
    expect(await findInvitationByToken(OTHER_TOKEN)).toEqual(admins);
  });

  // A leaked row's hash, passed where a token goes, is hashed again and so
  // matches nothing; the found case above is the same row.
  it('finds nothing for an unknown token, for the stored hash, or for a soft-deleted row', async () => {
    const [inserted] = await inviteToSite();

    expect(await findInvitationByToken(OTHER_TOKEN)).toBeUndefined();
    expect(await findInvitationByToken(inserted!.tokenHash)).toBeUndefined();

    await sql`
      update invitations set deleted_at = now(), deleted_by = ${E.id} where id = ${inserted!.id}
    `;
    expect(await findInvitationByToken(TOKEN)).toBeUndefined();
  });

  // The services tell expired, revoked and accepted apart, each with its own
  // message, so the read hands back a dead invitation rather than hiding it.
  it('finds an expired, a revoked and an accepted invitation alike', async () => {
    const [expired] = await inviteIntoW({ expiresAt: PAST() });
    const [revoked] = await inviteToSite({ token: OTHER_TOKEN });
    await revokeOnSite(revoked!.id);

    expect(await findInvitationByToken(TOKEN)).toMatchObject({ id: expired?.id });
    expect(await findInvitationByToken(OTHER_TOKEN)).toMatchObject({ id: revoked?.id });
  });
});

describe('acceptInvitation', () => {
  // A is no admin and B no owner: the accepter is whoever the session names.
  it.each([
    ['a workspace invitation', () => inviteIntoW()],
    ['a site invitation', () => inviteToSite()],
  ])(
    'accepts %s for the verified holder of the invited address, stamped from the session',
    async (_tier, invite) => {
      const [inserted] = await invite();

      const accepted = await acceptAs(A);

      expect(accepted).toHaveLength(1);
      expect(accepted[0]).toMatchObject({
        id: inserted?.id,
        acceptedBy: A.id,
        updatedBy: A.id,
        createdBy: inserted?.createdBy,
        revokedAt: null,
      });
      expect(accepted[0]?.acceptedAt).toBeInstanceOf(Date);
    },
  );
});

describe('acceptInvitation into a deleted workspace', () => {
  it('returns no row, though the invitation is pending and the address matches', async () => {
    const { slug } = makeWorkspace({ name: 'Fixture Coven Invite Razed' });
    const [workspace] = await withAudit(asUser(A), (write) =>
      write.insert(workspaces, { name: 'Fixture Coven Invite Razed', slug }),
    );
    await sql`
      insert into workspace_members (workspace_id, user_id, role, created_by, updated_by)
      values (${workspace.id}, ${D.id}, 'owner', ${D.id}, ${D.id})
    `;
    const proof = await assertMembership(asUser(D), workspace.id, { member: ['invite'] });
    await inviteIntoW({}, () => proof);
    // Why the refusal is the workspace check's: while the coven is live the
    // same invitation, token and holder are accepted.
    const [pending] =
      await sql`select accepted_at from invitations where workspace_id = ${workspace.id}`;
    expect(pending?.accepted_at).toBeNull();
    await withAudit(asUser(A), (write) =>
      write.softDelete(workspaces, eq(workspaces.id, workspace.id)),
    );

    await expect(acceptAs(A)).resolves.toEqual([]);

    const [after] =
      await sql`select accepted_at from invitations where workspace_id = ${workspace.id}`;
    expect(after?.accepted_at).toBeNull();
  });

  it('accepts the same invitation while the workspace is live', async () => {
    const { slug } = makeWorkspace({ name: 'Fixture Coven Invite Live' });
    const [workspace] = await withAudit(asUser(A), (write) =>
      write.insert(workspaces, { name: 'Fixture Coven Invite Live', slug }),
    );
    await sql`
      insert into workspace_members (workspace_id, user_id, role, created_by, updated_by)
      values (${workspace.id}, ${D.id}, 'owner', ${D.id}, ${D.id})
    `;
    const proof = await assertMembership(asUser(D), workspace.id, { member: ['invite'] });
    await inviteIntoW({}, () => proof);

    await expect(acceptAs(A)).resolves.toHaveLength(1);
  });
});

describe('revokeInvitation, by tier', () => {
  it('revokes a pending workspace invitation under its workspace’s proof, the revoker stamped', async () => {
    const [inserted] = await inviteIntoW();

    const revoked = await revokeInWorkspace(inserted!.id);

    expect(revoked).toHaveLength(1);
    expect(revoked[0]).toMatchObject({ id: inserted?.id, updatedBy: A.id, acceptedAt: null });
    expect(revoked[0]?.revokedAt).toBeInstanceOf(Date);
  });

  it('revokes a pending site invitation under the SiteAdmin proof, the revoker stamped', async () => {
    const [inserted] = await inviteToSite();

    const revoked = await revokeOnSite(inserted!.id);

    expect(revoked).toHaveLength(1);
    expect(revoked[0]).toMatchObject({ id: inserted?.id, updatedBy: E.id });
    expect(revoked[0]?.revokedAt).toBeInstanceOf(Date);
  });

  // Each refusal by direct id is followed by the call the row's own tier
  // makes succeeding on the same id, so the tier is what refused it.
  it('cannot reach a site invitation by id with a workspace proof', async () => {
    const [site] = await inviteToSite();

    expect(await revokeInWorkspace(site!.id)).toEqual([]);
    expect(await rowOf(site!.id)).toMatchObject({ revoked_at: null });
    expect(await revokeOnSite(site!.id)).toHaveLength(1);
  });

  it('cannot reach a workspace invitation by id with the SiteAdmin proof', async () => {
    const [owners] = await inviteIntoW();

    expect(await revokeOnSite(owners!.id)).toEqual([]);
    expect(await rowOf(owners!.id)).toMatchObject({ revoked_at: null });
    expect(await revokeInWorkspace(owners!.id)).toHaveLength(1);
  });

  it('cannot reach another workspace’s invitation by id', async () => {
    const [owners] = await inviteIntoW();

    expect(await revokeInWorkspace(owners!.id, () => inX)).toEqual([]);
    expect(await rowOf(owners!.id)).toMatchObject({ revoked_at: null });
    expect(await revokeInWorkspace(owners!.id)).toHaveLength(1);
  });

  it('revokes no invitation already accepted, already revoked, or expired', async () => {
    const [accepted] = await inviteIntoW();
    await acceptAs(A);
    const [revoked] = await inviteToSite({ token: OTHER_TOKEN });
    await revokeOnSite(revoked!.id);
    const [expired] = await inviteToSite({ token: 'fixture-token-expired', expiresAt: PAST() });

    expect([
      await revokeInWorkspace(accepted!.id),
      await revokeOnSite(revoked!.id),
      await revokeOnSite(expired!.id),
    ]).toEqual([[], [], []]);
    expect(await findInvitationByToken(TOKEN)).toMatchObject({ revokedAt: null });
  });
});

describe('the owner’s list and a declined invitation', () => {
  const FULL = { limit: 101, inverted: false };
  const listed = async (proof: Membership = inW) =>
    (await findPendingWorkspaceInvitationPage(proof, FULL)).map(({ node }) => node.id);
  const counted = async (proof: Membership = inW) =>
    (await findPendingWorkspaceInvitationCount(proof, undefined)).totalCount;

  it.each([
    ['a declined one', ''],
    ['a declined one past its expiry', 'past'],
  ])('lists and counts %s until it is revoked', async (_kind, when) => {
    const [row] = await inviteIntoW({ token: 'fixture-token-o-declined' });
    await declineAs(A, row!.id);
    if (when)
      await sql`update invitations set expires_at = now() - interval '1 day' where id = ${row!.id}`;

    expect(await rowOf(row!.id)).toMatchObject({ declined_at: expect.any(Date), revoked_at: null });
    expect(await listed()).toEqual([row!.id]);
    expect(await counted()).toBe(1);
    // Why it is the open filter that keeps it: another coven sees nothing, and
    // an expired invitation that was never declined is gone from the same list.
    expect(await listed(inX)).toEqual([]);
    const [lapsed] = await inviteIntoW({ token: 'fixture-token-o-lapsed', expiresAt: PAST() });
    expect(await listed()).not.toContain(lapsed!.id);

    await revokeInWorkspace(row!.id);

    expect(await listed()).toEqual([]);
    expect(await counted()).toBe(0);
  });

  it('revokes a declined invitation, the row keeping its decline and gaining the revoke', async () => {
    const [row] = await inviteIntoW();
    await declineAs(A, row!.id);

    const revoked = await revokeInWorkspace(row!.id);

    expect(revoked).toHaveLength(1);
    expect(revoked[0]).toMatchObject({
      id: row!.id,
      declinedAt: expect.any(Date),
      revokedAt: expect.any(Date),
      updatedBy: A.id,
    });
  });

  it('revokes no accepted invitation, though it too is no longer pending', async () => {
    const [accepted] = await inviteIntoW();
    await acceptAs(A);

    expect(await rowOf(accepted!.id)).toMatchObject({ declined_at: null });
    expect(await revokeInWorkspace(accepted!.id)).toEqual([]);
    expect(await listed()).toEqual([]);
  });

  it('cannot be revoked through another coven’s proof, and the owner’s revoke takes it', async () => {
    const [row] = await inviteIntoW();
    await declineAs(A, row!.id);

    expect(await revokeInWorkspace(row!.id, () => inX)).toEqual([]);
    expect(await rowOf(row!.id)).toMatchObject({ revoked_at: null });
    expect(await revokeInWorkspace(row!.id)).toHaveLength(1);
  });

  it('leaves the site tier on the pending filter: an expired admin invitation is neither revoked nor listed', async () => {
    const [site] = await inviteToSite({ token: 'fixture-token-o-site' });
    await sql`update invitations set expires_at = now() - interval '1 day' where id = ${site!.id}`;

    expect(await revokeOnSite(site!.id)).toEqual([]);
    expect(await findPendingSiteInvitationPage(admin, {}, { limit: 101, inverted: false })).toEqual(
      [],
    );
  });
});

describe('the pending lists', () => {
  /** One pending row on each tier and in each workspace, and each way a row stops pending. */
  async function everyKind() {
    const [pendingInW] = await inviteIntoW({ token: 'fixture-token-w-pending' });
    const [pendingInX] = await inviteIntoW({ token: 'fixture-token-x-pending' }, () => inX);
    const [pendingOnSite] = await inviteToSite({ token: 'fixture-token-site-pending' });

    await inviteIntoW({ token: 'fixture-token-w-expired', expiresAt: PAST() });
    await inviteToSite({ token: 'fixture-token-site-expired', expiresAt: PAST() });
    const [revokedInW] = await inviteIntoW({ token: 'fixture-token-w-revoked' });
    await revokeInWorkspace(revokedInW!.id);
    const [revokedOnSite] = await inviteToSite({ token: 'fixture-token-site-revoked' });
    await revokeOnSite(revokedOnSite!.id);
    await inviteIntoW({ token: 'fixture-token-w-accepted' });
    await acceptAs(A, 'fixture-token-w-accepted');
    const [deletedInW] = await inviteIntoW({ token: 'fixture-token-w-deleted' });
    await sql`
      update invitations set deleted_at = now(), deleted_by = ${A.id} where id = ${deletedInW!.id}
    `;

    return { pendingInW, pendingInX, pendingOnSite };
  }

  const ids = (rows: InvitationRow[]) => rows.map((row) => row.id).sort();

  const workspacePage = async (proof: Membership) =>
    ids(
      (await findPendingWorkspaceInvitationPage(proof, { limit: 101, inverted: false })).map(
        ({ node }) => node,
      ),
    );

  it('reads a workspace’s pending invitations and nothing else', async () => {
    const { pendingInW, pendingInX } = await everyKind();

    // Why X's row could have been read: it is pending, as W's is.
    expect(await workspacePage(inX)).toEqual([pendingInX!.id]);
    expect(await workspacePage(inW)).toEqual([pendingInW!.id]);
    expect(await findPendingWorkspaceInvitationCount(inW, undefined)).toMatchObject({
      totalCount: 1,
    });
    expect(await findPendingWorkspaceInvitationCount(inX, undefined)).toMatchObject({
      totalCount: 1,
    });
  });

  it('pages newest first, and counts the rows before a page’s first', async () => {
    const [oldest] = await inviteIntoW({ token: 'fixture-token-w-1' });
    const [middle] = await inviteIntoW({ token: 'fixture-token-w-2' });
    const [newest] = await inviteIntoW({ token: 'fixture-token-w-3' });
    // Distinct instants, set apart from insertion order.
    await sql`update invitations set created_at = now() - interval '3 hours' where id = ${oldest!.id}`;
    await sql`update invitations set created_at = now() - interval '2 hours' where id = ${middle!.id}`;
    await sql`update invitations set created_at = now() - interval '1 hour' where id = ${newest!.id}`;

    const all = await findPendingWorkspaceInvitationPage(inW, { limit: 101, inverted: false });
    expect(all.map(({ node }) => node.id)).toEqual([newest!.id, middle!.id, oldest!.id]);

    const second = all[1]!;
    expect(await findPendingWorkspaceInvitationCount(inW, undefined)).toMatchObject({
      totalCount: 3,
    });
    expect(await findPendingWorkspaceInvitationCount(inW, second.cursor)).toMatchObject({
      totalCount: 3,
      countBefore: 1,
    });
  });

  it('finds an invitation by id in any state, in its own workspace only', async () => {
    const { pendingInW, pendingInX } = await everyKind();
    const [revoked] = await inviteIntoW({ token: 'fixture-token-w-revoked-2' });
    await revokeInWorkspace(revoked!.id);
    const [accepted] = await inviteIntoW({ token: 'fixture-token-w-accepted-2' });
    await acceptAs(A, 'fixture-token-w-accepted-2');
    const [deleted] = await inviteIntoW({ token: 'fixture-token-w-deleted-2' });
    await sql`update invitations set deleted_at = now(), deleted_by = ${A.id} where id = ${deleted!.id}`;

    expect((await findInvitationInWorkspace(inW, pendingInW!.id))?.id).toBe(pendingInW!.id);
    expect(await findInvitationInWorkspace(inW, revoked!.id)).toMatchObject({
      revokedAt: expect.any(Date),
    });
    expect(await findInvitationInWorkspace(inW, accepted!.id)).toMatchObject({
      acceptedAt: expect.any(Date),
    });
    // Why X's row could have been found: it exists, pending, in a live workspace.
    expect(await rowOf(pendingInX!.id)).toBeDefined();
    expect(await findInvitationInWorkspace(inW, pendingInX!.id)).toBeUndefined();
    expect(await findInvitationInWorkspace(inW, deleted!.id)).toBeUndefined();
    expect(
      await findInvitationInWorkspace(inW, '00000000-0000-4000-8000-000000000000'),
    ).toBeUndefined();
  });

  it('reads the site tier’s pending invitations and nothing else', async () => {
    const { pendingOnSite } = await everyKind();

    expect(await sql`select id from invitations where workspace_id is not null`).not.toEqual([]);
    const page = await findPendingSiteInvitationPage(admin, {}, { limit: 101, inverted: false });
    expect(ids(page.map(({ node }) => node))).toEqual([pendingOnSite!.id]);
  });
});

// The session's own received invitations. Every finder keeps the workspace tier, the session's verified address and a live coven in SQL, as the token-less accept by id does.
// Each exclusion is shown to be the cause: remove that one fact and the same row appears.
describe('the received invitations', () => {
  const FULL = { limit: 101, inverted: false };
  const sorted = (list: string[]) => [...list].sort();
  const pageIds = async (user: SessionUser = A) =>
    sorted((await findReceivedInvitationPage(asUser(user), FULL)).map(({ node }) => node.id));
  const countOf = async (user: SessionUser = A) =>
    (await findReceivedInvitationCount(asUser(user), undefined)).totalCount;
  const acceptById = (user: SessionUser, id: string) =>
    withAudit(asUser(user), (write) => write.acceptReceivedInvitation(id));

  let control: InvitationRow;
  beforeEach(async () => {
    [control] = (await inviteIntoW({ token: 'fixture-token-control' })) as [InvitationRow];
  });

  // Each row is pending, in W, for A's address but for one fact; `restore`
  // puts that fact right in SQL, bypassing the writers on purpose.
  const exclusions: [string, () => Promise<string>, (id: string) => Promise<unknown>][] = [
    [
      'another address',
      async () => (await inviteIntoW({ email: B.email, token: 'fixture-token-b' }))[0]!.id,
      (id) => sql`update invitations set email = ${A.email} where id = ${id}`,
    ],
    [
      'revoked',
      async () => {
        const [row] = await inviteIntoW({ token: 'fixture-token-revoked' });
        await revokeInWorkspace(row!.id);
        return row!.id;
      },
      (id) => sql`update invitations set revoked_at = null where id = ${id}`,
    ],
    [
      'expired',
      async () => (await inviteIntoW({ token: 'fixture-token-expired', expiresAt: PAST() }))[0]!.id,
      (id) => sql`update invitations set expires_at = now() + interval '1 day' where id = ${id}`,
    ],
    [
      'declined',
      async () => {
        const [row] = await inviteIntoW({ token: 'fixture-token-declined' });
        await declineAs(A, row!.id);
        return row!.id;
      },
      (id) => sql`update invitations set declined_at = null where id = ${id}`,
    ],
    [
      'accepted',
      async () => {
        const [row] = await inviteIntoW({ token: 'fixture-token-accepted' });
        await acceptAs(A, 'fixture-token-accepted');
        return row!.id;
      },
      (id) => sql`update invitations set accepted_at = null, accepted_by = null where id = ${id}`,
    ],
    [
      'a deleted row',
      async () => {
        const [row] = await inviteIntoW({ token: 'fixture-token-deleted' });
        await sql`update invitations set deleted_at = now(), deleted_by = ${A.id} where id = ${row!.id}`;
        return row!.id;
      },
      (id) => sql`update invitations set deleted_at = null, deleted_by = null where id = ${id}`,
    ],
  ];

  it.each(exclusions)(
    'pages and counts no invitation that is %s, and the same row appears once that is undone',
    async (_kind, setup, restore) => {
      const id = await setup();

      // Why the row could have been read: it exists, and the control shows the session sees W.
      expect(await rowOf(id)).toBeDefined();
      expect(await pageIds()).toEqual([control.id]);
      expect(await countOf()).toBe(1);

      await restore(id);

      expect(await pageIds()).toEqual(sorted([control.id, id]));
      expect(await countOf()).toBe(2);
    },
  );

  it('pages the site tier’s invitation for the same address never, though it is pending and matches', async () => {
    const [site] = await inviteToSite({ token: 'fixture-token-site' });

    // Why it could have been read: pending, live, A's verified address; the
    // token read finds it and the token accept takes it, so only the tier excludes it.
    expect(site?.workspaceId).toBeNull();
    expect(await findInvitationByToken('fixture-token-site')).toMatchObject({ id: site?.id });
    expect(await pageIds()).toEqual([control.id]);
    expect(await countOf()).toBe(1);
    expect(await findReceivedInvitation(asUser(A), site!.id)).toBeUndefined();
  });

  it('pages nothing for an unverified account, and the rows come back once it is verified', async () => {
    await sql`update users set email_verified = false where id = ${A.id}`;

    expect(await rowOf(control.id)).toBeDefined();
    expect(await pageIds()).toEqual([]);
    expect(await countOf()).toBe(0);
    expect(await findReceivedInvitation(asUser(A), control.id)).toBeUndefined();

    await sql`update users set email_verified = true where id = ${A.id}`;

    expect(await pageIds()).toEqual([control.id]);
    expect(await findReceivedInvitation(asUser(A), control.id)).toMatchObject({ id: control.id });
  });

  it('matches the address whatever its case', async () => {
    // The control was written with A's address upper-cased; the account holds it lower-cased.
    expect(control.email).toBe(INVITED);
    expect(INVITED).not.toBe(A.email);
    expect(await pageIds()).toEqual([control.id]);
  });

  it('pages nothing once the coven is deleted, and the row returns when it is not', async () => {
    await sql`update workspaces set deleted_at = now(), deleted_by = ${A.id} where id = ${WORKSPACE_W_ID}`;
    try {
      expect(await rowOf(control.id)).toBeDefined();
      expect(await pageIds()).toEqual([]);
      expect(await countOf()).toBe(0);
    } finally {
      await sql`update workspaces set deleted_at = null, deleted_by = null where id = ${WORKSPACE_W_ID}`;
    }

    expect(await pageIds()).toEqual([control.id]);
  });

  it('lets another account see none of the session’s invitations, and each sees its own', async () => {
    const [forB] = await inviteIntoW({ email: B.email, token: 'fixture-token-for-b' });

    expect(await pageIds(B)).toEqual([forB!.id]);
    expect(await pageIds(A)).toEqual([control.id]);
    expect(await pageIds(D)).toEqual([]);
  });

  it('pages newest first and counts the rows before a page’s first', async () => {
    const [middle] = await inviteIntoW({ token: 'fixture-token-r-2' });
    const [newest] = await inviteIntoW({ token: 'fixture-token-r-3' });
    await sql`update invitations set created_at = now() - interval '3 hours' where id = ${control.id}`;
    await sql`update invitations set created_at = now() - interval '2 hours' where id = ${middle!.id}`;
    await sql`update invitations set created_at = now() - interval '1 hour' where id = ${newest!.id}`;

    const all = await findReceivedInvitationPage(asUser(A), FULL);
    expect(all.map(({ node }) => node.id)).toEqual([newest!.id, middle!.id, control.id]);

    expect(await findReceivedInvitationCount(asUser(A), all[1]!.cursor)).toMatchObject({
      totalCount: 3,
      countBefore: 1,
    });
  });

  it('finds an invitation by id in any state for its address, and nothing for another’s', async () => {
    const [revoked] = await inviteIntoW({ token: 'fixture-token-r-revoked' });
    await revokeInWorkspace(revoked!.id);
    const [expired] = await inviteIntoW({ token: 'fixture-token-r-expired', expiresAt: PAST() });
    const [forB] = await inviteIntoW({ email: B.email, token: 'fixture-token-r-b' });
    const [deleted] = await inviteIntoW({ token: 'fixture-token-r-deleted' });
    await sql`update invitations set deleted_at = now(), deleted_by = ${A.id} where id = ${deleted!.id}`;

    expect(await findReceivedInvitation(asUser(A), control.id)).toMatchObject({ id: control.id });
    expect(await findReceivedInvitation(asUser(A), revoked!.id)).toMatchObject({
      revokedAt: expect.any(Date),
    });
    expect(await findReceivedInvitation(asUser(A), expired!.id)).toMatchObject({
      id: expired!.id,
    });
    // Why B's row could have been found: it exists, pending, in a live coven, and B finds it.
    expect(await findReceivedInvitation(asUser(B), forB!.id)).toMatchObject({ id: forB!.id });
    expect(await findReceivedInvitation(asUser(A), forB!.id)).toBeUndefined();
    expect(await findReceivedInvitation(asUser(A), deleted!.id)).toBeUndefined();
    expect(
      await findReceivedInvitation(asUser(A), '00000000-0000-4000-8000-000000000000'),
    ).toBeUndefined();
  });

  describe('the coven and the inviter of a page', () => {
    it('names the live covens and the inviters of the received invitations only, two fields each', async () => {
      const [forB] = await inviteIntoW({ email: B.email, token: 'fixture-token-n-b' });
      const [fromX] = await withAudit(asUser(D), (write) =>
        write.insertInvitation(inX, { email: INVITED, role: 'viewer', token: 'fixture-token-n-x' }),
      );

      const covens = await findReceivedInvitationCovens(asUser(A), [
        control.workspaceId!,
        fromX!.workspaceId!,
        forB!.workspaceId!,
      ]);
      const inviters = await findReceivedInvitationInviters(asUser(A), [A.id, D.id]);

      expect(covens.map(({ id }) => id).sort()).toEqual(sorted([WORKSPACE_W_ID, WORKSPACE_X_ID]));
      expect(Object.keys(covens[0]!).sort()).toEqual(['id', 'name', 'slug']);
      expect(inviters.map(({ id }) => id).sort()).toEqual(sorted([A.id, D.id]));
      expect(Object.keys(inviters[0]!).sort()).toEqual(['id', 'name']);
    });

    it('names nothing to an account the invitation was not sent to, though the ids are right', async () => {
      // Why they could have been named: A's invitation is pending in W, from A.
      expect(await pageIds()).toEqual([control.id]);
      expect(await findReceivedInvitationCovens(asUser(A), [WORKSPACE_W_ID])).toHaveLength(1);
      expect(await findReceivedInvitationInviters(asUser(A), [A.id])).toHaveLength(1);

      expect(await findReceivedInvitationCovens(asUser(D), [WORKSPACE_W_ID])).toEqual([]);
      expect(await findReceivedInvitationInviters(asUser(D), [A.id])).toEqual([]);
    });

    it('names no inviter for a site invitation, though it is pending and the address matches', async () => {
      await sql`truncate invitations`;
      const [site] = await inviteToSite({ token: 'fixture-token-n-site' });

      expect(site?.createdBy).toBe(E.id);
      expect(await findInvitationByToken('fixture-token-n-site')).toMatchObject({ id: site?.id });
      expect(await findReceivedInvitationInviters(asUser(A), [E.id])).toEqual([]);
    });

    it('names no inviter once their row is deleted, and names them again when it is not', async () => {
      const [fromD] = await withAudit(asUser(D), (write) =>
        write.insertInvitation(inX, { email: INVITED, role: 'viewer', token: 'fixture-token-n-d' }),
      );
      expect(fromD?.createdBy).toBe(D.id);
      expect(await findReceivedInvitationInviters(asUser(A), [D.id])).toHaveLength(1);

      await sql`update users set deleted_at = now(), deleted_by = ${E.id} where id = ${D.id}`;
      try {
        expect(await findReceivedInvitationInviters(asUser(A), [D.id])).toEqual([]);
      } finally {
        await sql`update users set deleted_at = null, deleted_by = null where id = ${D.id}`;
      }

      expect(await findReceivedInvitationInviters(asUser(A), [D.id])).toHaveLength(1);
    });

    it('names no coven or inviter once the invitation is revoked, nor a deleted coven', async () => {
      expect(await findReceivedInvitationCovens(asUser(A), [WORKSPACE_W_ID])).toHaveLength(1);
      await sql`update workspaces set deleted_at = now(), deleted_by = ${A.id} where id = ${WORKSPACE_W_ID}`;
      try {
        expect(await findReceivedInvitationCovens(asUser(A), [WORKSPACE_W_ID])).toEqual([]);
      } finally {
        await sql`update workspaces set deleted_at = null, deleted_by = null where id = ${WORKSPACE_W_ID}`;
      }

      await revokeInWorkspace(control.id);

      expect(await findReceivedInvitationCovens(asUser(A), [WORKSPACE_W_ID])).toEqual([]);
      expect(await findReceivedInvitationInviters(asUser(A), [A.id])).toEqual([]);
    });
  });

  describe('acceptReceivedInvitation', () => {
    it('accepts a pending invitation by id for the verified holder, stamped from the session', async () => {
      const accepted = await acceptById(A, control.id);

      expect(accepted).toHaveLength(1);
      expect(accepted[0]).toMatchObject({ id: control.id, acceptedBy: A.id, updatedBy: A.id });
      expect(accepted[0]?.acceptedAt).toBeInstanceOf(Date);
    });

    it('returns no row for another account’s id, and the owner accepts the same id', async () => {
      expect(await acceptById(B, control.id)).toEqual([]);
      expect(await rowOf(control.id)).toMatchObject({ accepted_at: null });

      expect(await acceptById(A, control.id)).toHaveLength(1);
    });

    it('returns no row for a site-tier id, though pending and the address matches; its token accepts it', async () => {
      const [site] = await inviteToSite({ token: 'fixture-token-a-site' });

      expect(await rowOf(site!.id)).toMatchObject({ accepted_at: null, workspace_id: null });
      expect(await acceptById(A, site!.id)).toEqual([]);
      expect(await rowOf(site!.id)).toMatchObject({ accepted_at: null });

      expect(await acceptAs(A, 'fixture-token-a-site')).toHaveLength(1);
    });

    it('returns no row for an unverified holder, and accepts once verified', async () => {
      await sql`update users set email_verified = false where id = ${A.id}`;

      expect(await acceptById(A, control.id)).toEqual([]);

      await sql`update users set email_verified = true where id = ${A.id}`;
      expect(await acceptById(A, control.id)).toHaveLength(1);
    });

    it('returns no row for a deleted coven, and accepts while it is live', async () => {
      await sql`update workspaces set deleted_at = now(), deleted_by = ${A.id} where id = ${WORKSPACE_W_ID}`;
      try {
        expect(await acceptById(A, control.id)).toEqual([]);
      } finally {
        await sql`update workspaces set deleted_at = null, deleted_by = null where id = ${WORKSPACE_W_ID}`;
      }

      expect(await acceptById(A, control.id)).toHaveLength(1);
    });

    it.each(exclusions.slice(1))(
      'returns no row for an invitation that is %s, and accepts once that is undone',
      async (_kind, setup, restore) => {
        const id = await setup();

        expect(await acceptById(A, id)).toEqual([]);

        await restore(id);
        expect(await acceptById(A, id)).toHaveLength(1);
      },
    );
  });

  describe('declineReceivedInvitation', () => {
    it('declines a pending invitation by id for the verified holder, stamped from the session', async () => {
      const declined = await declineAs(A, control.id);

      expect(declined).toHaveLength(1);
      expect(declined[0]).toMatchObject({
        id: control.id,
        declinedAt: expect.any(Date),
        acceptedAt: null,
        acceptedBy: null,
        revokedAt: null,
        updatedBy: A.id,
      });
    });

    it('returns no row for another account’s id, and the owner of the address declines the same id', async () => {
      expect(await declineAs(B, control.id)).toEqual([]);
      expect(await rowOf(control.id)).toMatchObject({ declined_at: null });

      expect(await declineAs(A, control.id)).toHaveLength(1);
    });

    it('returns no row for a site-tier id, though pending and the address matches; its token accepts it', async () => {
      const [site] = await inviteToSite({ token: 'fixture-token-d-site' });

      expect(await rowOf(site!.id)).toMatchObject({ declined_at: null, workspace_id: null });
      expect(await declineAs(A, site!.id)).toEqual([]);
      expect(await rowOf(site!.id)).toMatchObject({ declined_at: null });

      expect(await acceptAs(A, 'fixture-token-d-site')).toHaveLength(1);
    });

    it('returns no row for an unverified holder, and declines once verified', async () => {
      await sql`update users set email_verified = false where id = ${A.id}`;

      expect(await declineAs(A, control.id)).toEqual([]);

      await sql`update users set email_verified = true where id = ${A.id}`;
      expect(await declineAs(A, control.id)).toHaveLength(1);
    });

    it('returns no row for a deleted coven, and declines while it is live', async () => {
      await sql`update workspaces set deleted_at = now(), deleted_by = ${A.id} where id = ${WORKSPACE_W_ID}`;
      try {
        expect(await declineAs(A, control.id)).toEqual([]);
      } finally {
        await sql`update workspaces set deleted_at = null, deleted_by = null where id = ${WORKSPACE_W_ID}`;
      }

      expect(await declineAs(A, control.id)).toHaveLength(1);
    });

    // The first exclusion, another address, has its own test above.
    it.each(exclusions.slice(1))(
      'returns no row for an invitation that is %s, and declines once that is undone',
      async (_kind, setup, restore) => {
        const id = await setup();

        expect(await declineAs(A, id)).toEqual([]);

        await restore(id);
        expect(await declineAs(A, id)).toHaveLength(1);
      },
    );

    it('leaves the declined row findable by id, and out of the page and count', async () => {
      await declineAs(A, control.id);

      expect(await findReceivedInvitation(asUser(A), control.id)).toMatchObject({
        declinedAt: expect.any(Date),
      });
      expect(await pageIds()).toEqual([]);
      expect(await countOf()).toBe(0);
    });
  });
});

// No body runs: each `@ts-expect-error` fails `npm run typecheck` the
// moment its constraint is loosened, which a runtime assertion cannot see.
describe('the named writes’ signatures', () => {
  it('demands a proof, a role on the workspace tier, and the token rather than its hash', () => {
    const writes = [
      (write: AuditWriter) =>
        // @ts-expect-error — the insert takes a proof first.
        write.insertInvitation({ email: INVITED, token: TOKEN }),
      (write: AuditWriter) =>
        // @ts-expect-error — a workspace invitation names its role.
        write.insertInvitation(inW, { email: INVITED, token: TOKEN }),
      (write: AuditWriter) =>
        // @ts-expect-error — and never `owner`, which the CHECK refuses too.
        write.insertInvitation(inW, { email: INVITED, role: 'owner', token: TOKEN }),
      (write: AuditWriter) =>
        // @ts-expect-error — a site invitation has no role to name.
        write.insertInvitation(admin, { email: INVITED, role: 'member', token: TOKEN }),
      (write: AuditWriter) =>
        write.insertInvitation(admin, {
          email: INVITED,
          token: TOKEN,
          // @ts-expect-error — no hash: the writer makes it from the token.
          tokenHash: 'a'.repeat(64),
        }),
      (write: AuditWriter) =>
        // @ts-expect-error — and no lifecycle stamp: an invitation starts pending.
        write.insertInvitation(inW, {
          email: INVITED,
          role: 'member',
          token: TOKEN,
          acceptedBy: A.id,
        }),
      (write: AuditWriter) =>
        // @ts-expect-error — the revoke takes a proof first.
        write.revokeInvitation(A.id),
      (write: AuditWriter) =>
        // @ts-expect-error — a SiteAdmin is assertSiteAdmin's alone; an object literal is not one.
        write.revokeInvitation({ userId: E.id }, A.id),
      (write: AuditWriter) =>
        // @ts-expect-error — the accept by id takes the id alone: the session is the writer's own.
        write.acceptReceivedInvitation(inW, A.id),
      (write: AuditWriter) =>
        // @ts-expect-error — and an id, not the token whose hash the other accept matches.
        write.acceptReceivedInvitation(),
      (write: AuditWriter) =>
        // @ts-expect-error — the decline takes the id alone, as the accept by id does.
        write.declineReceivedInvitation(inW, A.id),
      (write: AuditWriter) =>
        // @ts-expect-error — and an id, which it has to be given.
        write.declineReceivedInvitation(),
    ];

    expect(writes).toHaveLength(12);
  });
});

describe('invitation cards', () => {
  const BATCH = '11111111-1111-4111-8111-111111111111';
  const CARD = 'cardtokenAAAAAAA';
  const OTHER_CARD = 'cardtokenBBBBBBB';
  const LATER = () => new Date(Date.now() + 7 * 24 * 3600 * 1000);

  const mint = (tokens: string[], expiresAt = LATER(), batchId = BATCH) =>
    withAudit(asUser(E), (write) =>
      write.insertInvitationCards(admin, { tokens, batchId, expiresAt }),
    );
  const cardAccept = (user: SessionUser, token = CARD) =>
    withAudit(asUser(user), (write) => write.acceptInvitation(token));

  it('stores only the hash, with no address, coven or role, one batch and one expiry', async () => {
    const expiresAt = LATER();
    const inserted = await mint([CARD, OTHER_CARD], expiresAt);

    expect(inserted).toHaveLength(2);
    expect(inserted[0]).toMatchObject({
      kind: 'card',
      email: null,
      workspaceId: null,
      role: null,
      siteRole: null,
      batchId: BATCH,
      tokenHash: sha256(CARD),
      createdBy: E.id,
      acceptedAt: null,
    });
    expect(inserted[0]!.expiresAt).toEqual(expiresAt);
    for (const row of inserted) {
      expect(Object.values(await rowOf(row.id))).not.toContain(CARD);
      expect(Object.values(await rowOf(row.id))).not.toContain(OTHER_CARD);
    }
  });

  it('inserts five hundred cards in one statement', async () => {
    const tokens = Array.from({ length: 500 }, (_, i) => `card-${String(i).padStart(11, '0')}`);
    expect(await mint(tokens)).toHaveLength(500);
  });

  it('is accepted by any verified account, whatever its address', async () => {
    await mint([CARD]);
    const [accepted] = await cardAccept(B);

    expect(accepted).toMatchObject({ acceptedBy: B.id, batchId: BATCH });
    expect((await findInvitationByToken(CARD))?.acceptedBy).toBe(B.id);
  });

  it('is accepted by no unverified account, though the card is pending', async () => {
    await mint([CARD]);
    await sql`update users set email_verified = false where id = ${B.id}`;

    expect(await cardAccept(B)).toHaveLength(0);

    await sql`update users set email_verified = true where id = ${B.id}`;
    expect(await cardAccept(B)).toHaveLength(1);
  });

  // The second account is verified and the card was pending until the first stamp, so the single-use predicate alone refuses.
  it('affects no row on a second accept', async () => {
    await mint([CARD]);
    expect(await cardAccept(B)).toHaveLength(1);

    expect(await cardAccept(A)).toHaveLength(0);
    expect(await cardAccept(B)).toHaveLength(0);
    expect((await findInvitationByToken(CARD))?.acceptedBy).toBe(B.id);
  });

  it('is not accepted once expired or revoked', async () => {
    await mint([CARD]);
    await mint([OTHER_CARD], LATER());
    await sql`update invitations set expires_at = now() - interval '1 second' where token_hash = ${sha256(CARD)}`;
    await sql`update invitations set revoked_at = now() where token_hash = ${sha256(OTHER_CARD)}`;

    expect(await cardAccept(B)).toHaveLength(0);
    expect(await cardAccept(B, OTHER_CARD)).toHaveLength(0);
  });

  it('never reaches the received list, the accept by id, the decline or the site tier’s lists', async () => {
    const [card] = await mint([CARD]);

    const received = await findReceivedInvitationPage(asUser(B), { limit: 101, inverted: false });
    expect(received).toHaveLength(0);
    expect(await findReceivedInvitation(asUser(B), card!.id)).toBeUndefined();
    expect(await withAudit(asUser(B), (w) => w.acceptReceivedInvitation(card!.id))).toHaveLength(0);
    expect(await withAudit(asUser(B), (w) => w.declineReceivedInvitation(card!.id))).toHaveLength(
      0,
    );
    expect(
      await findPendingSiteInvitationPage(admin, {}, { limit: 101, inverted: false }),
    ).toHaveLength(0);
    expect(await withAudit(asUser(E), (w) => w.revokeInvitation(admin, card!.id))).toHaveLength(0);
  });

  it('revokes a batch’s pending cards and leaves an accepted one untouched', async () => {
    await mint([CARD, OTHER_CARD]);
    await cardAccept(B);
    const before = await rowOf((await findInvitationByToken(CARD))!.id);

    const revoked = await withAudit(asUser(E), (write) =>
      write.revokeInvitationCardBatch(admin, BATCH),
    );

    expect(revoked).toHaveLength(1);
    expect(revoked[0]!.tokenHash).toBe(sha256(OTHER_CARD));
    expect(await rowOf((await findInvitationByToken(CARD))!.id)).toEqual(before);
  });

  it('revokes one pending card by id, and not an accepted one', async () => {
    const [pending, taken] = await mint([OTHER_CARD, CARD]);
    await cardAccept(B);

    const one = await withAudit(asUser(E), (w) => w.revokeInvitationCard(admin, pending!.id));
    const none = await withAudit(asUser(E), (w) => w.revokeInvitationCard(admin, taken!.id));

    expect(one).toHaveLength(1);
    expect(none).toHaveLength(0);
  });

  it('answers who arrived by card, when and from which batch, from the rows alone', async () => {
    const OTHER_BATCH = '22222222-2222-4222-8222-222222222222';
    await mint([CARD, OTHER_CARD]);
    await mint(['cardtokenCCCCCCC'], LATER(), OTHER_BATCH);
    await cardAccept(B);
    await cardAccept(A, 'cardtokenCCCCCCC');
    // An address invitation accepted is no card arrival.
    await inviteIntoW({ token: 'fixture-token-w-accepted' });
    await acceptAs(A, 'fixture-token-w-accepted');

    const page = await findCardArrivalPage(admin, { limit: 101, inverted: false });

    expect(page.map(({ node }) => [node.acceptedBy, node.batchId]).sort()).toEqual(
      [
        [A.id, OTHER_BATCH],
        [B.id, BATCH],
      ].sort(),
    );
    for (const { node } of page) expect(node.acceptedAt).toBeInstanceOf(Date);
    expect((await findCardArrivalCount(admin, undefined)).totalCount).toBe(2);
  });

  it('pages every card in any state, narrowed to one batch where named, and no address invitation', async () => {
    const OTHER_BATCH = '22222222-2222-4222-8222-222222222222';
    await mint([CARD, OTHER_CARD]);
    await mint(['cardtokenCCCCCCC'], LATER(), OTHER_BATCH);
    await cardAccept(B);
    await inviteIntoW({ token: 'fixture-token-w-listed' });
    const all = { limit: 101, inverted: false };

    const everything = await findCardPage(admin, undefined, all);
    const one = await findCardPage(admin, OTHER_BATCH, all);

    expect(everything).toHaveLength(3);
    expect(everything.every(({ node }) => node.kind === 'card')).toBe(true);
    expect(one.map(({ node }) => node.batchId)).toEqual([OTHER_BATCH]);
    expect((await findCardCount(admin, undefined, undefined)).totalCount).toBe(3);
    expect((await findCardCount(admin, OTHER_BATCH, undefined)).totalCount).toBe(1);
  });
});
