import { beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { useTestDatabase } from '../../support/db/database';
import { BOOTSTRAP_USER_ID, DEMO_WORKSPACE_ID } from '@/db/bootstrap';
import { seedDemoCoven } from '@/db/seed/demo-coven';
import { FIXTURE_USERS } from '@/db/seed/standard';
import type { Row } from '../types';

// The demo coven seed against the standard scenario's users: the workspace row, who is seated and how, and what a second run leaves alone.
// `standard` does not seed the coven, so each case starts from none.

let sql: ReturnType<typeof postgres>;
useTestDatabase((client) => (sql = client));

const run = () => seedDemoCoven(drizzle(sql));

const seats = async (): Promise<Record<string, string>> => {
  const rows = await sql<{ user_id: string; role: string }[]>`
    select user_id, role from workspace_members
    where workspace_id = ${DEMO_WORKSPACE_ID} and deleted_at is null
  `;
  return Object.fromEntries(rows.map((row) => [row.user_id, row.role]));
};

const countRows = async () => {
  const [{ rows }] = await sql<{ rows: number }[]>`
    select (select count(*) from workspaces where demo)::int
         + (select count(*) from workspace_members where workspace_id = ${DEMO_WORKSPACE_ID})::int as rows
  `;
  return rows;
};

beforeEach(async () => {
  await sql`delete from workspace_members where workspace_id = ${DEMO_WORKSPACE_ID}`;
  await sql`delete from workspaces where id = ${DEMO_WORKSPACE_ID}`;
});

describe('the demo coven seed', () => {
  it('gives a database without one a single demo row on the slug sorrel-and-salt-demo', async () => {
    expect(await sql`select 1 from workspaces where demo`).toHaveLength(0);

    await run();

    const rows = await sql<Row[]>`select id, name, slug, demo from workspaces where demo`;
    expect(rows).toEqual([
      {
        id: DEMO_WORKSPACE_ID,
        name: 'Sorrel & Salt Demo',
        slug: 'sorrel-and-salt-demo',
        demo: true,
      },
    ]);
  });

  it('seats the system user and every admin as owner and everyone else as viewer', async () => {
    // Preconditions: an admin, a curator and plain users exist to be told apart.
    const roles = await sql<{ id: string; role: string }[]>`
      select id, role from users where deleted_at is null
    `;
    expect(new Set(roles.map(({ role }) => role))).toEqual(new Set(['user', 'curator', 'admin']));

    await run();

    const expected = Object.fromEntries(
      roles.map(({ id, role }) => [
        id,
        id === BOOTSTRAP_USER_ID || role === 'admin' ? 'owner' : 'viewer',
      ]),
    );
    expect(await seats()).toEqual(expected);
    expect(expected[BOOTSTRAP_USER_ID]).toBe('owner');
    expect(expected[FIXTURE_USERS.E.id]).toBe('owner');
    expect(expected[FIXTURE_USERS.F.id]).toBe('viewer');
    const [{ invited }] = await sql<{ invited: number }[]>`
      select count(invited_by)::int as invited from workspace_members where workspace_id = ${DEMO_WORKSPACE_ID}
    `;
    expect(invited).toBe(0);
  });

  it('inserts nothing on a second run', async () => {
    await run();
    const before = await countRows();
    expect(before).toBeGreaterThan(1);

    await run();

    expect(await countRows()).toBe(before);
  });

  it('does not seat again a user whose seat is soft-deleted, an admin included', async () => {
    await run();
    await sql`
      update workspace_members set deleted_at = now(), deleted_by = ${FIXTURE_USERS.C.id}
      where workspace_id = ${DEMO_WORKSPACE_ID} and user_id in (${FIXTURE_USERS.C.id}, ${FIXTURE_USERS.E.id})
    `;

    await run();

    const seated = await seats();
    expect(seated[FIXTURE_USERS.C.id]).toBeUndefined();
    expect(seated[FIXTURE_USERS.E.id]).toBeUndefined();
    const rows = await sql`
      select 1 from workspace_members
      where workspace_id = ${DEMO_WORKSPACE_ID} and user_id in (${FIXTURE_USERS.C.id}, ${FIXTURE_USERS.E.id})
    `;
    expect(rows).toHaveLength(2);
  });

  it('seats a user created since the last run, and leaves a deleted user unseated', async () => {
    await run();
    const lateId = '00000000-0000-0000-0000-0000000000a1';
    const goneId = '00000000-0000-0000-0000-0000000000a2';
    await sql`
      insert into users (id, name, email, created_by, updated_by, deleted_at, deleted_by)
      values (${lateId}, 'Late Testwort', 'late@seed.test', ${BOOTSTRAP_USER_ID}, ${BOOTSTRAP_USER_ID}, null, null),
             (${goneId}, 'Gone Testwort', 'gone@seed.test', ${BOOTSTRAP_USER_ID}, ${BOOTSTRAP_USER_ID}, now(), ${BOOTSTRAP_USER_ID})
    `;

    await run();

    const seated = await seats();
    expect(seated[lateId]).toBe('viewer');
    expect(seated[goneId]).toBeUndefined();
  });

  it('refuses, naming the coven, when another coven already holds the slug', async () => {
    await sql`
      insert into workspaces (id, name, slug, created_by, updated_by)
      values (${'00000000-0000-0000-0000-0000000000b1'}, 'Another Coven', 'sorrel-and-salt-demo', ${FIXTURE_USERS.A.id}, ${FIXTURE_USERS.A.id})
    `;

    await expect(run()).rejects.toThrow(/Another Coven/);
    expect(await sql`select 1 from workspaces where demo`).toHaveLength(0);
  });
});
