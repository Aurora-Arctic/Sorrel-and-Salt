import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { truncateAllTables } from '../../support/seeded-database';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import { MINIMAL_USER_ID } from '@/db/seed/minimal';
import { SEED_SCENARIOS, resolveScenario, seed } from '@/db/seed/index';
import { seedAstrology } from '@/db/seed/astrology';
import { seedCategories } from '@/db/seed/categories';
import { seedDeities } from '@/db/seed/deities';
import { seedForms } from '@/db/seed/forms';
import type { SeedEntry, UserRow } from './types';

// The `minimal` scenario against the real schema, every table emptied first.
// The handle is this file's own; that the seed writes through it rather than
// a client of its own is enforced by lint, not here —
// claude-docs/db/seed-module.md, "The seed module".

// Every admin-curated table; `minimal` leaves all of them empty.
const COMPENDIUM_TABLES = [
  'categories',
  'category_groups',
  'ingredient_form_groups',
  'ingredient_forms',
  'ingredients',
];

const PROBE = 'seed_probe_acting_user';

let sql: ReturnType<typeof postgres>;
let db: ReturnType<typeof drizzle>;

async function allUsers(): Promise<UserRow[]> {
  return sql<UserRow[]>`
    select id, email, role, can_create_workspace, created_by, updated_by, deleted_at
    from users order by role, id
  `;
}

async function countOf(table: string): Promise<number> {
  const [{ count }] = await sql<{ count: string }[]>`select count(*) from ${sql(table)}`;
  return Number(count);
}

beforeAll(async () => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
  db = drizzle(sql);

  // Records what `app.current_user_id` held inside the inserting transaction;
  // it is transaction-local and gone by the time a test could read it.
  await sql`create table ${sql(PROBE)} (user_id uuid not null, acting_user text)`;
  await sql.unsafe(`
    create function ${PROBE}() returns trigger language plpgsql as $$
    begin
      insert into ${PROBE} (user_id, acting_user)
      values (new.id, current_setting('app.current_user_id', true));
      return new;
    end
    $$
  `);
  await sql.unsafe(
    `create trigger ${PROBE} after insert on users for each row execute function ${PROBE}()`,
  );
});

beforeEach(async () => {
  await truncateAllTables(sql);
});

// Only this file's own objects come down.
afterAll(async () => {
  await sql.unsafe(`drop function if exists ${PROBE}() cascade`);
  await sql`drop table if exists ${sql(PROBE)}`;
  await sql.end();
});

describe('seed(db, { scenario: "minimal" })', () => {
  // MB.58: the system user is a creator, not an admin, so a bare install has none.
  it('produces exactly one system user and one user, and no admin', async () => {
    await seed(db, { scenario: 'minimal' });

    const users = await allUsers();
    expect(users.map((u) => u.id)).toEqual([BOOTSTRAP_USER_ID, MINIMAL_USER_ID]);
    expect(users.map((u) => u.role)).toEqual(['user', 'user']);
    expect(users.every((u) => u.deleted_at === null)).toBe(true);
  });

  // The bootstrap row is its own creator under the fixed id: one self-satisfying insert.
  it('inserts the system user as its own createdBy/updatedBy, under the fixed MB.5 id', async () => {
    await seed(db, { scenario: 'minimal' });

    const [system] = (await allUsers()).filter((u) => u.id === BOOTSTRAP_USER_ID);
    expect(system.created_by).toBe(BOOTSTRAP_USER_ID);
    expect(system.updated_by).toBe(BOOTSTRAP_USER_ID);
  });

  it('creates the plain user as the bootstrap user, under a fixed id of its own', async () => {
    await seed(db, { scenario: 'minimal' });

    const [user] = (await allUsers()).filter((u) => u.id === MINIMAL_USER_ID);
    expect(user.role).toBe('user');
    expect(user.created_by).toBe(BOOTSTRAP_USER_ID);
    expect(user.updated_by).toBe(BOOTSTRAP_USER_ID);
  });

  // Invite-gated: a bare install has granted nothing, and a seed that flipped
  // this would hide the gate from every test built on it.
  it('leaves canCreateWorkspace false on both — nothing in a bare install has granted it', async () => {
    await seed(db, { scenario: 'minimal' });

    expect((await allUsers()).map((u) => u.can_create_workspace)).toEqual([false, false]);
  });

  it('publishes the bootstrap user as app.current_user_id for both inserts, as withAudit would', async () => {
    await seed(db, { scenario: 'minimal' });

    const rows = await sql<{ user_id: string; acting_user: string | null }[]>`
      select user_id, acting_user from ${sql(PROBE)} order by user_id
    `;
    expect(rows.map((r) => r.user_id)).toEqual([BOOTSTRAP_USER_ID, MINIMAL_USER_ID]);
    expect(rows.map((r) => r.acting_user)).toEqual([BOOTSTRAP_USER_ID, BOOTSTRAP_USER_ID]);
  });

  it('leaves the compendium empty', async () => {
    await seed(db, { scenario: 'minimal' });

    for (const table of COMPENDIUM_TABLES) {
      expect(await countOf(table), table).toBe(0);
    }
  });

  // Idempotent rather than truncate-first: the same two rows, and no trip on the unique index.
  it('is idempotent: re-running leaves the same two rows', async () => {
    await seed(db, { scenario: 'minimal' });
    const first = await allUsers();

    await expect(seed(db, { scenario: 'minimal' })).resolves.toBeUndefined();

    expect(await allUsers()).toEqual(first);
    expect(await countOf(PROBE), 'no second insert reached the users table').toBe(2);
  });

  // A run that wrote nothing would still find the compendium empty, so the
  // users table is asserted empty first.
  it('starts from an empty users table, so the two rows are the seed’s', async () => {
    expect(await countOf('users')).toBe(0);
    await seed(db, { scenario: 'minimal' });
    expect(await countOf('users')).toBe(2);
  });
});

// The CLI and the Docker hook both read `SEED_SCENARIO`. The parse lives
// beside the union so the two cannot disagree, and so it is testable at all
// (scripts/ runs its work at import time).
describe('resolveScenario', () => {
  it('defaults to minimal when nothing is set', () => {
    expect(resolveScenario(undefined)).toBe('minimal');
  });

  // Compose's `${SEED_SCENARIO:-minimal}` reaches this as '' when the shell exports it empty.
  it('defaults to minimal when the variable is set but blank', () => {
    expect(resolveScenario('')).toBe('minimal');
    expect(resolveScenario('   ')).toBe('minimal');
  });

  it.each([...SEED_SCENARIOS])('accepts %s, the name seed() takes', (scenario) => {
    expect(resolveScenario(scenario)).toBe(scenario);
  });

  it('accepts a name with surrounding whitespace', () => {
    expect(resolveScenario(' demo\n')).toBe('demo');
  });

  // A typo must not quietly seed `minimal`.
  it('refuses an unknown name rather than falling back, and names the ones that exist', () => {
    expect(() => resolveScenario('Standard')).toThrow(/minimal, standard, demo/);
    expect(() => resolveScenario('everything')).toThrow(/everything/);
  });

  it('lists exactly the scenarios seed() switches on', () => {
    expect([...SEED_SCENARIOS]).toEqual(['minimal', 'standard', 'demo']);
  });
});

// Every entry point opens with `beginSeedTransaction`, so each inserts the
// bootstrap row when it is missing — the reference-data seeds alone, on staging
// and production. From wherever, it is no admin (MB.58): it has no OAuth
// account and nobody can sign in as it, so as an admin it would only be a
// revocable row on /admin/users.
const SEED_ENTRIES: SeedEntry[] = [
  ...SEED_SCENARIOS.map((scenario): SeedEntry => [
    `the ${scenario} scenario`,
    (handle) => seed(handle, { scenario }),
  ]),
  ['the category seed', seedCategories],
  ['the form seed', seedForms],
  ['the astrology seed', seedAstrology],
  ['the deity seed', seedDeities],
];

describe('the bootstrap user, from every seed', () => {
  it.each(SEED_ENTRIES)('%s inserts it as a plain user', async (_name, run) => {
    // Precondition: the row is this run's insert, not one left over.
    expect(await countOf('users')).toBe(0);

    await run(db);

    const [system] = (await allUsers()).filter((u) => u.id === BOOTSTRAP_USER_ID);
    expect(system).toMatchObject({ email: 'admin@seed.sorrelandsalt.com', role: 'user' });
  });
});

// The other scenarios are asserted in standard.test.ts and demo.test.ts; this
// file's probe watches `users` alone.
