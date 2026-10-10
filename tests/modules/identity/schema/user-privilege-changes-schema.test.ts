import { beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import { refusalOf } from '../../../support/db/privileges';
import { statementsOfMigrationContaining } from '../../../support/db/migrations';
import { AUDIT_COLUMNS, tableFacts } from '../../../support/db/table-metadata';
import { withAudit, type AuditWriter } from '@/db/repository';
import { FIXTURE_USERS } from '@/db/seed/standard';
import { userPrivilegeChanges } from '@/modules/identity/schema/user-privilege-changes';
import { users } from '@/modules/identity/schema/users';
import type { PrivilegeChangeRow } from './types';

// MB.194: the one privilege ledger, one row per change to a privilege column
// on `users`, which the two one-privilege ledgers MB.58 and MB.193 built
// fold into. The table task: append-only by
// `forbid_rewrite()`, holding a copy of both; MB.195's trigger on `users` is
// the first to write it (claude-docs/design-decisions/mb.194-privilege-ledger-by-trigger.md).

const USER_FK = 'user_privilege_changes_user_id_users_id_fk';
const PRIVILEGES = ['admin', 'create_workspace'];
const CHANGES = ['grant', 'revoke'];
const ROUTES = ['bootstrap', 'admin', 'invitation', 'manual'];

// What marks the copy among the shipped migrations: it re-runs below.
const COPY_MIGRATION = 'INSERT INTO "user_privilege_changes"';

describe('user_privilege_changes schema', () => {
  const { byName, byIndexName, foreignKeyByColumn, nonAuditForeignKeys } =
    tableFacts(userPrivilegeChanges);

  it('has the ledger columns and the full audit spread, and nothing else', () => {
    expect(Object.keys(byName).sort()).toEqual(
      ['id', 'user_id', 'privilege', 'change', 'via', 'note', ...AUDIT_COLUMNS].sort(),
    );
  });

  it('points user_id at users, required, and references nothing else of its own', () => {
    expect(byName.user_id.notNull).toBe(true);
    expect(foreignKeyByColumn.user_id.foreignTable).toBe(users);
    expect(foreignKeyByColumn.user_id.foreignColumnName).toBe('id');
    expect(foreignKeyByColumn.user_id.name).toBe(USER_FK);
    expect(nonAuditForeignKeys.map((fk) => fk.column)).toEqual(['user_id']);
  });

  // pgEnums because each set is closed: a third privilege is a value in
  // `user_privilege` and a line in MB.195's trigger, not a table.
  it.each([
    ['privilege', PRIVILEGES],
    ['change', CHANGES],
    ['via', ROUTES],
  ])('requires %s, one of its closed set, with no default', (column, values) => {
    expect(byName[column].notNull).toBe(true);
    expect(byName[column].enumValues).toEqual(values);
    expect(byName[column].hasDefault).toBe(false);
  });

  it('takes an optional free-text note', () => {
    expect(byName.note.getSQLType()).toBe('text');
    expect(byName.note.notNull).toBe(false);
  });

  // Read by MB.199's page, which adds `(user_id, created_at desc)` if the
  // keyset helper's plan wants it.
  it('declares no index', () => {
    expect(byIndexName).toEqual({});
  });
});

let sql: ReturnType<typeof postgres>;
useTestDatabase((client) => (sql = client));

const ADMIN = FIXTURE_USERS.E.id;
const SUBJECT = FIXTURE_USERS.A.id;

async function everyChange(): Promise<PrivilegeChangeRow[]> {
  return sql<PrivilegeChangeRow[]>`
    select id, user_id, privilege::text, change::text, via::text, note,
           created_at::text, created_by, updated_at::text, updated_by, deleted_at::text, deleted_by
    from user_privilege_changes
    order by created_at, id
  `;
}

describe('user_privilege_changes table', () => {
  it.each([
    ['user_privilege', PRIVILEGES],
    ['user_privilege_change', CHANGES],
    ['user_privilege_route', ROUTES],
  ])('carries the %s enum in the catalogue', async (type, values) => {
    const labels = await sql<{ enumlabel: string }[]>`
      select e.enumlabel from pg_enum e
      join pg_type t on t.oid = e.enumtypid
      where t.typname = ${type}
      order by e.enumsortorder
    `;
    expect(labels.map((row) => row.enumlabel)).toEqual(values);
  });

  it('carries the foreign key in the catalogue', async () => {
    const [fk] = await sql<{ definition: string }[]>`
      select pg_get_constraintdef(oid) as definition from pg_constraint
      where conrelid = 'user_privilege_changes'::regclass and conname = ${USER_FK}
    `;
    expect(fk?.definition).toBe('FOREIGN KEY (user_id) REFERENCES users(id)');
  });

  it('refuses a value outside each enum and a user that does not exist', async () => {
    for (const [privilege, change, via] of [
      ['moderate', 'grant', 'admin'],
      ['admin', 'promote', 'admin'],
      ['admin', 'grant', 'console'],
    ]) {
      const outside = await failureOf(sql`
        insert into user_privilege_changes (user_id, privilege, change, via, created_by, updated_by)
        values (${SUBJECT}, ${privilege}, ${change}, ${via}, ${ADMIN}, ${ADMIN})
      `);
      // 22P02 is invalid_text_representation: the enum refusing the label.
      expect(outside.code).toBe('22P02');
    }

    const nobody = await failureOf(sql`
      insert into user_privilege_changes (user_id, privilege, change, via, created_by, updated_by)
      values ('00000000-0000-0000-0000-0000000000ff', 'admin', 'grant', 'admin', ${ADMIN}, ${ADMIN})
    `);
    expect(nobody.code).toBe('23503');
  });

  // On a fresh database the migration's copy finds nothing to copy, so every
  // row the seeded template holds is one the trigger on `users` wrote as the
  // seed inserted the cast (MB.195), each a `bootstrap` grant; the two old
  // ledgers it would have copied are empty.
  it('holds no copied row on a fresh database, only the seeded cast’s bootstrap grants', async () => {
    const rows = await everyChange();
    const cast = Object.values(FIXTURE_USERS).map((user) => user.id);

    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(cast).toContain(row.user_id);
      expect({ change: row.change, via: row.via }).toEqual({ change: 'grant', via: 'bootstrap' });
    }
    const [{ old }] = await sql<{ old: number }[]>`
      select (select count(*) from admin_role_changes)::int
           + (select count(*) from workspace_creation_changes)::int as old
    `;
    expect(old).toBe(0);
  });
});

// Append-only by the database rather than by the writer's types: an update or
// a delete from any client, `psql` and the seed included, is refused. The
// insert beside them succeeds, so it is the trigger refusing and not the row.
describe('forbid_rewrite', () => {
  let id: string;

  beforeEach(async () => {
    await sql`truncate user_privilege_changes`;
    [{ id }] = await sql<{ id: string }[]>`
      insert into user_privilege_changes (user_id, privilege, change, via, created_by, updated_by)
      values (${SUBJECT}, 'create_workspace', 'grant', 'admin', ${ADMIN}, ${ADMIN})
      returning id
    `;
  });

  it('lets an insert through', async () => {
    expect((await everyChange()).map((row) => row.id)).toEqual([id]);
  });

  it('refuses an update, leaving the row as it was', async () => {
    const refused = await failureOf(
      sql`update user_privilege_changes set change = 'revoke' where id = ${id}`,
    );
    expect(refused.message).toMatch(/user_privilege_changes is append-only/);

    const [row] = await everyChange();
    expect(row.change).toBe('grant');
  });

  it('refuses a soft delete, which is an update', async () => {
    const refused = await failureOf(sql`
      update user_privilege_changes set deleted_at = now(), deleted_by = ${ADMIN} where id = ${id}
    `);
    expect(refused.message).toMatch(/user_privilege_changes is append-only/);
  });

  it('refuses a delete, leaving the row in place', async () => {
    const refused = await failureOf(sql`delete from user_privilege_changes where id = ${id}`);
    expect(refused.message).toMatch(/user_privilege_changes is append-only/);

    expect((await everyChange()).map((row) => row.id)).toEqual([id]);
  });

  // MB.196: the writer's types no longer mark the ledger, since the database
  // refuses for every client. The repository's own generic writes compile
  // against it, and each is refused at run time, the row left as it was.
  // `write.delete` stays refused at compile time, the table carrying `deleted_at`.
  it('refuses the repository’s updates and deletes too', async () => {
    const asAdmin = { userId: ADMIN };
    const writes: ((write: AuditWriter) => Promise<unknown>)[] = [
      (write) => write.updateById(userPrivilegeChanges, id, { note: 'rewritten' }),
      (write) => write.softDeleteByIds(userPrivilegeChanges, [id]),
    ];

    for (const fn of writes) {
      expect(await refusalOf(withAudit(asAdmin, fn))).toMatch(
        /user_privilege_changes is append-only/,
      );
    }
    expect(await everyChange()).toEqual([
      expect.objectContaining({ id, note: null, deleted_at: null }),
    ]);
  });
});

// The migration copies both old ledgers with their ids and stamps, so MB.197's
// final sweep can skip what is already there. Its own SQL re-runs here, the
// three tables emptied first and one row of each old kind written by hand.
describe('the copy', () => {
  // Read back as text, so no client time zone moves them.
  const CREATED = '2025-03-01 10:00:00';
  const UPDATED = '2025-03-02 11:00:00';

  const OLD_ADMIN_ROWS = [
    ['bootstrap', 'admin', 'grant', 'bootstrap', 'Seeded'],
    ['grant', 'admin', 'grant', 'admin', 'Keeps the compendium'],
    ['revoke', 'admin', 'revoke', 'admin', null],
  ] as const;

  const OLD_CREATION_ROWS = [
    ['grant', 'create_workspace', 'grant', 'admin'],
    ['revoke', 'create_workspace', 'revoke', 'admin'],
    ['invitation', 'create_workspace', 'grant', 'invitation'],
    ['admin', 'create_workspace', 'grant', 'admin'],
  ] as const;

  function oldId(table: number, row: number): string {
    return `00000000-0000-0000-00${table}0-00000000000${row}`;
  }

  async function copy(): Promise<void> {
    const statements = statementsOfMigrationContaining(COPY_MIGRATION).filter((statement) =>
      /^insert\b/i.test(statement),
    );
    // One statement copies both.
    expect(statements).toHaveLength(1);
    await sql.unsafe(statements[0]);
  }

  beforeEach(async () => {
    await sql`truncate user_privilege_changes, admin_role_changes, workspace_creation_changes`;

    for (const [index, [change, , , , note]] of OLD_ADMIN_ROWS.entries()) {
      await sql`
        insert into admin_role_changes (id, user_id, change, note, created_at, created_by, updated_at, updated_by)
        values (${oldId(1, index)}, ${SUBJECT}, ${change}, ${note}, ${CREATED}, ${ADMIN}, ${UPDATED}, ${SUBJECT})
      `;
    }
    for (const [index, [change]] of OLD_CREATION_ROWS.entries()) {
      await sql`
        insert into workspace_creation_changes (id, user_id, change, created_at, created_by, updated_at, updated_by)
        values (${oldId(2, index)}, ${SUBJECT}, ${change}, ${CREATED}, ${ADMIN}, ${UPDATED}, ${SUBJECT})
      `;
    }
  });

  it('lands every old row with its id, its stamps and its mapped privilege, change and route', async () => {
    await copy();

    const stamps = {
      user_id: SUBJECT,
      created_at: CREATED,
      created_by: ADMIN,
      updated_at: UPDATED,
      updated_by: SUBJECT,
      deleted_at: null,
      deleted_by: null,
    };
    const expected = [
      ...OLD_ADMIN_ROWS.map(([, privilege, change, via, note], index) => ({
        id: oldId(1, index),
        privilege,
        change,
        via,
        note,
        ...stamps,
      })),
      ...OLD_CREATION_ROWS.map(([, privilege, change, via], index) => ({
        id: oldId(2, index),
        privilege,
        change,
        via,
        note: null,
        ...stamps,
      })),
    ];

    const rows = await everyChange();
    expect(rows).toHaveLength(OLD_ADMIN_ROWS.length + OLD_CREATION_ROWS.length);
    expect(rows).toEqual(expect.arrayContaining(expected));
  });

  it('copies nothing into a ledger whose old tables are empty', async () => {
    await sql`truncate admin_role_changes, workspace_creation_changes`;

    await copy();

    expect(await everyChange()).toEqual([]);
  });
});
