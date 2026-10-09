import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import postgres from 'postgres';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import { AUDIT_COLUMNS, tableFacts } from '../../../support/db/table-metadata';
import { findMany, withAudit, type AuditWriter } from '@/db/repository';
import { FIXTURE_USERS } from '@/db/seed/standard';
import { workspaceCreationChanges } from '@/modules/identity/schema/workspace-creation-changes';
import { users } from '@/modules/identity/schema/users';

// MB.193: the ledger of who may create a workspace, one row per change to
// `users.can_create_workspace`, because the next update to a user's row
// overwrites its `updated_by`. MB.58's shape for a second privilege. The
// table task: M5.8's service is the first to write it
// (claude-docs/design-decisions/m5.8-revoking-workspace-creation.md).

const USER_FK = 'workspace_creation_changes_user_id_users_id_fk';
const CHANGES = ['grant', 'revoke', 'invitation', 'admin'];

describe('workspace_creation_changes schema', () => {
  const { byName, byIndexName, foreignKeyByColumn, nonAuditForeignKeys } =
    tableFacts(workspaceCreationChanges);

  it('has the ledger columns and the full audit spread, and nothing else', () => {
    expect(Object.keys(byName).sort()).toEqual(
      ['id', 'user_id', 'change', ...AUDIT_COLUMNS].sort(),
    );
  });

  it('points user_id at users, required, and references nothing else of its own', () => {
    expect(byName.user_id.notNull).toBe(true);
    expect(foreignKeyByColumn.user_id.foreignTable).toBe(users);
    expect(foreignKeyByColumn.user_id.foreignColumnName).toBe('id');
    expect(foreignKeyByColumn.user_id.name).toBe(USER_FK);
    expect(nonAuditForeignKeys.map((fk) => fk.column)).toEqual(['user_id']);
  });

  // A pgEnum because the set is closed: a fifth route to the flag is a migration.
  it('requires the change, one of the four routes, with no default', () => {
    expect(byName.change.notNull).toBe(true);
    expect(byName.change.enumValues).toEqual(CHANGES);
    expect(byName.change.hasDefault).toBe(false);
  });

  // Read per user, a handful of rows a user: no index earns its write.
  it('declares no index', () => {
    expect(byIndexName).toEqual({});
  });
});

let sql: ReturnType<typeof postgres>;
useTestDatabase((client) => (sql = client));

const ADMIN = FIXTURE_USERS.E.id;

describe('workspace_creation_changes table', () => {
  it('carries the enum and the foreign key in the catalogue', async () => {
    const labels = await sql<{ enumlabel: string }[]>`
      select e.enumlabel from pg_enum e
      join pg_type t on t.oid = e.enumtypid
      where t.typname = 'workspace_creation_change'
      order by e.enumsortorder
    `;
    expect(labels.map((row) => row.enumlabel)).toEqual(CHANGES);

    const [fk] = await sql<{ definition: string }[]>`
      select pg_get_constraintdef(oid) as definition from pg_constraint
      where conrelid = 'workspace_creation_changes'::regclass and conname = ${USER_FK}
    `;
    expect(fk?.definition).toBe('FOREIGN KEY (user_id) REFERENCES users(id)');
  });

  it('refuses a change outside the enum and a user that does not exist', async () => {
    const outside = await failureOf(sql`
      insert into workspace_creation_changes (user_id, change, created_by, updated_by)
      values (${ADMIN}, 'approve', ${ADMIN}, ${ADMIN})
    `);
    // 22P02 is invalid_text_representation: the enum refusing the label.
    expect(outside.code).toBe('22P02');

    const nobody = await failureOf(sql`
      insert into workspace_creation_changes (user_id, change, created_by, updated_by)
      values ('00000000-0000-0000-0000-0000000000ff', 'grant', ${ADMIN}, ${ADMIN})
    `);
    expect(nobody.code).toBe('23503');
  });

  // No backfill: who set a flag held before the ledger is not known, and a
  // row stamped by guess would be a false record. The template's holders are
  // what a backfill would have reached, so they are counted first.
  it('starts empty, though the seeded template holds users with the flag', async () => {
    const [{ holders }] = await sql<{ holders: number }[]>`
      select count(*)::int as holders from users
      where can_create_workspace and deleted_at is null
    `;
    expect(holders).toBeGreaterThan(0);

    const rows = await sql`select 1 from workspace_creation_changes`;
    expect(rows).toHaveLength(0);
  });
});

// Append-only by the repository, not by grant, as MB.58's ledger is: the
// `change` column marks it, and `NotAppendOnly` takes it off every update and
// delete. The writer's insert and the finders reach it.
describe('the repository', () => {
  it('inserts a row stamped from the session, and reads it back', async () => {
    await withAudit({ userId: ADMIN }, (write) =>
      write.insert(workspaceCreationChanges, { userId: FIXTURE_USERS.A.id, change: 'grant' }),
    );

    const rows = await findMany(
      workspaceCreationChanges,
      eq(workspaceCreationChanges.userId, FIXTURE_USERS.A.id),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ change: 'grant', createdBy: ADMIN, updatedBy: ADMIN });
  });

  // No body runs: each `@ts-expect-error` fails `npm run typecheck` the
  // moment its constraint is loosened, which a runtime assertion cannot see.
  it('refuses every update and delete of the table at compile time', () => {
    const id = FIXTURE_USERS.A.id;
    const where = eq(workspaceCreationChanges.userId, id);

    const writes = [
      (write: AuditWriter) =>
        // @ts-expect-error — the ledger is append-only: no update.
        write.update(workspaceCreationChanges, { change: 'revoke' }, where),
      (write: AuditWriter) =>
        // @ts-expect-error — nor by id.
        write.updateById(workspaceCreationChanges, id, { change: 'revoke' }),
      (write: AuditWriter) =>
        // @ts-expect-error — no soft delete, though the table carries deleted_at.
        write.softDelete(workspaceCreationChanges, where),
      (write: AuditWriter) =>
        // @ts-expect-error — nor by id.
        write.softDeleteByIds(workspaceCreationChanges, [id]),
      (write: AuditWriter) =>
        // @ts-expect-error — and no hard delete, which deleted_at alone refuses too.
        write.delete(workspaceCreationChanges, where),
    ];

    expect(writes).toHaveLength(5);
  });
});
