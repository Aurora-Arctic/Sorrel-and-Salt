import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import postgres from 'postgres';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import { statementsOfMigrationContaining } from '../../../support/db/migrations';
import { AUDIT_COLUMNS, tableFacts } from '../../../support/db/table-metadata';
import type { AuditWriter } from '@/db/repository';
import type { NamedWrites } from '@/db/types';
import { FIXTURE_USERS, WORKSPACE_W_ID } from '@/db/seed/standard';
import type { Membership } from '@/modules/coven';
import { invitations } from '@/modules/coven/schema/invitations';
import { workspaces } from '@/modules/coven/schema/workspaces';
import type { SiteAdmin } from '@/modules/identity';
import { users } from '@/modules/identity/schema/users';

// MB.201: one invitations table in two tiers, the shape `ingredients` has. A
// row naming a workspace and a role invites into that coven; a row with
// neither is a site-tier invitation, which grants admin, as a null workspace
// is a compendium entry. The table task: the old two tables stay until MB.203,
// and MB.202's named writes are the first to reach this one
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
const WORKSPACE_FK = 'invitations_workspace_id_workspaces_id_fk';
const ACCEPTED_BY_FK = 'invitations_accepted_by_users_id_fk';

describe('invitations schema', () => {
  const { byName, byIndexName, checks, foreignKeyByColumn, nonAuditForeignKeys } =
    tableFacts(invitations);

  // The full six: an invitation is a record of someone's act, so withdrawing
  // one leaves a tombstone and the hash index below is partial.
  it('has DESIGN.md §5 columns and the full audit spread, and nothing else', () => {
    expect(Object.keys(byName).sort()).toEqual([...OWN_COLUMNS, ...AUDIT_COLUMNS].sort());
  });

  // As a property of the table: a later `token`/`plaintext_token` column
  // reddens this. A leaked row cannot be redeemed (story 4).
  it('holds the token only as a hash', () => {
    expect(Object.keys(byName).filter((name) => name.includes('token'))).toEqual(['token_hash']);
  });

  it('requires an email, a hash and an expiry', () => {
    for (const column of ['email', 'token_hash', 'expires_at']) {
      expect(byName[column].notNull).toBe(true);
    }
  });

  // The tier pair is nullable, each column alone: the CHECK below pairs them.
  // Null on a pending invitation: the state that tells expired from revoked
  // from used. The note is optional on both tiers.
  it('leaves the tier pair, acceptance, revocation and the note nullable', () => {
    for (const column of [
      'workspace_id',
      'role',
      'accepted_at',
      'accepted_by',
      'revoked_at',
      'note',
    ]) {
      expect(byName[column].notNull).toBe(false);
    }
  });

  it('carries a surrogate id as its primary key', () => {
    expect(byName.id.primary).toBe(true);
    expect(byName.id.hasDefault).toBe(true);
  });

  // `email` is not one: an invitee may have no account yet.
  it('points at the workspace being joined and the user who accepted, and nothing else of its own', () => {
    expect(foreignKeyByColumn.workspace_id.foreignTable).toBe(workspaces);
    expect(foreignKeyByColumn.workspace_id.foreignColumnName).toBe('id');
    expect(foreignKeyByColumn.workspace_id.name).toBe(WORKSPACE_FK);
    expect(foreignKeyByColumn.accepted_by.foreignTable).toBe(users);
    expect(foreignKeyByColumn.accepted_by.foreignColumnName).toBe('id');
    expect(foreignKeyByColumn.accepted_by.name).toBe(ACCEPTED_BY_FK);
    expect(nonAuditForeignKeys.map((fk) => fk.column).sort()).toEqual([
      'accepted_by',
      'workspace_id',
    ]);
  });

  it('gives the expiry a default, so no caller can forget one', () => {
    expect(byName.expires_at.hasDefault).toBe(true);
  });

  it('declares the tier check and the role check, and one index, unique on the token hash', () => {
    expect(checks.map((check) => check.name).sort()).toEqual([ROLE_CHECK, TIER_CHECK].sort());
    expect(Object.keys(byIndexName)).toEqual([TOKEN_HASH_INDEX]);
    expect(byIndexName[TOKEN_HASH_INDEX].config.unique).toBe(true);
    expect(byIndexName[TOKEN_HASH_INDEX].config.where).toBeDefined();
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

// A owns W; B is the one who accepts; E is the site admin.
const OWNER = FIXTURE_USERS.A.id;
const INVITEE = FIXTURE_USERS.B.id;
const ADMIN = FIXTURE_USERS.E.id;
const COVEN = WORKSPACE_W_ID;
const ABSENT = '99999999-9999-9999-9999-999999999999';

let sql: ReturnType<typeof postgres>;
const catalogue = useTestDatabase((client) => (sql = client));

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
async function inviteToSite({ tokenHash = HASH_A, note = null as string | null } = {}) {
  const [inserted] = await sql`
    insert into invitations (email, token_hash, note, created_by, updated_by)
    values ('rowan@example.com', ${tokenHash}, ${note}, ${ADMIN}, ${ADMIN})
    returning id
  `;
  return inserted.id as string;
}

// Before any block below empties the table, so it reads the template as cloned.
describe('the seeded database', () => {
  it('holds no invitation', async () => {
    expect(await sql`select id from invitations`).toHaveLength(0);
  });
});

describe('invitations table', () => {
  beforeEach(async () => {
    await sql`truncate invitations`;
  });

  it('carries §5’s columns beside the six audit ones', async () => {
    expect(await catalogue.columnNames('invitations')).toEqual(
      [...OWN_COLUMNS, ...AUDIT_COLUMNS].sort(),
    );
  });

  // Against the shipped DDL rather than the Drizzle object: a dumped row is not a credential.
  it('has no column that could hold a plaintext token', async () => {
    const stored = await catalogue.columnNames('invitations');

    expect(stored.filter((name) => name.includes('token'))).toEqual(['token_hash']);
  });

  describe('the tier', () => {
    it('ships both checks as §5 states them', async () => {
      const rows = await sql<{ name: string; definition: string }[]>`
        select conname as name, pg_get_constraintdef(oid) as definition from pg_constraint
        where conrelid = 'invitations'::regclass and contype = 'c'
        order by conname
      `;

      expect(rows).toEqual([
        {
          name: ROLE_CHECK,
          definition:
            "CHECK (((role IS NULL) OR (role = ANY (ARRAY['viewer'::workspace_role, 'member'::workspace_role]))))",
        },
        { name: TIER_CHECK, definition: 'CHECK (((workspace_id IS NULL) = (role IS NULL)))' },
      ]);
    });

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
    it('accepts viewer', async () => {
      await expect(invite('viewer')).resolves.toBeDefined();
    });

    it('accepts member', async () => {
      await expect(invite('member')).resolves.toBeDefined();
    });

    it('rejects a role no workspace role names at all', async () => {
      const error = await failureOf(invite('admin'));

      // 22P02 is invalid_text_representation: the enum refusing the cast before the CHECK.
      expect(error.code).toBe('22P02');
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

    it('is not nullable, so no row outlives every clock', async () => {
      const id = await inviteToSite();

      const error = await failureOf(sql`
        update invitations set expires_at = null where id = ${id}
      `);

      // 23502 is not_null_violation on that exact column.
      expect(error.code).toBe('23502');
      expect(error.column_name).toBe('expires_at');
    });
  });

  describe('lookup by token hash', () => {
    it('indexes the hash uniquely, among live rows only', async () => {
      const index = await catalogue.indexRow('invitations', TOKEN_HASH_INDEX);

      expect(index?.unique).toBe(true);
      expect(index?.predicate).toBe('(deleted_at IS NULL)');
      expect(index?.definition).toContain('USING btree (token_hash)');
    });

    // Across the tiers too: a token names one invitation, whichever tier.
    it('refuses two live invitations sharing one hash, on either tier', async () => {
      await invite('member');

      const error = await failureOf(inviteToSite());

      // 23505: one hash must resolve to one invitation, or redeeming is a coin toss.
      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(TOKEN_HASH_INDEX);
    });

    it('lets two invitations differ by hash alone', async () => {
      await invite('member');

      await expect(inviteToSite({ tokenHash: HASH_B })).resolves.toBeDefined();
    });

    it('stops a soft-deleted row from reserving its hash', async () => {
      const id = await invite('member');
      await sql`
        update invitations set deleted_at = now(), deleted_by = ${OWNER} where id = ${id}
      `;

      await expect(invite('member')).resolves.not.toBe(id);
    });
  });

  describe('an invitation belongs to a real workspace and a real accepter', () => {
    it('refuses a workspace id no workspace holds', async () => {
      const error = await failureOf(sql`
        insert into invitations (workspace_id, email, role, token_hash, created_by, updated_by)
        values (${ABSENT}, 'rowan@example.com', 'member', ${HASH_A}, ${OWNER}, ${OWNER})
      `);

      // 23503 is foreign_key_violation.
      expect(error.code).toBe('23503');
      expect(error.constraint_name).toBe(WORKSPACE_FK);
    });

    it('refuses an accepter no user holds', async () => {
      const id = await invite('member');

      const error = await failureOf(sql`
        update invitations set accepted_at = now(), accepted_by = ${ABSENT} where id = ${id}
      `);

      expect(error.code).toBe('23503');
      expect(error.constraint_name).toBe(ACCEPTED_BY_FK);
    });

    it('records who accepted, and when', async () => {
      const id = await invite('member');

      await sql`
        update invitations set accepted_at = now(), accepted_by = ${INVITEE} where id = ${id}
      `;

      const [row] = await sql`
        select accepted_by, accepted_at, revoked_at from invitations where id = ${id}
      `;
      expect(row.accepted_by).toBe(INVITEE);
      expect(row.accepted_at).toBeInstanceOf(Date);
      expect(row.revoked_at).toBeNull();
    });
  });

  it('refuses an invitation carrying no email, or no token hash', async () => {
    const noEmail = await failureOf(sql`
      insert into invitations (token_hash, created_by, updated_by)
      values (${HASH_A}, ${ADMIN}, ${ADMIN})
    `);
    const noHash = await failureOf(sql`
      insert into invitations (email, created_by, updated_by)
      values ('rowan@example.com', ${ADMIN}, ${ADMIN})
    `);

    expect([noEmail.code, noHash.code]).toEqual(['23502', '23502']);
    expect([noEmail.column_name, noHash.column_name]).toEqual(['email', 'token_hash']);
  });
});

// The migration's copy of both old tables, re-run here from its own SQL:
// with ids and stamps, so MB.203's final sweep can skip what is already
// copied. Production holds no row in either; staging may.
describe('the copy of workspace_invitations and admin_invitations', () => {
  const WORKSPACE_ROW = '11111111-1111-4111-8111-111111111111';
  const ADMIN_ROW = '22222222-2222-4222-8222-222222222222';
  const CREATED = new Date('2026-09-01T10:00:00Z');
  const UPDATED = new Date('2026-09-02T10:00:00Z');
  const EXPIRES = new Date('2026-09-08T10:00:00Z');

  beforeEach(async () => {
    await sql`truncate invitations, workspace_invitations, admin_invitations`;
  });

  // The `set_updated_at` trigger fires on update only, so the stamps the rows
  // are inserted with are the stamps they keep.
  async function seedOldTables() {
    await sql`
      insert into workspace_invitations
        (id, workspace_id, email, role, token_hash, expires_at, accepted_at, accepted_by,
         created_at, created_by, updated_at, updated_by)
      values (${WORKSPACE_ROW}, ${COVEN}, 'rowan@example.com', 'viewer', ${HASH_A}, ${EXPIRES},
              ${UPDATED}, ${INVITEE}, ${CREATED}, ${OWNER}, ${UPDATED}, ${INVITEE})
    `;
    await sql`
      insert into admin_invitations
        (id, email, token_hash, expires_at, revoked_at, note,
         created_at, created_by, updated_at, updated_by, deleted_at, deleted_by)
      values (${ADMIN_ROW}, 'ash@example.com', ${HASH_B}, ${EXPIRES}, ${UPDATED},
              'Takes over the vocabularies', ${CREATED}, ${ADMIN}, ${UPDATED}, ${ADMIN},
              ${UPDATED}, ${ADMIN})
    `;
  }

  async function runCopy() {
    const copy = statementsOfMigrationContaining('INSERT INTO "invitations"').filter((statement) =>
      /^insert\b/i.test(statement),
    );
    expect(copy).toHaveLength(1);
    await sql.unsafe(copy[0]);
  }

  it('lands a row of each with its id, stamps, tier and note', async () => {
    await seedOldTables();

    await runCopy();

    const rows = await sql`select * from invitations order by id`;
    expect(rows).toEqual([
      {
        id: WORKSPACE_ROW,
        workspace_id: COVEN,
        email: 'rowan@example.com',
        role: 'viewer',
        token_hash: HASH_A,
        expires_at: EXPIRES,
        accepted_at: UPDATED,
        accepted_by: INVITEE,
        revoked_at: null,
        note: null,
        created_at: CREATED,
        created_by: OWNER,
        updated_at: UPDATED,
        updated_by: INVITEE,
        deleted_at: null,
        deleted_by: null,
      },
      {
        id: ADMIN_ROW,
        workspace_id: null,
        email: 'ash@example.com',
        role: null,
        token_hash: HASH_B,
        expires_at: EXPIRES,
        accepted_at: null,
        accepted_by: null,
        revoked_at: UPDATED,
        note: 'Takes over the vocabularies',
        created_at: CREATED,
        created_by: ADMIN,
        updated_at: UPDATED,
        updated_by: ADMIN,
        deleted_at: UPDATED,
        deleted_by: ADMIN,
      },
    ]);
  });

  it('copies nothing from two empty tables', async () => {
    await runCopy();

    expect(await sql`select id from invitations`).toEqual([]);
  });
});
