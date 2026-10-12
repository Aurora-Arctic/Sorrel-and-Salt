import { beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { failureOf, useTestDatabase } from '../support/db/database';
import { asManualFix, refusalOf } from '../support/db/privileges';
import { withAudit } from '@/db/repository';
import { FIXTURE_USERS } from '@/db/seed/standard';
import { users } from '@/modules/identity/schema/users';
import type { PrivilegeLedgerRow } from './types';

// MB.195: `users` fills `user_privilege_changes` itself. A change to `role` or
// `can_create_workspace` writes one row per column, its route read from
// `app.privilege_route` and refused when none was declared, so neither a
// service nor a `psql` session can change a privilege and leave no trace
// (claude-docs/design-decisions/mb.194-privilege-ledger-by-trigger.md).

let sql: ReturnType<typeof postgres>;
useTestDatabase((client) => (sql = client));

const ADMIN = FIXTURE_USERS.E.id;
// An invented account holding neither privilege, stamped as itself.
const SUBJECT = '00000000-0000-0000-0000-0000000000c1';
const NEWCOMER = '00000000-0000-0000-0000-0000000000c2';

const REFUSAL = /a privilege change must declare its route/;

beforeEach(async () => {
  // The ledger first: its rows name the users deleted next.
  await sql`truncate user_privilege_changes`;
  await sql`delete from users where id in (${SUBJECT}, ${NEWCOMER})`;
  await sql`
    insert into users (id, name, email, created_by, updated_by)
    values (${SUBJECT}, 'Subject Fixturewort', 'subject@privilege-trigger.test', ${SUBJECT}, ${SUBJECT})
  `;
});

async function ledger(): Promise<PrivilegeLedgerRow[]> {
  return sql<PrivilegeLedgerRow[]>`
    select user_id, privilege::text, change::text, via::text, note,
           created_at, created_by, updated_by
    from user_privilege_changes
    order by created_at, privilege
  `;
}

async function privilegesOf(id: string) {
  const [row] = await sql<{ role: string; can_create_workspace: boolean }[]>`
    select role::text, can_create_workspace from users where id = ${id}
  `;
  return row;
}

// What a `psql` session does: a statement of its own, or a transaction that
// says first how the change came about.
describe('a psql fix', () => {
  it('refuses a privilege change that declares no route, saying so, and changes nothing', async () => {
    const refused = await failureOf(sql`
      update users set can_create_workspace = true, updated_by = ${ADMIN} where id = ${SUBJECT}
    `);

    expect(refused.message).toMatch(REFUSAL);
    expect(await privilegesOf(SUBJECT)).toEqual({ role: 'user', can_create_workspace: false });
    expect(await ledger()).toEqual([]);
  });

  // The same statement as above, with the route declared: so it is the route
  // that the trigger refused, not the statement.
  it('records the same change as manual once declared, stamped with the row’s updated_by', async () => {
    await asManualFix(sql, async (tx) => {
      await tx`
        update users set can_create_workspace = true, updated_by = ${ADMIN} where id = ${SUBJECT}
      `;
    });

    expect(await privilegesOf(SUBJECT)).toEqual({ role: 'user', can_create_workspace: true });
    expect(await ledger()).toEqual([
      expect.objectContaining({
        user_id: SUBJECT,
        privilege: 'create_workspace',
        change: 'grant',
        via: 'manual',
        note: null,
        created_by: ADMIN,
        updated_by: ADMIN,
      }),
    ]);
  });

  it('refuses an insert carrying a privilege undeclared, and records it declared', async () => {
    const insert = (tx: postgres.Sql | postgres.TransactionSql) => tx`
      insert into users (id, name, email, can_create_workspace, created_by, updated_by)
      values (${NEWCOMER}, 'Newcomer Fixturewort', 'newcomer@privilege-trigger.test', true, ${ADMIN}, ${ADMIN})
    `;

    expect((await failureOf(insert(sql))).message).toMatch(REFUSAL);
    expect(await sql`select 1 from users where id = ${NEWCOMER}`).toHaveLength(0);

    await asManualFix(sql, async (tx) => {
      await insert(tx);
    });

    expect(await ledger()).toEqual([
      expect.objectContaining({
        user_id: NEWCOMER,
        privilege: 'create_workspace',
        change: 'grant',
        via: 'manual',
        created_by: ADMIN,
      }),
    ]);
  });

  // What Better Auth writes: a sign-up holding neither privilege, and the
  // profile and verification columns. None names a route and none is refused.
  it('writes nothing, and asks for no route, when neither column changes', async () => {
    await sql`
      insert into users (id, name, email, created_by, updated_by)
      values (${NEWCOMER}, 'Newcomer Fixturewort', 'newcomer@privilege-trigger.test', ${NEWCOMER}, ${NEWCOMER})
    `;
    await sql`
      update users set name = 'Renamed', image = 'https://example.test/a.png',
             email_verified = true, updated_by = ${SUBJECT}
      where id = ${SUBJECT}
    `;
    // Named in the statement but unchanged: the update trigger's WHEN holds it back.
    await sql`
      update users set role = 'user', can_create_workspace = false where id = ${SUBJECT}
    `;

    expect(await ledger()).toEqual([]);
  });
});

describe('a change through withAudit', () => {
  it('records the declared route and note, stamped as the acting user', async () => {
    await withAudit(
      { userId: ADMIN },
      (write) => write.updateById(users, SUBJECT, { canCreateWorkspace: true }),
      { via: 'admin', note: 'Keeps the herb garden' },
    );

    expect(await ledger()).toEqual([
      expect.objectContaining({
        user_id: SUBJECT,
        privilege: 'create_workspace',
        change: 'grant',
        via: 'admin',
        note: 'Keeps the herb garden',
        created_by: ADMIN,
        updated_by: ADMIN,
      }),
    ]);
  });

  it('refuses the same write declaring no route, and rolls it back', async () => {
    const refusal = withAudit({ userId: ADMIN }, (write) =>
      write.updateById(users, SUBJECT, { canCreateWorkspace: true }),
    );

    expect(await refusalOf(refusal)).toMatch(REFUSAL);
    expect(await privilegesOf(SUBJECT)).toEqual({ role: 'user', can_create_workspace: false });
    expect(await ledger()).toEqual([]);
  });

  // MB.177: being made admin sets the flag in the same write, so the reader
  // sees both grants at one instant by one actor, by the one route.
  it('writes two rows, one per privilege, when a user lacking the flag is made admin', async () => {
    await withAudit(
      { userId: ADMIN },
      (write) => write.updateById(users, SUBJECT, { role: 'admin', canCreateWorkspace: true }),
      { via: 'admin' },
    );

    const rows = await ledger();
    expect(
      rows.map(({ privilege, change, via, created_by }) => [privilege, change, via, created_by]),
    ).toEqual([
      ['admin', 'grant', 'admin', ADMIN],
      ['create_workspace', 'grant', 'admin', ADMIN],
    ]);
    expect(rows[0].created_at).toEqual(rows[1].created_at);
  });

  it('records a revoke as a revoke, leaving the flag an admin held', async () => {
    await withAudit(
      { userId: ADMIN },
      (write) => write.updateById(users, SUBJECT, { role: 'admin', canCreateWorkspace: true }),
      { via: 'admin' },
    );

    await withAudit(
      { userId: ADMIN },
      (write) => write.updateById(users, SUBJECT, { role: 'user' }),
      { via: 'admin' },
    );

    expect((await ledger()).map(({ privilege, change }) => [privilege, change])).toEqual([
      ['admin', 'grant'],
      ['create_workspace', 'grant'],
      ['admin', 'revoke'],
    ]);
  });

  it('stores an empty note as no note', async () => {
    await withAudit(
      { userId: ADMIN },
      (write) => write.updateById(users, SUBJECT, { canCreateWorkspace: true }),
      { via: 'admin', note: '' },
    );

    expect((await ledger()).map((row) => row.note)).toEqual([null]);
  });

  it('writes nothing for a declared write that changes no privilege', async () => {
    await withAudit(
      { userId: ADMIN },
      (write) => write.updateById(users, SUBJECT, { name: 'Renamed by an admin' }),
      { via: 'admin' },
    );

    expect(await ledger()).toEqual([]);
  });
});
