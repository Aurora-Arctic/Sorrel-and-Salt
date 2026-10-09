import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { truncateAllTables } from '../../support/seeded-database';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import { ingredientSlug } from '@/lib/slugify';
import {
  COMPENDIUM_INGREDIENTS,
  FIXTURE_USERS,
  WORKSPACE_W_ID,
  WORKSPACE_X_ID,
  seedStandard,
} from '@/db/seed/standard';
import { updateCompendiumEntry } from '@/modules/ingredients';
import { E, asUser } from '../../support/as-user';
import type { CompendiumEntryRow, MemberRow, UserRow } from './types';

// The `standard` scenario against the real schema: membership is two real
// foreign keys and the compendium's identity a generated column. It is
// awkward on purpose — five "Cat's Claw"s, a mineral variety, a `none`, an
// `unknown` — claude-docs/db/standard-scenario.md, "The standard scenario".
// The cast, the workspaces, the vocabulary counts and the curated picks are
// seeded-template.test.ts's, and the shape every seed shares index.test.ts's
// (MB.183). What is left reads the clone, which already holds the scenario,
// bar the three re-runs that write and so empty every table first.

let sql: ReturnType<typeof postgres>;
let db: ReturnType<typeof drizzle>;

async function allUsers(): Promise<UserRow[]> {
  return sql<UserRow[]>`select * from users order by email`;
}

async function allMembers(): Promise<MemberRow[]> {
  return sql<MemberRow[]>`select * from workspace_members order by workspace_id, user_id`;
}

async function compendium(): Promise<CompendiumEntryRow[]> {
  return sql<CompendiumEntryRow[]>`
    select * from ingredients where workspace_id is null order by name, canonical_name
  `;
}

async function countOf(table: string): Promise<number> {
  const [{ count }] = await sql<{ count: string }[]>`select count(*) from ${sql(table)}`;
  return Number(count);
}

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
  db = drizzle(sql);
});

afterAll(async () => {
  await sql.end();
});

describe('the cast: five fixture users, A–E', () => {
  it('gives each the role DESIGN.md’s fixture table documents', async () => {
    const byId = new Map((await allUsers()).map((u) => [u.id, u]));
    expect(byId.get(FIXTURE_USERS.A.id)?.role).toBe('user');
    expect(byId.get(FIXTURE_USERS.B.id)?.role).toBe('user');
    expect(byId.get(FIXTURE_USERS.C.id)?.role).toBe('user');
    expect(byId.get(FIXTURE_USERS.D.id)?.role).toBe('user');
    expect(byId.get(FIXTURE_USERS.E.id)?.role).toBe('admin');
  });

  // Invite-gate: A–D earned the flag by joining a workspace; E is in none and
  // never invited, and holds it by being an admin, as the users CHECK makes
  // every admin hold it (MB.177).
  it('grants canCreateWorkspace to the four who joined a workspace, and to the admin', async () => {
    const byId = new Map((await allUsers()).map((u) => [u.id, u]));
    expect(byId.get(FIXTURE_USERS.A.id)?.can_create_workspace).toBe(true);
    expect(byId.get(FIXTURE_USERS.B.id)?.can_create_workspace).toBe(true);
    expect(byId.get(FIXTURE_USERS.C.id)?.can_create_workspace).toBe(true);
    expect(byId.get(FIXTURE_USERS.D.id)?.can_create_workspace).toBe(true);
    expect(byId.get(FIXTURE_USERS.E.id)?.can_create_workspace).toBe(true);
  });
});

describe('the workspaces: W, X, and nothing shared', () => {
  it('seats A as owner, B as member and C as viewer in W', async () => {
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
    const inX = (await allMembers()).filter((m) => m.workspace_id === WORKSPACE_X_ID);
    expect(inX.map((m) => [m.user_id, m.role])).toEqual([[FIXTURE_USERS.D.id, 'member']]);
  });

  // An intersection with its preconditions stated: two empty sets also intersect empty.
  it('shares no member between W and X', async () => {
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
    const members = await allMembers();
    // Precondition: E exists and other memberships exist, so "no row for E"
    // is the seed's doing rather than an empty table.
    expect((await allUsers()).some((u) => u.id === FIXTURE_USERS.E.id)).toBe(true);
    expect(members.length).toBe(4);
    expect(members.filter((m) => m.user_id === FIXTURE_USERS.E.id)).toEqual([]);
  });
});

describe('the compendium', () => {
  it('declares a nomenclature on every entry, spanning more than one naming system', async () => {
    const entries = await compendium();
    expect(entries.filter((e) => e.nomenclature === null)).toEqual([]);
    // The column is NOT NULL, so the line above cannot fail alone; the claim is
    // that the seed curated rather than answering `unknown` everywhere.
    expect(new Set(entries.map((e) => e.nomenclature)).size).toBeGreaterThanOrEqual(5);
  });

  it('carries a `none`, an `unknown`, and a mineral variety', async () => {
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
    expect(cat?.form).toBe('Claw');

    // Five rows under one label is legal because each has its own generated key.
    expect(new Set(catsClaws.map((e) => e.canonical_key)).size).toBe(5);
  });

  // MB.80's public address, derived and never written down (CLAUDE.md's slug
  // rule): the label, the form and the formal name, and no two alike among the
  // live entries.
  it('gives every entry the slug of its label, form and formal name, no two alike', async () => {
    const entries = await compendium();
    // Precondition: the whole compendium is here to be slugged.
    expect(entries.length).toBe(COMPENDIUM_INGREDIENTS.length);
    for (const entry of entries) {
      expect(entry.slug).toBe(ingredientSlug(entry.name, entry.form, entry.canonical_name));
    }
    expect(new Set(entries.map((e) => e.slug)).size).toBe(entries.length);

    // The pair that put the formal name in the slug: one label, one form, two plants.
    const barks = entries.filter((e) => e.name === "Cat's Claw" && e.form === 'Bark');
    expect(barks.map((e) => e.canonical_name).sort()).toEqual([
      'Uncaria guianensis',
      'Uncaria tomentosa',
    ]);
    expect(new Set(barks.map((e) => e.slug)).size).toBe(2);
  });

  it('files entries under categories, and gives some of them folk names', async () => {
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
});

describe('re-running the scenario', () => {
  beforeEach(async () => {
    await truncateAllTables(sql);
  });

  // A database seeded before MB.162 holds the forms lower-cased. Keyed on the
  // spelling, a reseed would insert the title-cased entry beside its own
  // identity and fail the whole scenario on the canonical-key index.
  it('adds nothing over an earlier run that spelt the forms in another case', async () => {
    // Precondition: the truncated clone really starts empty, so the rows re-cased are this run's.
    expect(await countOf('ingredients')).toBe(0);
    await seedStandard(db);
    const recased = await sql`
      update ingredients set form = lower(form)
      where workspace_id is null and form <> lower(form)
    `;
    // Precondition: the earlier spelling really differs from the seed's.
    expect(recased.count).toBeGreaterThan(0);

    await expect(seedStandard(db)).resolves.toBeUndefined();

    expect(await countOf('ingredients')).toBe(COMPENDIUM_INGREDIENTS.length);
  });

  // The owner's call: `standard` is the fixture scenario, so a reseed resets
  // the fixtures and puts back a compendium deity pick an admin deleted;
  // `demo` keeps the deletion (index.test.ts's sweep), since a person explores
  // it. The pick deleted is its entry's last, so the end of its list is the
  // position it held; the next test takes one that is not.
  it('puts back a compendium deity pick an admin has since deleted', async () => {
    // Precondition: the truncated clone really starts empty, so the pick is this run's.
    expect(await countOf('ingredient_deities')).toBe(0);
    await seedStandard(db);
    const [pick] = await sql<
      { id: string; ingredient_id: string; name: string; position: number }[]
    >`
      select d.id, d.ingredient_id, d.name, d.position from ingredient_deities d
      join ingredients i on i.id = d.ingredient_id
      where i.workspace_id is null and d.deleted_at is null
        and d.position = (
          select max(position) from ingredient_deities
          where ingredient_id = d.ingredient_id and deleted_at is null
        )
      order by i.name limit 1
    `;
    const live = () => sql`
      select 1 from ingredient_deities
      where ingredient_id = ${pick.ingredient_id} and lower(name) = lower(${pick.name})
        and deleted_at is null
    `;
    // Precondition: the pick was live, and the delete leaves it with no live twin.
    expect(await live()).toHaveLength(1);
    await sql`
      update ingredient_deities set deleted_at = now(), deleted_by = ${BOOTSTRAP_USER_ID}
      where id = ${pick.id}
    `;
    expect(await live()).toEqual([]);

    await expect(seedStandard(db)).resolves.toBeUndefined();

    const [restored] = await sql<{ id: string; position: number }[]>`
      select id, position from ingredient_deities
      where ingredient_id = ${pick.ingredient_id} and lower(name) = lower(${pick.name})
        and deleted_at is null
    `;
    expect(restored).toBeDefined();
    expect(restored.id).not.toBe(pick.id);
    expect(restored.position).toBe(pick.position);
  });

  // MB.192: the service renumbers the picks it keeps, so a pick removed from
  // anywhere but the end leaves its position held by the pick below it. The
  // reseed puts it back at the end of the list as the admin left it, moving
  // no live row — claude-docs/db/standard-scenario.md.
  it('puts back a pick removed from the middle of its list at the end of it', async () => {
    // Precondition: the truncated clone really starts empty, so the picks are this run's.
    expect(await countOf('ingredient_deities')).toBe(0);
    await seedStandard(db);
    const [mugwort] = await sql<{ id: string; form_id: string }[]>`
      select id, form_id from ingredients where workspace_id is null and name = 'Mugwort'
    `;
    const picks = () =>
      sql<{ id: string; name: string; position: number; deity_id: string }[]>`
        select id, name, position, deity_id from ingredient_deities
        where ingredient_id = ${mugwort.id} and deleted_at is null
        order by position
      `;
    const [artemis, diana] = await picks();
    // Precondition: Artemis heads a list of two, so removing her is not removing the last.
    expect([artemis, diana].map(({ name, position }) => ({ name, position }))).toEqual([
      { name: 'Artemis', position: 0 },
      { name: 'Diana', position: 1 },
    ]);

    await updateCompendiumEntry(asUser(E), mugwort.id, {
      name: 'Mugwort',
      canonicalName: 'Artemisia vulgaris',
      nomenclature: 'botanical',
      form: 'Herb',
      formId: mugwort.form_id,
      deities: [{ deityId: diana.deity_id }],
    });
    // Precondition: the pick below took the removed pick's position, which the seed's index would want.
    expect(await picks()).toEqual([expect.objectContaining({ id: diana.id, position: 0 })]);

    await expect(seedStandard(db)).resolves.toBeUndefined();

    const after = await picks();
    expect(after).toEqual([
      expect.objectContaining({ id: diana.id, name: 'Diana', position: 0 }),
      expect.objectContaining({ name: 'Artemis', position: 1 }),
    ]);
    expect(after[1].id).not.toBe(artemis.id);
  });
});
