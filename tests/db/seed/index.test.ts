import { join } from 'node:path';
import { readFileSync, readdirSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { MIGRATIONS_DIR } from '../../support/paths';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import { MINIMAL_USER_ID } from '@/db/seed/minimal';
import { SEED_SCENARIOS, resolveScenario, seed } from '@/db/seed/index';

// M1.21 — the `minimal` scenario: one admin, one user, empty compendium.
//
// Like updated-at-trigger.test.ts (M1.18), this applies the whole migration
// set into the worker's disposable clone rather than stubbing a table or two:
// the seed writes into the real `users` table, with its real self-referencing
// audit FKs (MB.5), and "the compendium is empty" is a claim about tables that
// have to exist to be counted. sorrel_template carries none until M1.27.
//
// The handle passed to `seed()` is this file's own, built over its own client.
// That the seed writes through it rather than through some handle of its own
// is enforced mechanically, not by this test: src/db/seed/ is not one of the
// four files allowed to import connection.ts (tests/guards/lint-db-client-
// boundary.test.ts pins that set), so the handle it is given is the only one
// it can hold. See claude-docs/design-decisions/m1.21-seed-writes-through-
// its-handle.md for why it is a handle at all rather than `withAudit`.

function migrationStatements(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .flatMap((name) =>
      readFileSync(join(MIGRATIONS_DIR, name), 'utf8')
        .split('--> statement-breakpoint')
        .map((statement) => statement.trim())
        .filter(Boolean),
    );
}

// DESIGN.md §5's compendium: the global, admin-curated reference. Every table
// an admin curates and nothing workspace-scoped — `minimal` leaves all of them
// empty so a test that needs a bare reference (or M4.3's own seeding of §6's
// categories) starts from nothing.
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
let preexistingTables: string[] = [];
let preexistingTypes: string[] = [];

async function tableNames(): Promise<string[]> {
  const rows = await sql`select tablename from pg_tables where schemaname = 'public'`;
  return rows.map((row) => row.tablename as string);
}

async function enumTypeNames(): Promise<string[]> {
  const rows = await sql`
    select t.typname from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typtype = 'e'
  `;
  return rows.map((row) => row.typname as string);
}

interface UserRow {
  id: string;
  email: string;
  role: 'user' | 'admin';
  can_create_workspace: boolean;
  created_by: string;
  updated_by: string;
  deleted_at: Date | null;
}

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

  preexistingTables = await tableNames();
  preexistingTypes = await enumTypeNames();

  for (const statement of migrationStatements()) {
    await sql.unsafe(statement);
  }

  // The GUC `withAudit` publishes (M1.19) is transaction-local, so it is gone
  // by the time a test can look. This trigger records what
  // `app.current_user_id` held *inside* the transaction that inserted each
  // user — the same observation trick repository.test.ts uses with a
  // defaulted column — so "the seed publishes the acting user" is a row that
  // can be read back, not an assumption.
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
  await sql`delete from ${sql(PROBE)}`;
  await sql`delete from users`;
});

afterAll(async () => {
  for (const table of (await tableNames()).filter((name) => !preexistingTables.includes(name))) {
    await sql.unsafe(`drop table if exists "${table}" cascade`);
  }
  for (const type of (await enumTypeNames()).filter((name) => !preexistingTypes.includes(name))) {
    await sql.unsafe(`drop type if exists "${type}" cascade`);
  }
  await sql.unsafe(`drop function if exists ${PROBE}() cascade`);
  await sql.unsafe('drop function if exists set_updated_at() cascade');
  await sql.end();
});

describe('seed(db, { scenario: "minimal" })', () => {
  it('produces exactly one admin and one user', async () => {
    await seed(db, { scenario: 'minimal' });

    const users = await allUsers();
    expect(users).toHaveLength(2);
    expect(users.filter((u) => u.role === 'admin')).toHaveLength(1);
    expect(users.filter((u) => u.role === 'user')).toHaveLength(1);
    expect(users.every((u) => u.deleted_at === null)).toBe(true);
  });

  // TASKS.md's fourth criterion: the bootstrap row carries the fixed UUID
  // MB.5 defines and is its own creator — one statement, the self-satisfying
  // insert src/db/bootstrap.ts describes, not a generated id stamped by some
  // other row.
  it('inserts the admin as the bootstrap user, its own createdBy/updatedBy, under the fixed MB.5 id', async () => {
    await seed(db, { scenario: 'minimal' });

    const [admin] = (await allUsers()).filter((u) => u.role === 'admin');
    expect(admin.id).toBe(BOOTSTRAP_USER_ID);
    expect(admin.created_by).toBe(BOOTSTRAP_USER_ID);
    expect(admin.updated_by).toBe(BOOTSTRAP_USER_ID);
  });

  it('creates the plain user as the bootstrap admin, under a fixed id of its own', async () => {
    await seed(db, { scenario: 'minimal' });

    const [user] = (await allUsers()).filter((u) => u.role === 'user');
    expect(user.id).toBe(MINIMAL_USER_ID);
    expect(user.created_by).toBe(BOOTSTRAP_USER_ID);
    expect(user.updated_by).toBe(BOOTSTRAP_USER_ID);
  });

  // The site is invite-gated (CLAUDE.md's domain invariants): `minimal` is a
  // bare install, so neither seeded account has earned a workspace. A seed
  // that quietly flipped this would hide the gate from every test built on it.
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

  // "Idempotent or explicitly truncates first" — this seed is the former. A
  // second run has to leave the same two rows, not a third, and must not
  // throw on the unique index it would otherwise trip.
  it('is idempotent: re-running leaves the same two rows', async () => {
    await seed(db, { scenario: 'minimal' });
    const first = await allUsers();

    await expect(seed(db, { scenario: 'minimal' })).resolves.toBeUndefined();

    expect(await allUsers()).toEqual(first);
    expect(await countOf(PROBE), 'no second insert reached the users table').toBe(2);
  });

  // Why the counts above could hold without the seed working: a run that
  // wrote nothing would still find the compendium empty. The precondition
  // that says otherwise — a fresh clone really starts at zero users.
  it('starts from an empty users table, so the two rows are the seed’s', async () => {
    expect(await countOf('users')).toBe(0);
    await seed(db, { scenario: 'minimal' });
    expect(await countOf('users')).toBe(2);
  });
});

// M1.24 — the seed CLI and the Docker hook both pick a scenario from the
// `SEED_SCENARIO` environment variable, and neither may pick one by guessing.
// The parse lives beside the union it produces rather than in scripts/, so the
// compose service and `npm run db:seed` cannot disagree about what "demo"
// means, and so it is testable at all (scripts/ is outside tsconfig's
// `include` and runs its work at import time).
describe('resolveScenario', () => {
  it('defaults to minimal when nothing is set', () => {
    expect(resolveScenario(undefined)).toBe('minimal');
  });

  // Compose interpolates `${SEED_SCENARIO:-minimal}`, but a shell that exports
  // the variable empty reaches this as '' rather than undefined — the same
  // "unset" in every sense a caller means it.
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

  // The failure that matters: a typo must not quietly seed `minimal`. Someone
  // asking for `demo` and getting one admin and one user would debug the app,
  // not the variable.
  it('refuses an unknown name rather than falling back, and names the ones that exist', () => {
    expect(() => resolveScenario('Standard')).toThrow(/minimal, standard, demo/);
    expect(() => resolveScenario('everything')).toThrow(/everything/);
  });

  it('lists exactly the scenarios seed() switches on', () => {
    expect([...SEED_SCENARIOS]).toEqual(['minimal', 'standard', 'demo']);
  });
});

// The other two scenarios are asserted where they live — standard.test.ts
// (M1.22) and demo.test.ts (M1.23), each of which ends by routing its own name
// through `seed(db, { scenario })`. There is no longer a scenario that throws:
// M1.23 was the last to land, and the block that asserted `demo` did went with
// it. This file's `beforeEach` is `delete from users` alone, which is only
// enough for a scenario that writes users and nothing else — another reason
// the other two are exercised against their own fixtures rather than here.
