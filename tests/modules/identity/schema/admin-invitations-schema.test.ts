import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import postgres from 'postgres';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import { AUDIT_COLUMNS, tableFacts } from '../../../support/db/table-metadata';
import { A, B, E, asUser } from '../../../support/as-user';
import type { SessionUser } from '../../../support/types';
import { findAdminInvitationByToken, withAudit, type AuditWriter } from '@/db/repository';
import { assertSiteAdmin } from '@/modules/identity';
import { adminInvitations } from '@/modules/identity/schema/admin-invitations';
import { users } from '@/modules/identity/schema/users';

// MB.69: story 62's table half. An admin invitation is shaped like a
// workspace invitation without the workspace or the role: only the token's
// hash is stored, and it expires in seven days. The table task: MB.70's
// service is the first to write it
// (claude-docs/design-decisions/mb.61-email-verification-and-delivery.md,
// "The admin invitation (story 62)").

// DESIGN.md §5's column list, transcribed.
const OWN_COLUMNS = [
  'id',
  'email',
  'token_hash',
  'expires_at',
  'accepted_at',
  'accepted_by',
  'revoked_at',
  'note',
];

const TOKEN_HASH_INDEX = 'admin_invitations_token_hash_unique';
const ACCEPTED_BY_FK = 'admin_invitations_accepted_by_users_id_fk';

describe('admin_invitations schema', () => {
  const { byName, byIndexName, checks, foreignKeyByColumn, nonAuditForeignKeys } =
    tableFacts(adminInvitations);

  it('has DESIGN.md §5 columns and the full audit spread, and nothing else', () => {
    expect(Object.keys(byName).sort()).toEqual([...OWN_COLUMNS, ...AUDIT_COLUMNS].sort());
  });

  // As a property of the table: a later `token`/`plaintext_token` column
  // reddens this. A leaked row cannot be redeemed.
  it('holds the token only as a hash', () => {
    expect(Object.keys(byName).filter((name) => name.includes('token'))).toEqual(['token_hash']);
  });

  it('requires an email, a hash and an expiry', () => {
    for (const column of ['email', 'token_hash', 'expires_at']) {
      expect(byName[column].notNull).toBe(true);
    }
  });

  // Null on a pending invitation: the state that tells expired from revoked
  // from used. The note is optional, as the role ledger's is.
  it('leaves acceptance, revocation and the note nullable', () => {
    for (const column of ['accepted_at', 'accepted_by', 'revoked_at', 'note']) {
      expect(byName[column].notNull).toBe(false);
    }
  });

  it('carries a surrogate id as its primary key', () => {
    expect(byName.id.primary).toBe(true);
    expect(byName.id.hasDefault).toBe(true);
  });

  // `email` is not one: an invitee may have no account yet.
  it('points at the user who accepted, and at nothing else of its own', () => {
    expect(foreignKeyByColumn.accepted_by.foreignTable).toBe(users);
    expect(foreignKeyByColumn.accepted_by.foreignColumnName).toBe('id');
    expect(foreignKeyByColumn.accepted_by.name).toBe(ACCEPTED_BY_FK);
    expect(nonAuditForeignKeys.map((fk) => fk.column)).toEqual(['accepted_by']);
  });

  it('gives the expiry a default, so no caller can forget one', () => {
    expect(byName.expires_at.hasDefault).toBe(true);
  });

  it('declares exactly one index, unique on the token hash, and no check', () => {
    expect(Object.keys(byIndexName)).toEqual([TOKEN_HASH_INDEX]);
    expect(byIndexName[TOKEN_HASH_INDEX].config.unique).toBe(true);
    expect(byIndexName[TOKEN_HASH_INDEX].config.where).toBeDefined();
    expect(checks).toEqual([]);
  });
});

let sql: ReturnType<typeof postgres>;
const catalogue = useTestDatabase((client) => (sql = client));

const ADMIN = E.id;
const ABSENT = '99999999-9999-9999-9999-999999999999';

// 64 hex characters, the shape of a sha-256 of a `crypto.randomBytes` token;
// nothing here generates one.
const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);

async function invite({ tokenHash = HASH_A, email = 'rowan@example.com' } = {}): Promise<string> {
  const [inserted] = await sql`
    insert into admin_invitations (email, token_hash, created_by, updated_by)
    values (${email}, ${tokenHash}, ${ADMIN}, ${ADMIN})
    returning id
  `;
  return inserted.id as string;
}

async function emptied(): Promise<void> {
  await sql`truncate admin_invitations`;
}

// Before any block below empties the table, so it reads the template as cloned.
describe('the seeded database', () => {
  it('holds no admin invitation', async () => {
    expect(await sql`select id from admin_invitations`).toHaveLength(0);
  });
});

describe('admin_invitations table', () => {
  beforeEach(emptied);

  it('carries §5’s columns beside the six audit ones', async () => {
    expect(await catalogue.columnNames('admin_invitations')).toEqual(
      [...OWN_COLUMNS, ...AUDIT_COLUMNS].sort(),
    );
  });

  // Against the shipped DDL rather than the Drizzle object: a dumped row is not a credential.
  it('has no column that could hold a plaintext token', async () => {
    const stored = await catalogue.columnNames('admin_invitations');

    expect(stored.filter((name) => name.includes('token'))).toEqual(['token_hash']);
  });

  describe('expiry', () => {
    it('defaults to seven days out when the caller names none', async () => {
      const id = await invite();

      const [row] = await sql`
        select extract(epoch from (expires_at - now())) as remaining
        from admin_invitations where id = ${id}
      `;

      // A second of slack covers the gap between the two `now()`s.
      expect(Number(row.remaining)).toBeCloseTo(7 * 24 * 60 * 60, -1);
    });

    it('is not nullable, so no row outlives every clock', async () => {
      const id = await invite();

      const error = await failureOf(sql`
        update admin_invitations set expires_at = null where id = ${id}
      `);

      // 23502 is not_null_violation on that exact column.
      expect(error.code).toBe('23502');
      expect(error.column_name).toBe('expires_at');
    });
  });

  describe('lookup by token hash', () => {
    it('indexes the hash uniquely, among live rows only', async () => {
      const index = await catalogue.indexRow('admin_invitations', TOKEN_HASH_INDEX);

      expect(index?.unique).toBe(true);
      expect(index?.predicate).toBe('(deleted_at IS NULL)');
      expect(index?.definition).toContain('USING btree (token_hash)');
    });

    it('refuses two live invitations sharing one hash', async () => {
      await invite();

      const error = await failureOf(invite({ email: 'ash@example.com' }));

      // 23505: one hash must resolve to one invitation, or redeeming is a coin toss.
      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(TOKEN_HASH_INDEX);
    });

    // Why the refusal above could have succeeded: the rows differ by hash alone.
    it('lets two invitations differ by hash alone', async () => {
      await invite();

      await expect(invite({ tokenHash: HASH_B })).resolves.toBeDefined();
    });

    it('stops a soft-deleted row from reserving its hash', async () => {
      const id = await invite();
      await sql`
        update admin_invitations set deleted_at = now(), deleted_by = ${ADMIN} where id = ${id}
      `;

      await expect(invite()).resolves.not.toBe(id);
    });
  });

  it('refuses an accepter no user holds', async () => {
    const id = await invite();

    const error = await failureOf(sql`
      update admin_invitations set accepted_at = now(), accepted_by = ${ABSENT} where id = ${id}
    `);

    // 23503 is foreign_key_violation.
    expect(error.code).toBe('23503');
    expect(error.constraint_name).toBe(ACCEPTED_BY_FK);
  });

  it('refuses an invitation carrying no email, or no token hash', async () => {
    const noEmail = await failureOf(sql`
      insert into admin_invitations (token_hash, created_by, updated_by)
      values (${HASH_A}, ${ADMIN}, ${ADMIN})
    `);
    const noHash = await failureOf(sql`
      insert into admin_invitations (email, created_by, updated_by)
      values ('rowan@example.com', ${ADMIN}, ${ADMIN})
    `);

    expect([noEmail.code, noHash.code]).toEqual(['23502', '23502']);
    expect([noEmail.column_name, noHash.column_name]).toEqual(['email', 'token_hash']);
  });
});

// The repository's surface is four named calls, and the token is what they
// speak: the insert stores its hash, and the read and the accept match one,
// so a dumped row's hash redeems nothing. The insert and the revoke take the
// `SiteAdmin` proof, since only an admin invites or withdraws; the accept and
// the read take none, since the invitee is not yet an admin, and the accept
// matches only the user holding the invited address, verified. Every generic
// write is refused the table at compile time.
describe('the repository', () => {
  const admin = assertSiteAdmin(asUser(E));

  // Fixed strings, the shape of a `crypto.randomBytes` token in base64url.
  const TOKEN = 'fixture-token-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  const OTHER_TOKEN = 'fixture-token-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
  // A's address in another case: the match is case-insensitive.
  const INVITED = A.email.toUpperCase();

  // Computed here rather than imported, so the test does not grade the
  // repository's hash against itself.
  const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

  const insertAs = (values: { token?: string; expiresAt?: Date; note?: string } = {}) =>
    withAudit(asUser(E), (write) =>
      write.insertAdminInvitation(admin, { email: INVITED, token: TOKEN, ...values }),
    );

  const acceptAs = (user: SessionUser, token = TOKEN) =>
    withAudit(asUser(user), (write) => write.acceptAdminInvitation(token));

  beforeEach(async () => {
    await emptied();
    await sql`update users set email_verified = true where id in (${A.id}, ${B.id})`;
  });

  it('inserts an invitation stamped from the session, pending, storing the token as its hash', async () => {
    const [inserted] = await insertAs({ note: 'Takes over the vocabularies' });

    expect(inserted).toMatchObject({
      email: INVITED,
      tokenHash: sha256(TOKEN),
      note: 'Takes over the vocabularies',
      acceptedAt: null,
      acceptedBy: null,
      revokedAt: null,
      createdBy: ADMIN,
      updatedBy: ADMIN,
    });
    const [stored] = await sql`select * from admin_invitations`;
    expect(Object.values(stored!)).not.toContain(TOKEN);
  });

  it('finds the invitation by its token', async () => {
    const [inserted] = await insertAs();

    expect(await findAdminInvitationByToken(TOKEN)).toEqual(inserted);
  });

  // A leaked row's hash, passed where a token goes, is hashed again and so
  // matches nothing; the found case above is the same row.
  it('finds nothing for an unknown token, for the stored hash, or for a soft-deleted row', async () => {
    const [inserted] = await insertAs();

    expect(await findAdminInvitationByToken(OTHER_TOKEN)).toBeUndefined();
    expect(await findAdminInvitationByToken(inserted!.tokenHash)).toBeUndefined();

    await sql`
      update admin_invitations set deleted_at = now(), deleted_by = ${ADMIN}
      where id = ${inserted?.id}
    `;
    expect(await findAdminInvitationByToken(TOKEN)).toBeUndefined();
  });

  // MB.70 tells expired, revoked and accepted apart, each with its own
  // message, so the read hands back a dead invitation rather than hiding it.
  it('finds an expired, a revoked and an accepted invitation alike', async () => {
    const [expired] = await insertAs({ expiresAt: new Date(Date.now() - 1000) });
    const [revoked] = await insertAs({ token: OTHER_TOKEN });
    await withAudit(asUser(E), (write) => write.revokeAdminInvitation(admin, revoked!.id));

    expect(await findAdminInvitationByToken(TOKEN)).toMatchObject({ id: expired?.id });
    expect(await findAdminInvitationByToken(OTHER_TOKEN)).toMatchObject({ id: revoked?.id });
  });

  // A is no admin: the accepter is whoever the session names.
  it('accepts for the verified holder of the invited address, stamped from the session', async () => {
    const [inserted] = await insertAs();

    const accepted = await acceptAs(A);

    expect(accepted).toHaveLength(1);
    expect(accepted[0]).toMatchObject({
      id: inserted?.id,
      acceptedBy: A.id,
      updatedBy: A.id,
      createdBy: ADMIN,
      revokedAt: null,
    });
    expect(accepted[0]?.acceptedAt).toBeInstanceOf(Date);
  });

  // Each refusal is followed by A accepting the same invitation with the
  // token, so it is the address, the verification or the hash that refused.
  it('accepts for no other verified address', async () => {
    await insertAs();

    expect(await acceptAs(B)).toEqual([]);
    expect(await acceptAs(A)).toHaveLength(1);
  });

  it('accepts for the invited address only once it is verified', async () => {
    await insertAs();
    await sql`update users set email_verified = false where id = ${A.id}`;

    expect(await acceptAs(A)).toEqual([]);

    await sql`update users set email_verified = true where id = ${A.id}`;
    expect(await acceptAs(A)).toHaveLength(1);
  });

  it('accepts nothing for the stored hash passed as the token', async () => {
    const [inserted] = await insertAs();

    expect(await acceptAs(A, inserted!.tokenHash)).toEqual([]);
    expect(await acceptAs(A)).toHaveLength(1);
  });

  it('accepts no invitation twice, keeping the first acceptance', async () => {
    await insertAs();
    const [first] = await acceptAs(A);

    expect(await acceptAs(A)).toEqual([]);
    expect(await findAdminInvitationByToken(TOKEN)).toMatchObject({
      acceptedBy: A.id,
      acceptedAt: first?.acceptedAt,
    });
  });

  // The accepts above succeed for the same user and address, so it is the
  // expiry and the revocation that refuse here.
  it('accepts no expired invitation and no revoked one', async () => {
    await insertAs({ expiresAt: new Date(Date.now() - 1000) });
    const [revoked] = await insertAs({ token: OTHER_TOKEN });
    await withAudit(asUser(E), (write) => write.revokeAdminInvitation(admin, revoked!.id));

    expect([await acceptAs(A), await acceptAs(A, OTHER_TOKEN)]).toEqual([[], []]);
  });

  it('revokes a pending invitation, the revoker stamped as updated_by', async () => {
    const [inserted] = await insertAs();

    const revoked = await withAudit(asUser(E), (write) =>
      write.revokeAdminInvitation(admin, inserted!.id),
    );

    expect(revoked).toHaveLength(1);
    expect(revoked[0]).toMatchObject({ id: inserted?.id, updatedBy: ADMIN, acceptedAt: null });
    expect(revoked[0]?.revokedAt).toBeInstanceOf(Date);
  });

  it('revokes no invitation already accepted, or already revoked', async () => {
    const [accepted] = await insertAs();
    await acceptAs(A);
    const [revoked] = await insertAs({ token: OTHER_TOKEN });
    await withAudit(asUser(E), (write) => write.revokeAdminInvitation(admin, revoked!.id));

    const revokeAccepted = await withAudit(asUser(E), (write) =>
      write.revokeAdminInvitation(admin, accepted!.id),
    );
    const revokeAgain = await withAudit(asUser(E), (write) =>
      write.revokeAdminInvitation(admin, revoked!.id),
    );

    expect([revokeAccepted, revokeAgain]).toEqual([[], []]);
    expect(await findAdminInvitationByToken(TOKEN)).toMatchObject({ revokedAt: null });
  });

  // No body runs: each `@ts-expect-error` fails `npm run typecheck` the
  // moment its constraint is loosened, which a runtime assertion cannot see.
  it('refuses every generic write of the table, and the named ones without the proof, at compile time', () => {
    const id = ADMIN;
    const where = eq(adminInvitations.email, INVITED);

    const writes = [
      (write: AuditWriter) =>
        // @ts-expect-error — no generic insert: an invitation is an admin's to make.
        write.insert(adminInvitations, { email: INVITED, tokenHash: HASH_A }),
      (write: AuditWriter) =>
        // @ts-expect-error — no generic update: the stamps are the named writes'.
        write.update(adminInvitations, { revokedAt: null }, where),
      (write: AuditWriter) =>
        // @ts-expect-error — nor by id.
        write.updateById(adminInvitations, id, { acceptedBy: id }),
      (write: AuditWriter) =>
        // @ts-expect-error — no soft delete, though the table carries deleted_at.
        write.softDelete(adminInvitations, where),
      (write: AuditWriter) =>
        // @ts-expect-error — nor by id.
        write.softDeleteByIds(adminInvitations, [id]),
      (write: AuditWriter) =>
        // @ts-expect-error — and no hard delete, which deleted_at alone refuses too.
        write.delete(adminInvitations, where),
      (write: AuditWriter) =>
        // @ts-expect-error — the insert takes the proof first.
        write.insertAdminInvitation({ email: INVITED, token: TOKEN }),
      (write: AuditWriter) =>
        write.insertAdminInvitation(admin, {
          email: INVITED,
          token: TOKEN,
          // @ts-expect-error — no hash: the writer makes it from the token.
          tokenHash: HASH_A,
        }),
      (write: AuditWriter) =>
        write.insertAdminInvitation(admin, {
          email: INVITED,
          token: TOKEN,
          // @ts-expect-error — and no lifecycle stamp: an invitation starts pending.
          acceptedBy: id,
        }),
      (write: AuditWriter) =>
        // @ts-expect-error — the revoke takes the proof first.
        write.revokeAdminInvitation(id),
    ];

    expect(writes).toHaveLength(10);
  });
});
