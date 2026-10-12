import { beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import { AUDIT_COLUMNS, tableFacts } from '../../../support/db/table-metadata';
import { FIXTURE_USERS } from '@/db/seed/standard';
import {
  userPrivilege,
  userPrivilegeChange,
  userPrivilegeChanges,
  userPrivilegeRoute,
} from '@/modules/identity/schema/user-privilege-changes';
import type { PrivilegeChangeRow } from './types';

// MB.194: the one privilege ledger, one row per change to a privilege column
// on `users`, which the two one-privilege ledgers MB.58 and MB.193 built
// fold into. Append-only by
// `forbid_rewrite()`; MB.195's trigger on `users` writes it (claude-docs/design-decisions/mb.194-privilege-ledger-by-trigger.md).

describe('user_privilege_changes schema', () => {
  const { byName } = tableFacts(userPrivilegeChanges);

  it('has the ledger columns and the full audit spread, and nothing else', () => {
    expect(Object.keys(byName).sort()).toEqual(
      ['id', 'user_id', 'privilege', 'change', 'via', 'note', ...AUDIT_COLUMNS].sort(),
    );
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
  // pgEnums because each set is closed: a third privilege is a value in
  // `user_privilege` and a line in MB.195's trigger, not a table.
  it('holds the privileges, changes and routes the code declares', async () => {
    const [row] = await sql`
      select enum_range(null::user_privilege)::text[] as privileges,
             enum_range(null::user_privilege_change)::text[] as changes,
             enum_range(null::user_privilege_route)::text[] as routes
    `;

    expect(row.privileges).toEqual(userPrivilege.enumValues);
    expect(row.changes).toEqual(userPrivilegeChange.enumValues);
    expect(row.routes).toEqual(userPrivilegeRoute.enumValues);
  });

  it('refuses a value outside each enum', async () => {
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

  it('refuses a delete, leaving the row in place', async () => {
    const refused = await failureOf(sql`delete from user_privilege_changes where id = ${id}`);
    expect(refused.message).toMatch(/user_privilege_changes is append-only/);

    expect((await everyChange()).map((row) => row.id)).toEqual([id]);
  });
});
