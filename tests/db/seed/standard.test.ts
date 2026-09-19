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

// The `standard` scenario against the real schema, every table emptied first:
// membership is two real foreign keys and the compendium's identity a
// generated column. It is awkward on purpose — five "Cat's Claw"s, a mineral
// variety, a `none`, an `unknown`, an uncurated form —
// claude-docs/db.md, "The standard scenario".

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

  // Records what `app.current_user_id` held inside the inserting transaction;
  // it is transaction-local and gone by the time a test could read it.
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

beforeEach(async () => {
  await truncateAllTables(sql);
});

// Only this file's own objects come down.
afterAll(async () => {
  await sql.unsafe(`drop function if exists ${PROBE}() cascade`);
  await sql`drop table if exists ${sql(PROBE)}`;
  await sql.end();
});

describe('the cast: five fixture users, A–E', () => {
  it('creates all five, under the ids the fixtures name, plus the bootstrap admin', async () => {
    // Precondition: the truncated clone really starts empty, so these rows are this seed's.
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
    // E is the only site admin: the bootstrap admin is the seed's identity, not cast.
    expect(byId.get(FIXTURE_USERS.E.id)?.role).toBe('admin');
  });

  // Invite-gate: A–D earned the flag by joining a workspace; E is in none and
  // never invited, so E's rights come from being an admin, not from the flag.
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

  // An intersection with its preconditions stated: two empty sets also intersect empty.
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
    // Precondition: E exists and other memberships exist, so "no row for E"
    // is the seed's doing rather than an empty table.
    expect((await allUsers()).some((u) => u.id === FIXTURE_USERS.E.id)).toBe(true);
    expect(members.length).toBe(4);
    expect(members.filter((m) => m.user_id === FIXTURE_USERS.E.id)).toEqual([]);
  });
});

describe('the compendium', () => {
  it('seeds the admin-curated reference data the scenario stands on', async () => {
    await seedStandard(db);

    // A whole compendium: categories and forms are what an entry is filed
    // under and what its `form` is autofilled from.
    expect(await countOf('categories')).toBe(CATEGORIES.length);
    expect(await countOf('ingredient_forms')).toBe(FORMS.length);
  });

  it('holds enough entries to exercise search', async () => {
    await seedStandard(db);

    const entries = await compendium();
    expect(entries.length).toBe(COMPENDIUM_INGREDIENTS.length);
    expect(entries.length).toBeGreaterThanOrEqual(20);
    expect(entries.every((e) => e.workspace_id === null)).toBe(true);
  });

  it('declares a nomenclature on every entry, spanning more than one naming system', async () => {
    await seedStandard(db);

    const entries = await compendium();
    expect(entries.filter((e) => e.nomenclature === null)).toEqual([]);
    // The column is NOT NULL, so the line above cannot fail alone; the claim is
    // that the seed curated rather than answering `unknown` everywhere.
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

    // Both absences are positive answers, not merely the shape that satisfies the CHECK.
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

    // Five rows under one label is legal because each has its own generated key.
    expect(new Set(catsClaws.map((e) => e.canonical_key)).size).toBe(5);
  });

  it('puts an in-use form outside the curated vocabulary, and most inside it', async () => {
    await seedStandard(db);

    const curated = await curatedFormNames();
    // Precondition: the vocabulary is there to be outside of.
    expect(curated.size).toBe(FORMS.length);

    const inUse = [...new Set((await compendium()).map((e) => e.form).filter(Boolean))] as string[];
    const outside = inUse.filter((form) => !curated.has(form.toLowerCase()));

    expect(outside.length).toBeGreaterThanOrEqual(1);
    // …and the rest are curated, so the autofill has both halves of its list.
    expect(inUse.length - outside.length).toBeGreaterThanOrEqual(10);
  });

  it('files entries under categories, and gives some of them folk names', async () => {
    await seedStandard(db);

    expect(await countOf('ingredient_categories')).toBeGreaterThan(0);
    expect(await countOf('ingredient_folk_names')).toBeGreaterThan(0);

    // A dangling id on either side renders nothing.
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

  // Keyed on identity, ignoring `deleted_at`: the partial indexes stop only a second live row.
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
