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

// MB.201: one invitations table in two tiers, the shape `ingredients` has. A
// row naming a workspace and a role invites into that coven; a row with
// neither is a site-tier invitation, which grants admin, as a null workspace
// is a compendium entry. MB.202's named writes are the only ones to reach it
// (claude-docs/design-decisions/mb.201-two-tier-invitations.md).

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
  'note',
];

const TOKEN_HASH_INDEX = 'invitations_token_hash_unique';
const TIER_CHECK = 'invitations_tier';
const ROLE_CHECK = 'invitations_role_invitable';

describe('invitations schema', () => {
  const { byName } = tableFacts(invitations);

  // The full six: an invitation is a record of someone's act, so withdrawing
  // one leaves a tombstone and the hash index below is partial.
  it('has DESIGN.md §5 columns and the full audit spread, and nothing else', () => {
    expect(Object.keys(byName).sort()).toEqual([...OWN_COLUMNS, ...AUDIT_COLUMNS].sort());
  });

  // No body runs: each `@ts-expect-error` fails `npm run typecheck` the
  // moment the mark is lost or a generic method stops demanding `Generic`.
  // The row is what authorises a membership or a grant, so only MB.202's
  // named writes may make or stamp one. The unscoped methods refuse the table
  // for its `workspace_id` too; the scoped and compendium-tier ones would take
  // a nullable `workspace_id`, so there the mark alone refuses.
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

/** A site-tier invitation, by E: no workspace and no role. */
async function inviteToSite({ tokenHash = HASH_A } = {}) {
  const [inserted] = await sql`
    insert into invitations (email, token_hash, created_by, updated_by)
    values ('rowan@example.com', ${tokenHash}, ${ADMIN}, ${ADMIN})
    returning id
  `;
  return inserted.id as string;
}

describe('invitations table', () => {
  beforeEach(async () => {
    await sql`truncate invitations`;
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
        insert into invitations (email, role, token_hash, created_by, updated_by)
        values ('rowan@example.com', 'member', ${HASH_A}, ${ADMIN}, ${ADMIN})
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
