import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { truncateAllTables } from '../../support/seeded-database';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import { CATEGORIES } from '@/db/seed/categories';
import { FORMS } from '@/db/seed/forms';
import {
  COMPENDIUM_INGREDIENTS,
  FIXTURE_USERS,
  WORKSPACE_W_ID,
  WORKSPACE_X_ID,
  seedStandard,
} from '@/db/seed/standard';
import { seed } from '@/db/seed/index';

// M1.22 — the `standard` scenario: DESIGN.md §"Seed data"'s five fixture users,
// workspaces W and X, and a populated compendium.
//
// Like index.test.ts (M1.21) and categories.test.ts (M4.3), this runs against
// the real schema rather than a stubbed table or two. It has to:
// `workspace_members` is keyed on two real foreign keys, the compendium's
// identity lives in a *generated* column over three others, and "W and X
// share no members" is a claim about rows in the real tables, not about the
// shape of an object this module returns. The worker's sorrel_test_<n> clone
// arrives with every migration applied and — since this very scenario is what
// the template carries (M1.27, tests/support/db-setup.ts) — already seeded
// with it, re-cloned that way before this file runs. A test *about* the seed
// needs the tables empty, so `beforeEach` truncates every one of them; nothing
// is built here and nothing put back afterwards. Until M1.27 the template was
// empty and this file applied the migration set itself.
//
// The scenario exists to be awkward on purpose (TASKS.md M1.22): four plants
// and a cat all labelled "Cat's Claw", a mineral variety, a `none`, an
// `unknown`, and a form nobody has curated. Every assertion below that looks
// like trivia is one of those cases, and M4.7/M4.7a and M8.3/M8.3a are what
// consume them.

const PROBE = 'standard_probe_acting_user';

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  can_create_workspace: boolean;
  created_by: string;
  updated_by: string;
  deleted_at: Date | null;
}

interface MemberRow {
  workspace_id: string;
  user_id: string;
  role: 'viewer' | 'member' | 'owner';
  created_by: string;
}

interface IngredientRow {
  id: string;
  workspace_id: string | null;
  name: string;
  canonical_name: string | null;
  nomenclature: string;
  form: string | null;
  canonical_key: string;
  created_by: string;
}

let sql: ReturnType<typeof postgres>;
let db: ReturnType<typeof drizzle>;

async function allUsers(): Promise<UserRow[]> {
  return sql<UserRow[]>`select * from users order by email`;
}

async function allMembers(): Promise<MemberRow[]> {
  return sql<MemberRow[]>`select * from workspace_members order by workspace_id, user_id`;
}

async function compendium(): Promise<IngredientRow[]> {
  return sql<IngredientRow[]>`
    select * from ingredients where workspace_id is null order by name, canonical_name
  `;
}

async function countOf(table: string): Promise<number> {
  const [{ count }] = await sql<{ count: string }[]>`select count(*) from ${sql(table)}`;
  return Number(count);
}

/** The curated vocabulary, lowercased the way `canonical_key` normalises a form. */
async function curatedFormNames(): Promise<Set<string>> {
  const rows = await sql<{ name: string }[]>`select name from ingredient_forms`;
  return new Set(rows.map((row) => row.name.toLowerCase()));
}

beforeAll(async () => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
  db = drizzle(sql);

  // The same observation trick index.test.ts uses: `app.current_user_id` is
  // transaction-local, so it is gone by the time a test could read it. This
  // records what it held *inside* the transaction that inserted each
  // ingredient, which makes "the seed publishes the acting user" a row rather
  // than an assumption.
  await sql`create table ${sql(PROBE)} (ingredient_id uuid not null, acting_user text)`;
  await sql.unsafe(`
    create function ${PROBE}() returns trigger language plpgsql as $$
    begin
      insert into ${PROBE} (ingredient_id, acting_user)
      values (new.id, current_setting('app.current_user_id', true));
      return new;
    end
    $$
  `);
  await sql.unsafe(
    `create trigger ${PROBE} after insert on ingredients for each row execute function ${PROBE}()`,
  );
});

// Every table in `public` emptied, the probe included — one `truncate …
// cascade` rather than the ordered `delete from` list this used to be: the
// clone arrives already holding this scenario, every child foreign key is
// NO ACTION, and a table-by-table delete would be refused. The empty tables
// are the starting state every test below assumes: the one the old empty
// template gave, reached the other way round.
beforeEach(async () => {
  await truncateAllTables(sql);
});

// Only this file's own objects come down; the schema is the clone's and the
// next file gets a fresh one.
afterAll(async () => {
  await sql.unsafe(`drop function if exists ${PROBE}() cascade`);
  await sql`drop table if exists ${sql(PROBE)}`;
  await sql.end();
});

describe('the cast: five fixture users, A–E', () => {
  it('creates all five, under the ids the fixtures name, plus the bootstrap admin', async () => {
    // The precondition for every count below: the truncated clone really
    // starts empty, so these rows are this seed's rather than the template's
    // copy of the same scenario or a previous test's.
    expect(await countOf('users')).toBe(0);

    await seedStandard(db);

    const users = await allUsers();
    expect(users.filter((u) => u.deleted_at !== null)).toHaveLength(0);
    expect(new Set(users.map((u) => u.id))).toEqual(
      new Set([BOOTSTRAP_USER_ID, ...Object.values(FIXTURE_USERS).map((u) => u.id)]),
    );
  });

  it('gives each the role DESIGN.md’s fixture table documents', async () => {
    await seedStandard(db);

    const byId = new Map((await allUsers()).map((u) => [u.id, u]));
    expect(byId.get(FIXTURE_USERS.A.id)?.role).toBe('user');
    expect(byId.get(FIXTURE_USERS.B.id)?.role).toBe('user');
    expect(byId.get(FIXTURE_USERS.C.id)?.role).toBe('user');
    expect(byId.get(FIXTURE_USERS.D.id)?.role).toBe('user');
    // E is the site admin — the only one, since the bootstrap admin is the
    // seed's own identity rather than a member of the cast.
    expect(byId.get(FIXTURE_USERS.E.id)?.role).toBe('admin');
  });

  // CLAUDE.md's invite-gate: the flag turns true by accepting an invitation or
  // an admin grant, and nothing else. A–D are in workspaces, which is how they
  // got it; E is in none and has never been invited, so E's rights come from
  // being an admin rather than from the flag — which is exactly the case
  // M3.2's gate has to get right.
  it('grants canCreateWorkspace to the four who joined a workspace, and to no one else', async () => {
    await seedStandard(db);

    const byId = new Map((await allUsers()).map((u) => [u.id, u]));
    expect(byId.get(FIXTURE_USERS.A.id)?.can_create_workspace).toBe(true);
    expect(byId.get(FIXTURE_USERS.B.id)?.can_create_workspace).toBe(true);
    expect(byId.get(FIXTURE_USERS.C.id)?.can_create_workspace).toBe(true);
    expect(byId.get(FIXTURE_USERS.D.id)?.can_create_workspace).toBe(true);
    expect(byId.get(FIXTURE_USERS.E.id)?.can_create_workspace).toBe(false);
  });

  it('stamps every user as the bootstrap admin’s', async () => {
    await seedStandard(db);

    const seeded = (await allUsers()).filter((u) => u.id !== BOOTSTRAP_USER_ID);
    expect(seeded.map((u) => u.created_by)).toEqual(seeded.map(() => BOOTSTRAP_USER_ID));
    expect(seeded.map((u) => u.updated_by)).toEqual(seeded.map(() => BOOTSTRAP_USER_ID));
  });
});

describe('the workspaces: W, X, and nothing shared', () => {
  it('creates both, each under a fixed id and a derived slug', async () => {
    await seedStandard(db);

    const rows = await sql<{ id: string; name: string; slug: string }[]>`
      select id, name, slug from workspaces order by slug
    `;
    expect(new Set(rows.map((r) => r.id))).toEqual(new Set([WORKSPACE_W_ID, WORKSPACE_X_ID]));
    expect(rows.every((r) => r.slug.length > 0)).toBe(true);
  });

  it('seats A as owner, B as member and C as viewer in W', async () => {
    await seedStandard(db);

    const inW = (await allMembers()).filter((m) => m.workspace_id === WORKSPACE_W_ID);
    expect(inW.map((m) => [m.user_id, m.role])).toEqual(
      expect.arrayContaining([
        [FIXTURE_USERS.A.id, 'owner'],
        [FIXTURE_USERS.B.id, 'member'],
        [FIXTURE_USERS.C.id, 'viewer'],
      ]),
    );
    expect(inW).toHaveLength(3);
  });

  it('seats D in X and nobody else', async () => {
    await seedStandard(db);

    const inX = (await allMembers()).filter((m) => m.workspace_id === WORKSPACE_X_ID);
    expect(inX.map((m) => [m.user_id, m.role])).toEqual([[FIXTURE_USERS.D.id, 'member']]);
  });

  // The isolation fixture. Asserted as an intersection rather than as "D is
  // absent from W", and with its preconditions stated: an empty intersection
  // between two empty sets would pass just as happily.
  it('shares no member between W and X', async () => {
    await seedStandard(db);

    const members = await allMembers();
    const inW = new Set(
      members.filter((m) => m.workspace_id === WORKSPACE_W_ID).map((m) => m.user_id),
    );
    const inX = new Set(
      members.filter((m) => m.workspace_id === WORKSPACE_X_ID).map((m) => m.user_id),
    );

    expect(inW.size, 'W has members, so the empty intersection is not vacuous').toBe(3);
    expect(inX.size, 'X has members, so the empty intersection is not vacuous').toBe(1);
    expect([...inW].filter((id) => inX.has(id))).toEqual([]);
  });

  it('leaves E in no workspace at all', async () => {
    await seedStandard(db);

    const members = await allMembers();
    // The precondition: E exists, and membership rows exist for other people,
    // so "no row for E" is the seed's doing rather than an empty table.
    expect((await allUsers()).some((u) => u.id === FIXTURE_USERS.E.id)).toBe(true);
    expect(members.length).toBe(4);
    expect(members.filter((m) => m.user_id === FIXTURE_USERS.E.id)).toEqual([]);
  });
});

describe('the compendium', () => {
  it('seeds the admin-curated reference data the scenario stands on', async () => {
    await seedStandard(db);

    // `standard` is a whole populated compendium, not just ingredients: M4.3's
    // categories and M4.3a's forms are what an ingredient is filed under and
    // what its `form` is autofilled from, and both land a task ahead of this
    // one precisely so this scenario can consume them.
    expect(await countOf('categories')).toBe(CATEGORIES.length);
    expect(await countOf('ingredient_forms')).toBe(FORMS.length);
  });

  it('holds enough entries to exercise search', async () => {
    await seedStandard(db);

    const entries = await compendium();
    expect(entries.length).toBe(COMPENDIUM_INGREDIENTS.length);
    expect(entries.length).toBeGreaterThanOrEqual(20);
    // Every entry is global: a compendium row carries no workspace.
    expect(entries.every((e) => e.workspace_id === null)).toBe(true);
  });

  it('declares a nomenclature on every entry, spanning more than one naming system', async () => {
    await seedStandard(db);

    const entries = await compendium();
    expect(entries.filter((e) => e.nomenclature === null)).toEqual([]);
    // The column is NOT NULL, so the assertion above cannot fail on its own.
    // What it could hide is a seed that answered `unknown` everywhere rather
    // than curating: the systems actually used are the real claim.
    expect(new Set(entries.map((e) => e.nomenclature)).size).toBeGreaterThanOrEqual(5);
  });

  it('carries a `none`, an `unknown`, and a mineral variety', async () => {
    await seedStandard(db);

    const entries = await compendium();
    const none = entries.filter((e) => e.nomenclature === 'none');
    const unknown = entries.filter((e) => e.nomenclature === 'unknown');
    const variety = entries.filter((e) => /\bvar\./.test(e.canonical_name ?? ''));

    expect(none.length).toBeGreaterThanOrEqual(1);
    expect(unknown.length).toBeGreaterThanOrEqual(1);
    expect(variety.length).toBeGreaterThanOrEqual(1);

    // §5's biconditional, seeded the way it is meant to read rather than the
    // way that merely satisfies the CHECK: both absences are positive answers.
    expect(none.every((e) => e.canonical_name === null)).toBe(true);
    expect(unknown.every((e) => e.canonical_name === null)).toBe(true);
    expect(variety.some((e) => e.nomenclature === 'mineral')).toBe(true);
  });

  // §5's own worked example, and the reason identity moved off the label.
  it('seeds the full Cat’s Claw set — four plants and a cat — under one label', async () => {
    await seedStandard(db);

    const catsClaws = (await compendium()).filter((e) => e.name === "Cat's Claw");

    expect(catsClaws.map((e) => e.canonical_name).sort()).toEqual([
      'Dolichandra unguis-cati',
      'Felis catus',
      'Senegalia greggii',
      'Uncaria guianensis',
      'Uncaria tomentosa',
    ]);

    const cat = catsClaws.find((e) => e.canonical_name === 'Felis catus');
    expect(cat?.nomenclature).toBe('zoological');
    expect(cat?.form).toBe('claw');

    // What makes five rows under one label legal at all: identity is the
    // generated key, and each of the five has its own.
    expect(new Set(catsClaws.map((e) => e.canonical_key)).size).toBe(5);
  });

  it('puts an in-use form outside the curated vocabulary, and most inside it', async () => {
    await seedStandard(db);

    const curated = await curatedFormNames();
    // The precondition: the vocabulary is there to be outside of. Without it
    // every form would count as uncurated and the test would pass on nothing.
    expect(curated.size).toBe(FORMS.length);

    const inUse = [...new Set((await compendium()).map((e) => e.form).filter(Boolean))] as string[];
    const outside = inUse.filter((form) => !curated.has(form.toLowerCase()));

    expect(outside.length).toBeGreaterThanOrEqual(1);
    // …and the rest are curated, so M4.7a has both halves of its list: the
    // vocabulary, and the admin's curation to-do.
    expect(inUse.length - outside.length).toBeGreaterThanOrEqual(10);
  });

  it('files entries under categories, and gives some of them folk names', async () => {
    await seedStandard(db);

    expect(await countOf('ingredient_categories')).toBeGreaterThan(0);
    expect(await countOf('ingredient_folk_names')).toBeGreaterThan(0);

    // Every assignment points at a real seeded category and a real seeded
    // compendium entry — a dangling id on either side renders nothing.
    const [{ count: dangling }] = await sql<{ count: string }[]>`
      select count(*) from ingredient_categories ic
      where not exists (select 1 from categories c where c.id = ic.category_id)
         or not exists (select 1 from ingredients i where i.id = ic.ingredient_id)
    `;
    expect(Number(dangling)).toBe(0);
  });

  it('publishes the bootstrap user as app.current_user_id for every ingredient insert', async () => {
    await seedStandard(db);

    const rows = await sql<{ acting_user: string | null }[]>`select acting_user from ${sql(PROBE)}`;
    expect(rows).toHaveLength(COMPENDIUM_INGREDIENTS.length);
    expect(rows.every((r) => r.acting_user === BOOTSTRAP_USER_ID)).toBe(true);
  });
});

describe('re-running the scenario', () => {
  it('is idempotent: a second run adds nothing anywhere', async () => {
    await seedStandard(db);

    const before = {
      users: await countOf('users'),
      workspaces: await countOf('workspaces'),
      members: await countOf('workspace_members'),
      ingredients: await countOf('ingredients'),
      folkNames: await countOf('ingredient_folk_names'),
      assignments: await countOf('ingredient_categories'),
      categories: await countOf('categories'),
      forms: await countOf('ingredient_forms'),
    };

    await expect(seedStandard(db)).resolves.toBeUndefined();

    expect({
      users: await countOf('users'),
      workspaces: await countOf('workspaces'),
      members: await countOf('workspace_members'),
      ingredients: await countOf('ingredients'),
      folkNames: await countOf('ingredient_folk_names'),
      assignments: await countOf('ingredient_categories'),
      categories: await countOf('categories'),
      forms: await countOf('ingredient_forms'),
    }).toEqual(before);
  });

  // Idempotency keys on identity and ignores `deleted_at`, exactly as
  // seedCategories does: the partial unique indexes stop only a second *live*
  // row, so an entry an admin soft-deleted would otherwise come back on the
  // next run and quietly undo the deletion.
  it('does not resurrect a compendium entry an admin has soft-deleted', async () => {
    await seedStandard(db);
    const [victim] = await compendium();

    await sql`
      update ingredients set deleted_at = now(), deleted_by = ${BOOTSTRAP_USER_ID}
      where id = ${victim.id}
    `;
    expect((await compendium()).some((e) => e.id === victim.id)).toBe(true);

    await seedStandard(db);

    const live = await sql<{ id: string }[]>`
      select id from ingredients where workspace_id is null and deleted_at is null
    `;
    expect(live.map((r) => r.id)).not.toContain(victim.id);
    expect(await countOf('ingredients')).toBe(COMPENDIUM_INGREDIENTS.length);
  });
});

describe('seed(db, { scenario })', () => {
  it('routes "standard" to this scenario', async () => {
    await seed(db, { scenario: 'standard' });

    expect(await countOf('workspaces')).toBe(2);
    expect(await countOf('ingredients')).toBe(COMPENDIUM_INGREDIENTS.length);
  });
});
