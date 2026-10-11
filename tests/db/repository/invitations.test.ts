import { createHash } from 'node:crypto';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  findInvitationByToken,
  findPendingInvitationsInWorkspace,
  findPendingSiteInvitations,
  withAudit,
  type AuditWriter,
  type InvitationRow,
  type SiteInvitationValues,
  type WorkspaceInvitationValues,
} from '@/db/repository';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { type Membership, assertMembership } from '@/modules/coven';
import { assertSiteAdmin } from '@/modules/identity';
import { A, B, D, E, asUser } from '../../support/as-user';
import type { SessionUser } from '../../support/types';
import { sql, useRawClient } from '../../support/db/probe-tables';
import type { InvitationOverrides } from './types';

useRawClient();

// MB.202: the invitation's named writes and finders, by tier
// (claude-docs/db/invitations.md). A `Membership` writes and revokes in its
// own workspace, a `SiteAdmin` on the site tier, where the workspace and the
// role are both null; the accept and the token read take no proof, since the
// invitee holds none yet, and match either tier. The token is what they
// speak: the insert stores its hash, and the read and the accept match one,
// so a dumped row's hash redeems nothing.

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

const inviteToSite = (values: InvitationOverrides = {}) =>
  withAudit(asUser(E), (write) =>
    write.insertInvitation(admin, { email: INVITED, token: TOKEN, ...values }),
  );

const acceptAs = (user: SessionUser, token = TOKEN) =>
  withAudit(asUser(user), (write) => write.acceptInvitation(token));

const revokeInWorkspace = (id: string, proof = () => inW) =>
  withAudit(asUser(A), (write) => write.revokeInvitation(proof(), id));

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
      email: INVITED,
      tokenHash: sha256(TOKEN),
      note: 'Takes over the vocabularies',
      createdBy: E.id,
    });
    expect(Object.values(await rowOf(inserted!.id))).not.toContain(TOKEN);
  });

  // The tier is the proof's, whatever a cast smuggled into the values.
  it('takes the tier from the proof alone', async () => {
    const [owners] = await withAudit(asUser(A), (write) =>
      write.insertInvitation(inW, {
        email: INVITED,
        role: 'viewer',
        token: TOKEN,
        workspaceId: WORKSPACE_X_ID,
      } as WorkspaceInvitationValues),
    );
    const [admins] = await withAudit(asUser(E), (write) =>
      write.insertInvitation(admin, {
        email: INVITED,
        token: OTHER_TOKEN,
        workspaceId: WORKSPACE_W_ID,
        role: 'member',
        acceptedBy: E.id,
      } as SiteInvitationValues),
    );

    expect(owners).toMatchObject({ workspaceId: WORKSPACE_W_ID, role: 'viewer' });
    expect(admins).toMatchObject({ workspaceId: null, role: null, acceptedBy: null });
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

  it('reads a workspace’s pending invitations and nothing else', async () => {
    const { pendingInW, pendingInX } = await everyKind();

    // Why X's row could have been read: it is pending, as W's is.
    expect(ids(await findPendingInvitationsInWorkspace(inX))).toEqual([pendingInX!.id]);
    expect(ids(await findPendingInvitationsInWorkspace(inW))).toEqual([pendingInW!.id]);
  });

  it('reads the site tier’s pending invitations and nothing else', async () => {
    const { pendingOnSite } = await everyKind();

    expect(await sql`select id from invitations where workspace_id is not null`).not.toEqual([]);
    expect(ids(await findPendingSiteInvitations(admin))).toEqual([pendingOnSite!.id]);
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
    ];

    expect(writes).toHaveLength(8);
  });
});
