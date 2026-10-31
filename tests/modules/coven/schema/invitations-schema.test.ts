import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import postgres from 'postgres';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import { AUDIT_COLUMNS, tableFacts } from '../../../support/db/table-metadata';
import type { AuditWriter } from '@/db/repository';
import type { NamedWrites } from '@/db/types';
import { FIXTURE_USERS, WORKSPACE_W_ID } from '@/db/seed/standard';
import type { Membership } from '@/modules/coven';
import { invitations } from '@/modules/coven/schema/invitations';
import type { SiteAdmin } from '@/modules/identity';

// One invitations table in two tiers, the shape `ingredients` has: a row naming a workspace and a role invites into that coven, and a row with neither is a site-tier invitation, which grants admin, as a null workspace is a compendium entry.
// The named writes are the only ones to reach it (claude-docs/design-decisions/mb.201-two-tier-invitations.md).

// DESIGN.md §5's column list, transcribed.
const OWN_COLUMNS = [
  'id',
  'workspace_id',
  'email',
  'role',
  'token_hash',
  'expires_at',
  'accepted_at',
  'accepted_by',
  'revoked_at',
  'declined_at',
  'note',
  'site_role',
  'kind',
  'batch_id',
  'position',
];

const TOKEN_HASH_INDEX = 'invitations_token_hash_unique';
const TIER_CHECK = 'invitations_tier';
const ROLE_CHECK = 'invitations_role_invitable';
const DECLINED_CHECK = 'invitations_declined_coven';
const ANSWERED_CHECK = 'invitations_answered_once';
const SITE_TIER_CHECK = 'invitations_site_role_tier';
const SITE_ROLE_CHECK = 'invitations_site_role_invitable';
const KIND_CHECK = 'invitations_kind_known';
const CARD_SHAPE_CHECK = 'invitations_kind_shape';

describe('invitations schema', () => {
  const { byName } = tableFacts(invitations);

  // The full six: an invitation is a record of someone's act, so withdrawing
  // one leaves a tombstone and the hash index below is partial.
  it('has DESIGN.md §5 columns and the full audit spread, and nothing else', () => {
    expect(Object.keys(byName).sort()).toEqual([...OWN_COLUMNS, ...AUDIT_COLUMNS].sort());
  });

  // No body runs: each `@ts-expect-error` fails `npm run typecheck` the moment the mark is lost or a generic method stops demanding `Generic`.
  // The row is what authorises a membership or a grant, so only the named writes may make or stamp one. The unscoped methods refuse the table for its `workspace_id` too;
  // the scoped and compendium-tier ones would take a nullable `workspace_id`, so there the mark alone refuses.
  it('carries the namedWrites mark, so every generic write refuses it at compile time', () => {
    // The mark itself, as a type: a table that lost it fails this assignment.
    const marked: NamedWrites = invitations;
    const id = FIXTURE_USERS.A.id;
    const where = eq(invitations.id, id);
    const values = { email: 'rowan@example.com', tokenHash: 'a'.repeat(64) };

    const writes = [
      (write: AuditWriter) =>
        // @ts-expect-error — no generic insert.
        write.insert(invitations, values),
      (write: AuditWriter) =>
        // @ts-expect-error — no generic update.
        write.update(invitations, { revokedAt: null }, where),
      (write: AuditWriter) =>
        // @ts-expect-error — nor by id.
        write.updateById(invitations, id, { acceptedBy: id }),
      (write: AuditWriter) =>
        // @ts-expect-error — no soft delete.
        write.softDelete(invitations, where),
      (write: AuditWriter) =>
        // @ts-expect-error — nor by ids.
        write.softDeleteByIds(invitations, [id]),
      (write: AuditWriter) =>
        // @ts-expect-error — no hard delete.
        write.delete(invitations, { id }),
      (write: AuditWriter, inW: Membership) =>
        // @ts-expect-error — the mark: no generic insert into a workspace.
        write.insertInWorkspace(inW, invitations, values),
      (write: AuditWriter, inW: Membership) =>
        // @ts-expect-error — the mark: no generic update in one.
        write.updateInWorkspace(inW, invitations, { revokedAt: null }, where),
      (write: AuditWriter, inW: Membership) =>
        // @ts-expect-error — the mark: nor by id.
        write.updateByIdInWorkspace(inW, invitations, id, { acceptedBy: id }),
      (write: AuditWriter, inW: Membership) =>
        // @ts-expect-error — the mark: no soft delete in one.
        write.softDeleteInWorkspace(inW, invitations, where),
      (write: AuditWriter, inW: Membership) =>
        // @ts-expect-error — the mark: nor by id.
        write.softDeleteByIdInWorkspace(inW, invitations, id),
      (write: AuditWriter, admin: SiteAdmin) =>
        // @ts-expect-error — the mark: no generic insert into the site tier.
        write.insertInCompendium(admin, invitations, values),
      (write: AuditWriter, admin: SiteAdmin) =>
        // @ts-expect-error — the mark: no update there.
        write.updateByIdInCompendium(admin, invitations, id, { acceptedBy: id }),
      (write: AuditWriter, admin: SiteAdmin) =>
        // @ts-expect-error — the mark: no soft delete there.
        write.softDeleteByIdInCompendium(admin, invitations, id),
    ];

    // And nothing at runtime: the cast adds no property for drizzle-kit to see.
    expect(marked.$writes).toBeUndefined();
    expect(writes).toHaveLength(14);
  });
});

// A owns W; E is the site admin.
const OWNER = FIXTURE_USERS.A.id;
const ADMIN = FIXTURE_USERS.E.id;
const COVEN = WORKSPACE_W_ID;

let sql: ReturnType<typeof postgres>;
useTestDatabase((client) => (sql = client));

// 64 hex characters, the shape of a sha-256 of a `crypto.randomBytes` token;
// nothing here generates one.
const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);

/** A workspace-tier invitation into W, by A. */
async function invite(
  role: string,
  { tokenHash = HASH_A, email = 'rowan@example.com' } = {},
): Promise<string> {
  const [inserted] = await sql`
    insert into invitations (workspace_id, email, role, token_hash, created_by, updated_by)
    values (${COVEN}, ${email}, ${role}::workspace_role, ${tokenHash}, ${OWNER}, ${OWNER})
    returning id
  `;
  return inserted.id as string;
}

/** A site-tier invitation, by E: no workspace and no coven role, and the site role it grants. */
async function inviteToSite({ tokenHash = HASH_A, siteRole = 'admin' } = {}) {
  const [inserted] = await sql`
    insert into invitations (email, token_hash, site_role, created_by, updated_by)
    values ('rowan@example.com', ${tokenHash}, ${siteRole}::user_role, ${ADMIN}, ${ADMIN})
    returning id
  `;
  return inserted.id as string;
}

describe('invitations table', () => {
  beforeEach(async () => {
    await sql`truncate card_invitation_attempts, invitations`;
  });

  describe('the tier', () => {
    it('refuses a workspace without a role', async () => {
      const error = await failureOf(sql`
        insert into invitations (workspace_id, email, token_hash, created_by, updated_by)
        values (${COVEN}, 'rowan@example.com', ${HASH_A}, ${OWNER}, ${OWNER})
      `);

      // 23514 is check_violation, named: this constraint refused, not something earlier.
      expect(error.code).toBe('23514');
      expect(error.constraint_name).toBe(TIER_CHECK);
    });

    it('refuses a role without a workspace', async () => {
      const error = await failureOf(sql`
        insert into invitations (email, role, site_role, token_hash, created_by, updated_by)
        values ('rowan@example.com', 'member', 'admin', ${HASH_A}, ${ADMIN}, ${ADMIN})
      `);

      expect(error.code).toBe('23514');
      expect(error.constraint_name).toBe(TIER_CHECK);
    });

    // Why the two refusals above could have succeeded: each column alone is
    // nullable, and a row with both, or with neither, is well-formed.
    it('accepts a null pair, the site tier', async () => {
      await expect(inviteToSite()).resolves.toBeDefined();
    });
  });

  // A site invitation names the site role it grants, curator or
  // admin, and a coven invitation names none.
  describe('the site role', () => {
    it('refuses a site-tier invitation that names no site role', async () => {
      const error = await failureOf(sql`
        insert into invitations (email, token_hash, created_by, updated_by)
        values ('rowan@example.com', ${HASH_A}, ${ADMIN}, ${ADMIN})
      `);

      expect(error.code).toBe('23514');
      expect(error.constraint_name).toBe(SITE_TIER_CHECK);
    });

    it('refuses a coven invitation that names a site role', async () => {
      const error = await failureOf(sql`
        insert into invitations (workspace_id, email, role, site_role, token_hash, created_by, updated_by)
        values (${COVEN}, 'rowan@example.com', 'member', 'admin', ${HASH_A}, ${OWNER}, ${OWNER})
      `);

      expect(error.code).toBe('23514');
      expect(error.constraint_name).toBe(SITE_TIER_CHECK);
    });

    it('refuses user, which grants nothing', async () => {
      const error = await failureOf(inviteToSite({ siteRole: 'user' }));

      expect(error.code).toBe('23514');
      expect(error.constraint_name).toBe(SITE_ROLE_CHECK);
    });

    // Why the refusals above could have succeeded: the column is nullable and
    // the enum admits `user`, and a coven invitation without one is well-formed.
    it('accepts curator and admin on the site tier, and none on a coven invitation', async () => {
      await inviteToSite({ siteRole: 'curator' });
      await inviteToSite({ siteRole: 'admin', tokenHash: HASH_B });
      await invite('member', { tokenHash: 'c'.repeat(64) });

      const rows = await sql`select site_role::text from invitations order by site_role nulls last`;
      expect(rows.map((row) => row.site_role)).toEqual(['admin', 'curator', null]);
    });
  });

  // A printed card is a third shape of the same table: bound to no address, coven or site role, so one token still resolves to one row.
  describe('the kind', () => {
    const BATCH = '3f0c6a52-9b1e-4a57-8d0e-5f6a7b8c9d01';

    it('defaults to an address invitation and refuses an unknown kind', async () => {
      const id = await invite('member');
      const [row] = await sql`select kind, batch_id from invitations where id = ${id}`;
      expect(row?.kind).toBe('address');
      expect(row?.batch_id).toBeNull();

      const error = await failureOf(sql`
        insert into invitations (kind, token_hash, created_by, updated_by)
        values ('postcard', ${HASH_B}, ${ADMIN}, ${ADMIN})
      `);
      expect(error.code).toBe('23514');
      expect(error.constraint_name).toBe(KIND_CHECK);
    });

    it('refuses an address invitation with no email, on either tier', async () => {
      const coven = await failureOf(sql`
        insert into invitations (workspace_id, role, token_hash, created_by, updated_by)
        values (${COVEN}, 'member', ${HASH_A}, ${OWNER}, ${OWNER})
      `);
      const site = await failureOf(sql`
        insert into invitations (site_role, token_hash, created_by, updated_by)
        values ('admin', ${HASH_B}, ${ADMIN}, ${ADMIN})
      `);

      expect(coven.constraint_name).toBe(CARD_SHAPE_CHECK);
      expect(site.constraint_name).toBe(CARD_SHAPE_CHECK);
    });

    // Each case gives a card the one extra column, plus the partner the tier check needs, so only the card shape can refuse it.
    it.each([
      ['an email', 'email', "'rowan@example.com'"],
      ['a workspace', 'workspace_id, role', `'${COVEN}', 'member'`],
      ['a role', 'workspace_id, role', `'${COVEN}', 'member'`],
      ['a site role', 'site_role', "'admin'"],
    ])('refuses a card with %s', async (_label, columns, values) => {
      const error = await failureOf(
        sql.unsafe(`
          insert into invitations (kind, token_hash, created_by, updated_by, ${columns})
          values ('card', '${HASH_A}', '${ADMIN}', '${ADMIN}', ${values})
        `),
      );

      expect(error.code).toBe('23514');
      expect(error.constraint_name).toBe(CARD_SHAPE_CHECK);
    });

    // Why the refusals above could have succeeded: every column a card must leave null is nullable for an address row too.
    it('accepts a card with none of them, and keeps its batch', async () => {
      await sql`
        insert into invitations (kind, batch_id, token_hash, created_by, updated_by)
        values ('card', ${BATCH}, ${HASH_A}, ${ADMIN}, ${ADMIN})
      `;

      const [row] =
        await sql`select kind, email, workspace_id, role, site_role, batch_id from invitations`;
      expect(row).toMatchObject({
        kind: 'card',
        email: null,
        workspace_id: null,
        role: null,
        site_role: null,
        batch_id: BATCH,
      });
    });
  });

  describe('owner is not invitable', () => {
    it('rejects an invitation with role owner', async () => {
      const error = await failureOf(invite('owner'));

      expect(error.code).toBe('23514');
      expect(error.constraint_name).toBe(ROLE_CHECK);
    });

    // Why the rejection above could have succeeded: the row is well-formed and
    // the enum admits `owner`. Drop the CHECK and these stay green while the
    // one above reddens.
    it('accepts viewer and member', async () => {
      await invite('viewer');
      await invite('member', { tokenHash: HASH_B });

      const rows = await sql`select role::text from invitations order by role`;
      expect(rows.map((row) => row.role)).toEqual(['member', 'viewer']);
    });
  });

  // A decline is the invitee's answer to a coven invitation. An admin
  // invitation is accepted by its link alone and never listed to its invitee,
  // and one invitation is answered once.
  describe('the answer', () => {
    it('refuses a declined site-tier invitation, and accepts a declined coven one', async () => {
      const site = await inviteToSite();
      const coven = await invite('member', { tokenHash: HASH_B });

      const error = await failureOf(
        sql`update invitations set declined_at = now() where id = ${site}`,
      );
      expect(error.code).toBe('23514');
      expect(error.constraint_name).toBe(DECLINED_CHECK);

      // Why it could have been refused: the same update on a coven invitation holds.
      await sql`update invitations set declined_at = now() where id = ${coven}`;
      const [row] = await sql`select declined_at from invitations where id = ${coven}`;
      expect(row?.declined_at).toBeInstanceOf(Date);
    });

    it('refuses a row that is both accepted and declined, from either side', async () => {
      const accepted = await invite('member');
      await sql`update invitations set accepted_at = now(), accepted_by = ${OWNER} where id = ${accepted}`;
      const declined = await invite('member', { tokenHash: HASH_B });
      await sql`update invitations set declined_at = now() where id = ${declined}`;

      const declineAccepted = await failureOf(
        sql`update invitations set declined_at = now() where id = ${accepted}`,
      );
      const acceptDeclined = await failureOf(
        sql`update invitations set accepted_at = now(), accepted_by = ${OWNER} where id = ${declined}`,
      );

      expect(declineAccepted.constraint_name).toBe(ANSWERED_CHECK);
      expect(acceptDeclined.constraint_name).toBe(ANSWERED_CHECK);
      // Why they could have succeeded: each stamp alone is accepted.
      const rows =
        await sql`select id from invitations where accepted_at is not null or declined_at is not null`;
      expect(rows).toHaveLength(2);
    });
  });

  describe('expiry', () => {
    it('defaults to seven days out when the caller names none', async () => {
      const id = await invite('member');

      const [row] = await sql`
        select extract(epoch from (expires_at - now())) as remaining
        from invitations where id = ${id}
      `;

      // A second of slack covers the gap between the two `now()`s.
      expect(Number(row.remaining)).toBeCloseTo(7 * 24 * 60 * 60, -1);
    });
  });

  describe('lookup by token hash', () => {
    // Across the tiers too: a token names one invitation, whichever tier.
    it('refuses two live invitations sharing one hash, on either tier', async () => {
      await invite('member');

      const error = await failureOf(inviteToSite());

      // 23505: one hash must resolve to one invitation, or redeeming is a coin toss.
      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(TOKEN_HASH_INDEX);
    });
  });
});
