import { beforeAll, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import { Forbidden } from '@/lib/errors';
import { resolvePage } from '@/lib/pagination';
import { listUsers, providersOf } from '@/modules/identity';
import type { UserFilter } from '@/modules/identity';
import type { PageRequest } from '@/lib/types';
import { A, B, C, D, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { asManualFix } from '../../../support/db/privileges';
import type { ListedUserRow } from './types';

// MB.52's two reads behind `/admin/users`: the list itself and the providers
// linked to each listed account. Both are a site admin's alone, refused at
// the service by direct call rather than by the page being out of reach
// (claude-docs/auth/admin-users.md, "The user list").

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

const PAGE: PageRequest = { limit: 101, inverted: false };

// Invented accounts beside the cast, written once for the file: a pending
// signup, a soft-deleted user, and a name holding the LIKE wildcards.
const PENDING = '00000000-0000-0000-0000-0000000000a1';
const DELETED = '00000000-0000-0000-0000-0000000000a2';
const WILDCARD = '00000000-0000-0000-0000-0000000000a3';

beforeAll(async () => {
  // The wildcard account is inserted holding the creation flag, a privilege
  // change the trigger on `users` asks a route for (MB.195).
  await asManualFix(
    sql,
    (tx) => tx`
      insert into users (id, name, email, email_verified, can_create_workspace, created_by, updated_by)
      values (${PENDING}, 'Pending Fixturewort', 'pending@users.test', false, false, ${PENDING}, ${PENDING}),
             (${WILDCARD}, 'Percent 100% Fixture', 'percent@users.test', true, true, ${WILDCARD}, ${WILDCARD})
    `,
  );
  await sql`
    insert into users (id, name, email, created_by, updated_by, deleted_at, deleted_by)
    values (${DELETED}, 'Lapsed Fixturewort', 'lapsed@users.test', ${DELETED}, ${DELETED}, now(), ${DELETED})
  `;
  await sql`
    insert into accounts (account_id, provider_id, user_id, updated_at)
    values ('a-google', 'google', ${A.id}, now()),
           ('a-discord', 'discord', ${A.id}, now()),
           ('b-microsoft', 'microsoft', ${B.id}, now())
  `;
});

// Every live user but the seed's bootstrap user, which the list leaves out.
async function listableUsers(): Promise<ListedUserRow[]> {
  return sql<ListedUserRow[]>`
    select id, name from users
    where deleted_at is null and id <> ${BOOTSTRAP_USER_ID}
    order by name, id
  `;
}

async function names(filter: UserFilter): Promise<string[]> {
  return (await listUsers(asUser(E), filter, PAGE)).map((entry) => entry.node.name);
}

describe('listUsers', () => {
  it('lists every live user to an admin, by name and then id', async () => {
    const expected = await listableUsers();
    // The cast and this file's two live users.
    expect(expected.map((row) => row.id)).toEqual(
      expect.arrayContaining([A.id, B.id, C.id, D.id, E.id, PENDING, WILDCARD]),
    );

    const page = await listUsers(asUser(E), {}, PAGE);

    expect(page.map((entry) => entry.node.id)).toEqual(expected.map((row) => row.id));
    expect(page.find((entry) => entry.node.id === A.id)?.node).toMatchObject({
      name: A.name,
      email: A.email,
      role: 'user',
      canCreateWorkspace: true,
      emailVerified: expect.any(Boolean),
      createdAt: expect.any(Date),
    });
  });

  // It stamps the seeded rows and nobody signs in as it: nothing an admin does
  // to a person applies to it.
  it("leaves out the seed's bootstrap user, though it is a live row", async () => {
    const [row] = await sql`select name, deleted_at from users where id = ${BOOTSTRAP_USER_ID}`;
    expect(row).toEqual({ name: 'Seed System User', deleted_at: null });

    const page = await listUsers(asUser(E), {}, PAGE);

    expect(page.map((entry) => entry.node.id)).not.toContain(BOOTSTRAP_USER_ID);
    expect(await names({ query: 'Seed System' })).toEqual([]);
  });

  // Rule 4: the finder drops the row, and the service has no predicate to add.
  it('never lists a soft-deleted user, though the row exists', async () => {
    const [row] = await sql`select deleted_at from users where id = ${DELETED}`;
    expect(row?.deleted_at).toBeInstanceOf(Date);

    const page = await listUsers(asUser(E), {}, PAGE);

    expect(page.map((entry) => entry.node.id)).not.toContain(DELETED);
    expect(await names({ query: 'Lapsed' })).toEqual([]);
  });

  it('pages by a cursor of the sort key and id, never an offset', async () => {
    const live = await listableUsers();
    const expected = live.map((row) => row.id);

    const first = await resolvePage({ first: 3 }, (request) => listUsers(asUser(E), {}, request));
    const second = await resolvePage({ first: 3, after: first.pageInfo.endCursor }, (request) =>
      listUsers(asUser(E), {}, request),
    );

    expect(first.edges.map((edge) => edge.node.id)).toEqual(expected.slice(0, 3));
    expect(second.edges.map((edge) => edge.node.id)).toEqual(expected.slice(3, 6));
    const cursor = JSON.parse(
      Buffer.from(first.pageInfo.endCursor as string, 'base64url').toString('utf8'),
    );
    expect(cursor).toEqual({ k: [live[2]?.name], i: live[2]?.id });
  });

  it('filters by a substring of the name or the email, whatever its case', async () => {
    expect(await names({ query: 'fixturewort' })).toEqual(['Pending Fixturewort']);
    expect(await names({ query: 'PENDING@USERS' })).toEqual(['Pending Fixturewort']);
    expect(await names({ query: '  fixture a  ' })).toEqual([A.name]);
  });

  it('treats a blank query as no filter', async () => {
    expect(await names({ query: '   ' })).toEqual((await listableUsers()).map((row) => row.name));
  });

  // M5.8's to-do list: who may not yet create a workspace.
  it('narrows to the users awaiting approval, alone or beside a query', async () => {
    const [{ count }] = await sql<{ count: number }[]>`
      select count(*)::int as count from users
      where deleted_at is null and can_create_workspace = false and id <> ${BOOTSTRAP_USER_ID}
    `;
    // Both kinds are live, or the filter narrowing nothing would pass.
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan((await listableUsers()).length);

    const awaiting = await listUsers(asUser(E), { awaitingApproval: true }, PAGE);

    expect(awaiting).toHaveLength(count);
    expect(awaiting.every((entry) => !entry.node.canCreateWorkspace)).toBe(true);
    // Every admin holds the flag (MB.177), so none waits on an approval.
    expect(awaiting.some((entry) => entry.node.role === 'admin')).toBe(false);
    expect(await names({ awaitingApproval: true, query: 'pending' })).toEqual([
      'Pending Fixturewort',
    ]);
    expect(await names({ awaitingApproval: true, query: 'percent' })).toEqual([]);
  });

  it('narrows to one role, alone or beside the other filters', async () => {
    const live = await sql<{ id: string; role: string }[]>`
      select id, role::text from users where deleted_at is null and id <> ${BOOTSTRAP_USER_ID}
    `;
    const admins = live.filter((row) => row.role === 'admin').map((row) => row.id);
    // Both roles are live, or a filter narrowing nothing would pass.
    expect(admins).toContain(E.id);
    expect(admins.length).toBeLessThan(live.length);

    const onlyAdmins = await listUsers(asUser(E), { role: 'admin' }, PAGE);
    const onlyUsers = await listUsers(asUser(E), { role: 'user' }, PAGE);

    expect(onlyAdmins.map((entry) => entry.node.id).sort()).toEqual([...admins].sort());
    expect(onlyUsers).toHaveLength(live.length - admins.length);
    expect(onlyUsers.every((entry) => entry.node.role === 'user')).toBe(true);
    expect(await names({ role: 'user', awaitingApproval: true, query: 'pending' })).toEqual([
      'Pending Fixturewort',
    ]);
    // Every admin holds the flag (MB.177), so none awaits approval.
    expect(await names({ role: 'admin', awaitingApproval: true })).toEqual([]);
  });

  // Why it could have succeeded: the rows exist and the same call answers E.
  // The check reads the site role alone, so one non-admin stands for every one.
  it('refuses a user who is not an admin, by direct call', async () => {
    expect(await listUsers(asUser(E), {}, PAGE)).not.toHaveLength(0);
    expect(A.role).toBe('user');

    await expect(listUsers(asUser(A), {}, PAGE)).rejects.toThrow(Forbidden);
  });
});

describe('providersOf', () => {
  it("answers each user's linked providers, sorted, one slot per id in order", async () => {
    const answer = await providersOf(asUser(E), [B.id, A.id, C.id, A.id]);

    expect(answer).toEqual([['microsoft'], ['discord', 'google'], [], ['discord', 'google']]);
  });

  // Why it could have succeeded: A's providers are linked, and E reads them.
  it('refuses every slot to a user who is not an admin, their own included', async () => {
    expect(await providersOf(asUser(E), [A.id])).toEqual([['discord', 'google']]);

    const answer = await providersOf(asUser(A), [A.id, B.id]);

    expect(answer).toHaveLength(2);
    for (const slot of answer) expect(slot).toBeInstanceOf(Forbidden);
  });
});
