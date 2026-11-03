import { beforeAll, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import { SIGNED_OUT_SENDER_ID } from '@/lib/support-sender';
import { SYSTEM_ACTOR_ID } from '@/lib/system-actor';
import { Forbidden } from '@/lib/errors';
import { countUsers, listUsers, providersOf, usersForAdmin } from '@/modules/identity';
import type { UserFilter } from '@/modules/identity';
import type { PageRequest } from '@/lib/types';
import { A, B, C, D, E, F, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { asManualFix } from '../../../support/db/privileges';
import type { ListedUserRow } from './types';

// The two reads behind `/keepers/users`: the list and the providers linked to each listed account.
// Both are a site admin's alone, refused at the service by direct call rather than by the page being out of reach (claude-docs/auth/admin-users.md, "The user list").

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
// Invented accounts under support time-outs and site access pauses: one standing with no end date, one standing to a date,
// one run out and one lifted of each. The last two hold a row each that no longer stands.
const TIMED_OPEN = '00000000-0000-0000-0000-0000000000b1';
const TIMED_DATED = '00000000-0000-0000-0000-0000000000b2';
const TIMED_RUN_OUT = '00000000-0000-0000-0000-0000000000b3';
const TIMED_LIFTED = '00000000-0000-0000-0000-0000000000b4';
const PAUSED_OPEN = '00000000-0000-0000-0000-0000000000c1';
const PAUSED_DATED = '00000000-0000-0000-0000-0000000000c2';
const PAUSED_RUN_OUT = '00000000-0000-0000-0000-0000000000c3';
const PAUSED_LIFTED = '00000000-0000-0000-0000-0000000000c4';

beforeAll(async () => {
  // The wildcard account is inserted holding the creation flag, a privilege
  // change the trigger on `users` asks a route for.
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
  const sanctioned: [string, string][] = [
    [TIMED_OPEN, 'Timed Open Testwort'],
    [TIMED_DATED, 'Timed Dated Testwort'],
    [TIMED_RUN_OUT, 'Timed Run Out Testwort'],
    [TIMED_LIFTED, 'Timed Lifted Testwort'],
    [PAUSED_OPEN, 'Paused Open Testwort'],
    [PAUSED_DATED, 'Paused Dated Testwort'],
    [PAUSED_RUN_OUT, 'Paused Run Out Testwort'],
    [PAUSED_LIFTED, 'Paused Lifted Testwort'],
  ];
  for (const [id, name] of sanctioned) {
    await sql`
      insert into users (id, name, email, created_by, updated_by)
      values (${id}, ${name}, ${id.slice(-2) + '@users.test'}, ${id}, ${id})
    `;
  }
  await sql`
    insert into support_timeouts (user_id, until, note, lifted_at, created_by, updated_by)
    values (${TIMED_OPEN}, null, 'Testnote', null, ${E.id}, ${E.id}),
           (${TIMED_DATED}, now() + interval '1 day', 'Testnote', null, ${E.id}, ${E.id}),
           (${TIMED_RUN_OUT}, now() - interval '1 minute', 'Testnote', null, ${E.id}, ${E.id}),
           (${TIMED_LIFTED}, null, 'Testnote', now(), ${E.id}, ${E.id})
  `;
  await sql`
    insert into user_access_pauses (user_id, until, note, lifted_at, lifted_by, created_by, updated_by)
    values (${PAUSED_OPEN}, null, 'Testnote', null, null, ${E.id}, ${E.id}),
           (${PAUSED_DATED}, now() + interval '1 day', 'Testnote', null, null, ${E.id}, ${E.id}),
           (${PAUSED_RUN_OUT}, now() - interval '1 minute', 'Testnote', null, null, ${E.id}, ${E.id}),
           (${PAUSED_LIFTED}, null, 'Testnote', now(), ${E.id}, ${E.id}, ${E.id})
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
    where deleted_at is null and id not in (${BOOTSTRAP_USER_ID}, ${SIGNED_OUT_SENDER_ID}, ${SYSTEM_ACTOR_ID})
    order by name, id
  `;
}

async function names(filter: UserFilter): Promise<string[]> {
  return (await listUsers(asUser(E), filter, PAGE)).map((entry) => entry.node.name);
}

describe('listUsers', () => {
  it('lists every live user to a keeper, by name and then id', async () => {
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

  // It stamps the seeded rows and nobody signs in as it: nothing a keeper does
  // to a person applies to it.
  it("leaves out the seed's bootstrap user, though it is a live row", async () => {
    const [row] = await sql`select name, deleted_at from users where id = ${BOOTSTRAP_USER_ID}`;
    expect(row).toEqual({ name: 'Seed System User', deleted_at: null });

    const page = await listUsers(asUser(E), {}, PAGE);

    expect(page.map((entry) => entry.node.id)).not.toContain(BOOTSTRAP_USER_ID);
    expect(await names({ query: 'Seed System' })).toEqual([]);
  });

  it('leaves out the signed-out support sender, though it is a live row', async () => {
    const [row] = await sql`select deleted_at from users where id = ${SIGNED_OUT_SENDER_ID}`;
    expect(row).toEqual({ deleted_at: null });

    const page = await listUsers(asUser(E), {}, PAGE);

    expect(page.map((entry) => entry.node.id)).not.toContain(SIGNED_OUT_SENDER_ID);
    expect(await names({ query: 'signed out' })).toEqual([]);
  });

  it('leaves out the job actor, though it is a live row', async () => {
    const [row] = await sql`select deleted_at from users where id = ${SYSTEM_ACTOR_ID}`;
    expect(row).toEqual({ deleted_at: null });

    const page = await listUsers(asUser(E), {}, PAGE);

    expect(page.map((entry) => entry.node.id)).not.toContain(SYSTEM_ACTOR_ID);
  });

  it('filters by a substring of the name or the email, whatever its case', async () => {
    expect(await names({ query: 'fixturewort' })).toEqual(['Pending Fixturewort']);
    expect(await names({ query: 'PENDING@USERS' })).toEqual(['Pending Fixturewort']);
    expect(await names({ query: '  fixture a  ' })).toEqual([A.name]);
  });

  it('treats a blank query as no filter', async () => {
    expect(await names({ query: '   ' })).toEqual((await listableUsers()).map((row) => row.name));
  });

  // The to-do list: who may not yet create a workspace.
  it('narrows to the users awaiting approval, alone or beside a query', async () => {
    const [{ count }] = await sql<{ count: number }[]>`
      select count(*)::int as count from users
      where deleted_at is null and can_create_workspace = false and id not in (${BOOTSTRAP_USER_ID}, ${SIGNED_OUT_SENDER_ID}, ${SYSTEM_ACTOR_ID})
    `;
    // Both kinds are live, or the filter narrowing nothing would pass.
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan((await listableUsers()).length);

    const awaiting = await listUsers(asUser(E), { awaitingApproval: true }, PAGE);

    expect(awaiting).toHaveLength(count);
    expect(awaiting.every((entry) => !entry.node.canCreateWorkspace)).toBe(true);
    // Every admin holds the flag, so none waits on an approval.
    expect(awaiting.some((entry) => entry.node.role === 'admin')).toBe(false);
    expect(await names({ awaitingApproval: true, query: 'pending' })).toEqual([
      'Pending Fixturewort',
    ]);
    expect(await names({ awaitingApproval: true, query: 'percent' })).toEqual([]);
  });

  it('narrows to one role, alone or beside the other filters', async () => {
    const live = await sql<{ id: string; role: string }[]>`
      select id, role::text from users where deleted_at is null and id not in (${BOOTSTRAP_USER_ID}, ${SIGNED_OUT_SENDER_ID}, ${SYSTEM_ACTOR_ID})
    `;
    const of = (role: string) => live.filter((row) => row.role === role).map((row) => row.id);
    // Every role is live, or a filter narrowing nothing would pass.
    expect(of('admin')).toContain(E.id);
    expect(of('curator')).toContain(F.id);
    expect(of('user').length).toBeGreaterThan(0);

    for (const role of ['user', 'curator', 'admin'] as const) {
      const listed = await listUsers(asUser(E), { role }, PAGE);
      expect(listed.map((entry) => entry.node.id).sort()).toEqual(of(role).sort());
    }
    expect(await names({ role: 'user', awaitingApproval: true, query: 'pending' })).toEqual([
      'Pending Fixturewort',
    ]);
    // Every keeper and curator holds the flag, so none awaits approval.
    expect(await names({ role: 'admin', awaitingApproval: true })).toEqual([]);
    expect(await names({ role: 'curator', awaitingApproval: true })).toEqual([]);
  });
});

describe('listUsers by support time-out and site access pause', () => {
  async function ids(filter: UserFilter): Promise<string[]> {
    return (await listUsers(asUser(E), filter, PAGE)).map((entry) => entry.node.id).sort();
  }

  it('narrows to the users a support time-out stands on, leaving out one run out and one lifted', async () => {
    // Every kind holds a row, or a filter testing only that a row exists would pass.
    const rows = await sql<{ user_id: string }[]>`select user_id from support_timeouts`;
    expect(rows.map((row) => row.user_id)).toEqual(
      expect.arrayContaining([TIMED_OPEN, TIMED_DATED, TIMED_RUN_OUT, TIMED_LIFTED]),
    );

    expect(await ids({ timedOut: true })).toEqual([TIMED_OPEN, TIMED_DATED].sort());
    expect(await names({ timedOut: true, query: 'dated' })).toEqual(['Timed Dated Testwort']);
    // Off is no filter.
    expect(await ids({ timedOut: false })).toEqual(await ids({}));
  });

  it('narrows to the users a site access pause stands on, leaving out one run out and one lifted', async () => {
    const rows = await sql<{ user_id: string }[]>`select user_id from user_access_pauses`;
    expect(rows.map((row) => row.user_id)).toEqual(
      expect.arrayContaining([PAUSED_OPEN, PAUSED_DATED, PAUSED_RUN_OUT, PAUSED_LIFTED]),
    );

    expect(await ids({ paused: true })).toEqual([PAUSED_OPEN, PAUSED_DATED].sort());
    expect(await names({ paused: true, query: 'open' })).toEqual(['Paused Open Testwort']);
    expect(await ids({ paused: false })).toEqual(await ids({}));
    // Both at once is the users under both, none here.
    expect(await ids({ paused: true, timedOut: true })).toEqual([]);
  });
});

describe('countUsers', () => {
  // Each filter counts what the list pages under it: the bootstrap user and
  // the soft-deleted one are left out of both, and every arm narrows.
  it('counts the users the list pages under each filter', async () => {
    const filters: UserFilter[] = [
      {},
      { query: '  fixturewort ' },
      { awaitingApproval: true },
      { role: 'admin' },
      { role: 'user', awaitingApproval: true, query: 'pending' },
      { timedOut: true },
      { paused: true },
    ];
    const listed = await Promise.all(filters.map((filter) => names(filter)));
    // Each filter keeps some and narrows, or a count ignoring it would pass.
    for (const list of listed.slice(1)) {
      expect(list.length).toBeGreaterThan(0);
      expect(list.length).toBeLessThan(listed[0]?.length ?? 0);
    }

    const counts = await Promise.all(
      filters.map((filter) => countUsers(asUser(E), filter, undefined)),
    );

    expect(counts).toEqual(listed.map((list) => ({ totalCount: list.length, countBefore: null })));
  });
});

describe('providersOf', () => {
  it("answers each user's linked providers, sorted, one slot per id in order", async () => {
    const answer = await providersOf(asUser(E), [B.id, A.id, C.id, A.id]);

    expect(answer).toEqual([['microsoft'], ['discord', 'google'], [], ['discord', 'google']]);
  });
});

// The terms, disclaimer and code of ethics versions each user last agreed to, which the user table and the user modal show as one
// joint version: the numbers on their row, none for one who never agreed.
describe('the versions a user agreed to', () => {
  const AGREED = { agreedTermsVersion: 7, agreedDisclaimerVersion: 3, agreedEthicsVersion: 5 };
  const NEVER = {
    agreedTermsVersion: null,
    agreedDisclaimerVersion: null,
    agreedEthicsVersion: null,
  };

  beforeAll(async () => {
    await sql`update users set agreed_terms_version = ${AGREED.agreedTermsVersion},
      agreed_disclaimer_version = ${AGREED.agreedDisclaimerVersion}, agreed_ethics_version = ${AGREED.agreedEthicsVersion},
      terms_accepted_at = now() where id = ${WILDCARD}`;
    const [never] = await sql`
      select agreed_terms_version, agreed_disclaimer_version, agreed_ethics_version from users where id = ${PENDING}`;
    expect(never).toEqual({
      agreed_terms_version: null,
      agreed_disclaimer_version: null,
      agreed_ethics_version: null,
    });
  });

  it('lists each user with the version they agreed to, and none for one who never agreed', async () => {
    const page = await listUsers(asUser(E), {}, PAGE);
    const listed = (id: string) => page.find((entry) => entry.node.id === id)?.node;

    expect(listed(WILDCARD)).toMatchObject(AGREED);
    expect(listed(PENDING)).toMatchObject(NEVER);
  });

  it('reads one user by id with the version they agreed to, for the user modal', async () => {
    const [agreed, never] = await usersForAdmin(asUser(E), [WILDCARD, PENDING]);

    expect(agreed).toMatchObject({ id: WILDCARD, ...AGREED });
    expect(never).toMatchObject({ id: PENDING, ...NEVER });
  });

  it('refuses the version to anyone but a site keeper, asked by id', async () => {
    // The precondition: the row holds a version, and the same ask as a keeper reads it.
    const [admitted] = await usersForAdmin(asUser(E), [WILDCARD]);
    expect(admitted).toMatchObject(AGREED);
    expect(A.role).toBe('user');

    const [refused] = await usersForAdmin(asUser(A), [WILDCARD]);
    expect(refused).toBeInstanceOf(Forbidden);
    await expect(listUsers(asUser(A), {}, PAGE)).rejects.toBeInstanceOf(Forbidden);
  });
});
