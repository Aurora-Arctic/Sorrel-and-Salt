import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import postgres from 'postgres';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import { statementsOfMigrationContaining } from '../../../support/db/migrations';
import { AUDIT_COLUMNS, tableFacts } from '../../../support/db/table-metadata';
import { findMany, withAudit, type AuditWriter } from '@/db/repository';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import { FIXTURE_USERS } from '@/db/seed/standard';
import { adminRoleChanges } from '@/modules/identity/schema/admin-role-changes';
import { users } from '@/modules/identity/schema/users';
import type { LedgerRow } from './types';

// MB.58: M2.9's ledger of who is an admin, one row per change to `users.role`,
// because the next update to a user's row overwrites its `updated_by`. The
// table task: MB.59's service is the first to write it, past the migration's
// backfill and the standard seed (claude-docs/design-decisions/m2.9-granting-admin.md,
// "What the audit trail records").

const USER_FK = 'admin_role_changes_user_id_users_id_fk';

// What marks the backfill among the shipped migrations: it re-runs below.
const BACKFILL_MIGRATION = 'INSERT INTO "admin_role_changes"';

describe('admin_role_changes schema', () => {
  const { byName, byIndexName, foreignKeyByColumn, nonAuditForeignKeys } =
    tableFacts(adminRoleChanges);

  it('has the ledger columns and the full audit spread, and nothing else', () => {
    expect(Object.keys(byName).sort()).toEqual(
      ['id', 'user_id', 'change', 'note', ...AUDIT_COLUMNS].sort(),
    );
  });

  it('points user_id at users, required, and references nothing else of its own', () => {
    expect(byName.user_id.notNull).toBe(true);
    expect(foreignKeyByColumn.user_id.foreignTable).toBe(users);
    expect(foreignKeyByColumn.user_id.foreignColumnName).toBe('id');
    expect(foreignKeyByColumn.user_id.name).toBe(USER_FK);
    expect(nonAuditForeignKeys.map((fk) => fk.column)).toEqual(['user_id']);
  });

  // A pgEnum because the set is closed: a fourth kind of change is a migration.
  it('requires the change, one of bootstrap, grant or revoke, with no default', () => {
    expect(byName.change.notNull).toBe(true);
    expect(byName.change.enumValues).toEqual(['bootstrap', 'grant', 'revoke']);
    expect(byName.change.hasDefault).toBe(false);
  });

  it('takes an optional free-text note', () => {
    expect(byName.note.getSQLType()).toBe('text');
    expect(byName.note.notNull).toBe(false);
  });

  // Read per user by MB.59, a handful of rows a year: no index earns its write.
  it('declares no index', () => {
    expect(byIndexName).toEqual({});
  });
});

let sql: ReturnType<typeof postgres>;
useTestDatabase((client) => (sql = client));

const ADMIN = FIXTURE_USERS.E.id;

async function everyChange(): Promise<LedgerRow[]> {
  return sql<LedgerRow[]>`
    select user_id, change::text, note, created_by, updated_by
    from admin_role_changes
    order by user_id, created_at
  `;
}

describe('admin_role_changes table', () => {
  it('carries the enum and the foreign key in the catalogue', async () => {
    const labels = await sql<{ enumlabel: string }[]>`
      select e.enumlabel from pg_enum e
      join pg_type t on t.oid = e.enumtypid
      where t.typname = 'admin_role_change'
      order by e.enumsortorder
    `;
    expect(labels.map((row) => row.enumlabel)).toEqual(['bootstrap', 'grant', 'revoke']);

    const [fk] = await sql<{ definition: string }[]>`
      select pg_get_constraintdef(oid) as definition from pg_constraint
      where conrelid = 'admin_role_changes'::regclass and conname = ${USER_FK}
    `;
    expect(fk?.definition).toBe('FOREIGN KEY (user_id) REFERENCES users(id)');
  });

  it('refuses a change outside the enum and a user that does not exist', async () => {
    const outside = await failureOf(sql`
      insert into admin_role_changes (user_id, change, created_by, updated_by)
      values (${ADMIN}, 'promote', ${ADMIN}, ${ADMIN})
    `);
    // 22P02 is invalid_text_representation: the enum refusing the label.
    expect(outside.code).toBe('22P02');

    const nobody = await failureOf(sql`
      insert into admin_role_changes (user_id, change, created_by, updated_by)
      values ('00000000-0000-0000-0000-0000000000ff', 'grant', ${ADMIN}, ${ADMIN})
    `);
    expect(nobody.code).toBe('23503');
  });
});

describe('the seeded ledger', () => {
  // The standard seed writes fixture E's row as the migration would have,
  // had E existed when it ran, so every seeded admin has its one row.
  it('holds one bootstrap row for fixture E, stamped as E, idempotently', async () => {
    const rows = (await everyChange()).filter((row) => row.user_id === ADMIN);

    expect(rows).toEqual([
      { user_id: ADMIN, change: 'bootstrap', note: null, created_by: ADMIN, updated_by: ADMIN },
    ]);
  });
});

// Every admin a database already holds gets one `bootstrap` row, stamped as
// itself, so the ledger has no gap at its start. The migration's own SQL
// re-runs here against the seeded template, the ledger emptied first as a
// database deployed before it held none.
describe('the backfill', () => {
  async function backfill(): Promise<void> {
    const statements = statementsOfMigrationContaining(BACKFILL_MIGRATION).filter((statement) =>
      /^(insert|update)\b/i.test(statement),
    );
    // The bootstrap user's demotion, then the backfill itself.
    expect(statements).toHaveLength(2);
    for (const statement of statements) await sql.unsafe(statement);
  }

  async function liveAdmins(): Promise<string[]> {
    const rows = await sql<{ id: string }[]>`
      select id from users where role = 'admin' and deleted_at is null order by id
    `;
    return rows.map((row) => row.id);
  }

  beforeEach(async () => {
    await sql`truncate admin_role_changes`;
  });

  it("gives each of the seeded template's live admins exactly one bootstrap row, stamped as that admin", async () => {
    // Fixture E is the template's one admin: an empty list would pass anything.
    expect(await liveAdmins()).toEqual([ADMIN]);

    await backfill();

    expect(await everyChange()).toEqual([
      { user_id: ADMIN, change: 'bootstrap', note: null, created_by: ADMIN, updated_by: ADMIN },
    ]);
  });

  it('writes nothing for a user, or for an admin since soft-deleted', async () => {
    const deletedAdmin = '00000000-0000-0000-0000-0000000000fe';
    await sql`
      insert into users (id, name, email, role, created_by, updated_by, deleted_at, deleted_by)
      values (${deletedAdmin}, 'Lapsed Admin', 'lapsed@example.test', 'admin',
              ${deletedAdmin}, ${deletedAdmin}, now(), ${deletedAdmin})
    `;

    await backfill();

    const subjects = (await everyChange()).map((row) => row.user_id);
    expect(subjects).toEqual([ADMIN]);
    expect(subjects).not.toContain(FIXTURE_USERS.A.id);
    expect(subjects).not.toContain(deletedAdmin);
  });

  // A database seeded before the rider holds the bootstrap user as an admin,
  // and the seed's insert skips a row it finds, so the migration demotes it,
  // before the backfill, so that it gets no ledger row either.
  it('demotes a bootstrap user seeded as an admin, and writes it no row', async () => {
    await sql`
      update users set role = 'admin', name = 'Bootstrap Admin' where id = ${BOOTSTRAP_USER_ID}
    `;

    await backfill();

    const [bootstrap] = await sql<{ role: string; name: string; updated_by: string }[]>`
      select role, name, updated_by from users where id = ${BOOTSTRAP_USER_ID}
    `;
    expect(bootstrap).toEqual({
      role: 'user',
      name: 'Seed System User',
      updated_by: BOOTSTRAP_USER_ID,
    });
    expect((await everyChange()).map((row) => row.user_id)).toEqual([ADMIN]);
  });
});

// Append-only by the repository, not by grant: `sorrel` owns its tables, so a
// REVOKE would not bind it. The writer's insert and the finders reach the
// table; nothing that updates or deletes it compiles.
describe('the repository', () => {
  it('inserts a row stamped from the session, and reads it back', async () => {
    await withAudit({ userId: ADMIN }, (write) =>
      write.insert(adminRoleChanges, {
        userId: FIXTURE_USERS.A.id,
        change: 'grant',
        note: 'Keeps the compendium',
      }),
    );

    const rows = await findMany(adminRoleChanges, eq(adminRoleChanges.userId, FIXTURE_USERS.A.id));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ change: 'grant', createdBy: ADMIN, updatedBy: ADMIN });
  });

  // No body runs: each `@ts-expect-error` fails `npm run typecheck` the
  // moment its constraint is loosened, which a runtime assertion cannot see.
  it('refuses every update and delete of the table at compile time', () => {
    const id = FIXTURE_USERS.A.id;
    const where = eq(adminRoleChanges.userId, id);

    const writes = [
      (write: AuditWriter) =>
        // @ts-expect-error — the ledger is append-only: no update.
        write.update(adminRoleChanges, { note: 'rewritten' }, where),
      (write: AuditWriter) =>
        // @ts-expect-error — nor by id.
        write.updateById(adminRoleChanges, id, { note: 'rewritten' }),
      (write: AuditWriter) =>
        // @ts-expect-error — no soft delete, though the table carries deleted_at.
        write.softDelete(adminRoleChanges, where),
      (write: AuditWriter) =>
        // @ts-expect-error — nor by id.
        write.softDeleteByIds(adminRoleChanges, [id]),
      (write: AuditWriter) =>
        // @ts-expect-error — and no hard delete, which deleted_at alone refuses too.
        write.delete(adminRoleChanges, where),
    ];

    expect(writes).toHaveLength(5);
  });
});
