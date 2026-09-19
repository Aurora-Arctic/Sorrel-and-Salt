import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { truncateAllTables } from '../../support/seeded-database';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import {
  COMPENDIUM_INGREDIENTS,
  FIXTURE_USERS,
  WORKSPACE_W_ID,
  WORKSPACE_X_ID,
} from '@/db/seed/standard';
import { DEMO_SPELLS, WORKSPACE_W_INGREDIENTS, seedDemo } from '@/db/seed/demo';
import { seed } from '@/db/seed/index';

// M1.23 — the `demo` scenario: DESIGN.md §"Seed data"'s third, "standard plus
// spells with ingredients and layer order". Like standard.test.ts it runs
// against the real schema rather than a stubbed table or two, and for a
// sharper version of the same reason: a layer's integrity is three CHECK
// constraints, two partial unique indexes and a composite primary key
// (MB.40), none of which an object this module returns can demonstrate. The
// worker's sorrel_test_<n> clone arrives with every migration applied and the
// `standard` scenario seeded (M1.27, tests/support/db-setup.ts), re-cloned
// that way before this file runs — so nothing is built here and nothing put
// back afterwards. A test *about* the seed needs the tables empty, so
// `beforeEach` truncates every one of them, and `seedDemo` then lays
// `standard` down itself, inside its one transaction, exactly as it did
// against the empty template this file used to migrate by hand.

const PROBE = 'demo_probe_acting_user';

interface SpellRow {
  id: string;
  workspace_id: string;
  title: string;
  intent: string | null;
  status: 'draft' | 'complete';
  created_by: string;
  updated_by: string;
  deleted_at: Date | null;
}

interface LayerRow {
  spell_id: string;
  ingredient_id: string | null;
  name: string | null;
  form: string | null;
  quantity: string | null;
  unit: string | null;
  layer_order: number;
  note: string | null;
  created_by: string;
}

interface IngredientRow {
  id: string;
  workspace_id: string | null;
  name: string;
  canonical_name: string | null;
  form: string | null;
}

let sql: ReturnType<typeof postgres>;
let db: ReturnType<typeof drizzle>;

async function allSpells(): Promise<SpellRow[]> {
  return sql<SpellRow[]>`select * from spells order by title`;
}

async function layersOf(spellId: string): Promise<LayerRow[]> {
  return sql<LayerRow[]>`
    select * from spell_ingredients where spell_id = ${spellId} order by layer_order
  `;
}

async function ingredientsIn(workspaceId: string | null): Promise<IngredientRow[]> {
  return workspaceId === null
    ? sql<IngredientRow[]>`select * from ingredients where workspace_id is null order by name`
    : sql<IngredientRow[]>`
        select * from ingredients where workspace_id = ${workspaceId} order by name
      `;
}

async function countOf(table: string): Promise<number> {
  const [{ count }] = await sql<{ count: string }[]>`select count(*) from ${sql(table)}`;
  return Number(count);
}

async function counts(): Promise<Record<string, number>> {
  return {
    users: await countOf('users'),
    workspaces: await countOf('workspaces'),
    members: await countOf('workspace_members'),
    ingredients: await countOf('ingredients'),
    folkNames: await countOf('ingredient_folk_names'),
    ingredientCategories: await countOf('ingredient_categories'),
    categories: await countOf('categories'),
    forms: await countOf('ingredient_forms'),
    spells: await countOf('spells'),
    layers: await countOf('spell_ingredients'),
    spellCategories: await countOf('spell_categories'),
  };
}

beforeAll(async () => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
  db = drizzle(sql);

  // standard.test.ts's observation trick, pointed at `spells`:
  // `app.current_user_id` is transaction-local and so gone by the time a test
  // could read it, and this records what it held *inside* the transaction that
  // inserted each spell.
  await sql`create table ${sql(PROBE)} (spell_id uuid not null, acting_user text)`;
  await sql.unsafe(`
    create function ${PROBE}() returns trigger language plpgsql as $$
    begin
      insert into ${PROBE} (spell_id, acting_user)
      values (new.id, current_setting('app.current_user_id', true));
      return new;
    end
    $$
  `);
  await sql.unsafe(
    `create trigger ${PROBE} after insert on spells for each row execute function ${PROBE}()`,
  );
});

// Every table in `public` emptied, the probe included — one `truncate …
// cascade` rather than the ordered `delete from` list this used to be: the
// clone arrives already holding `standard`, every child foreign key is
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

describe('demo is standard plus spells', () => {
  it('seeds everything standard does, in the same one transaction', async () => {
    expect(
      await countOf('users'),
      'the truncated clone starts empty, so these rows are this seed’s',
    ).toBe(0);

    await seedDemo(db);

    // The cast, the two workspaces and the populated compendium — `demo` is
    // "standard plus", not a second scenario that happens to look similar.
    const users = await sql<{ id: string }[]>`select id from users`;
    expect(new Set(users.map((u) => u.id))).toEqual(
      new Set([BOOTSTRAP_USER_ID, ...Object.values(FIXTURE_USERS).map((u) => u.id)]),
    );
    expect(await countOf('workspaces')).toBe(2);
    expect((await ingredientsIn(null)).length).toBe(COMPENDIUM_INGREDIENTS.length);
    expect(await countOf('categories')).toBeGreaterThan(0);
    expect(await countOf('ingredient_forms')).toBeGreaterThan(0);
  });

  it('adds W’s own ingredients, which the compendium does not carry', async () => {
    await seedDemo(db);

    const local = await ingredientsIn(WORKSPACE_W_ID);
    expect(local.map((i) => i.name).sort()).toEqual(
      WORKSPACE_W_INGREDIENTS.map((i) => i.name).sort(),
    );
    // Local means local: X sees none of them, which is the isolation the two
    // workspaces exist to make assertable.
    expect(await ingredientsIn(WORKSPACE_X_ID)).toEqual([]);
  });
});

describe('the grimoire', () => {
  it('holds at least two spells, all of them W’s', async () => {
    await seedDemo(db);

    const spells = await allSpells();
    expect(spells.length).toBeGreaterThanOrEqual(2);
    expect(spells.length).toBe(DEMO_SPELLS.length);
    expect(spells.every((s) => s.workspace_id === WORKSPACE_W_ID)).toBe(true);
    expect(spells.every((s) => s.deleted_at === null)).toBe(true);
    expect(new Set(spells.map((s) => s.id))).toEqual(new Set(DEMO_SPELLS.map((s) => s.id)));
  });

  it('writes a working rather than a title: intent, instructions and the jar’s details', async () => {
    await seedDemo(db);

    const spells = await allSpells();
    expect(spells.every((s) => (s.intent ?? '').length > 0)).toBe(true);

    const detailed = await sql<{ jar_size: string | null; instructions: string | null }[]>`
      select jar_size, instructions from spells
    `;
    expect(detailed.every((s) => (s.instructions ?? '').length > 0)).toBe(true);
    expect(detailed.filter((s) => (s.jar_size ?? '').length > 0).length).toBeGreaterThanOrEqual(1);
  });

  it('seeds a draft beside a finished spell, so the status badge has both to show', async () => {
    await seedDemo(db);

    const statuses = new Set((await allSpells()).map((s) => s.status));
    expect(statuses).toEqual(new Set(['draft', 'complete']));
  });

  it('assigns each spell categories that resolve to real seeded rows', async () => {
    await seedDemo(db);

    expect(await countOf('spell_categories')).toBe(
      DEMO_SPELLS.reduce((total, spell) => total + spell.categories.length, 0),
    );

    const [{ count: dangling }] = await sql<{ count: string }[]>`
      select count(*) from spell_categories sc
      where not exists (select 1 from categories c where c.id = sc.category_id)
         or not exists (select 1 from spells s where s.id = sc.spell_id)
    `;
    expect(Number(dangling)).toBe(0);
  });
});

describe('layers: ingredients, and the order they go into the jar', () => {
  it('gives every spell a stack, numbered from one without a gap or a repeat', async () => {
    await seedDemo(db);

    for (const spell of DEMO_SPELLS) {
      const layers = await layersOf(spell.id);

      expect(layers.length, `${spell.title} has layers`).toBeGreaterThanOrEqual(2);
      expect(layers.map((l) => l.layer_order)).toEqual(layers.map((_layer, index) => index + 1));
    }
  });

  it('measures most layers, and leaves one unmeasured — a pinch is not a quantity', async () => {
    await seedDemo(db);

    const layers = await sql<LayerRow[]>`select * from spell_ingredients`;
    expect(
      layers.filter((l) => l.quantity !== null && l.unit !== null).length,
    ).toBeGreaterThanOrEqual(3);
    expect(
      layers.filter((l) => l.quantity === null && l.unit === null).length,
    ).toBeGreaterThanOrEqual(1);
    expect(layers.filter((l) => (l.note ?? '').length > 0).length).toBeGreaterThanOrEqual(1);
  });

  // The acceptance criterion, and the reason the demo seeds local ingredients
  // at all: a jar in a real grimoire mixes what the compendium knows with what
  // this coven wrote down for itself.
  it('mixes compendium entries with W’s own ingredients', async () => {
    await seedDemo(db);

    const tierById = new Map(
      [...(await ingredientsIn(null)), ...(await ingredientsIn(WORKSPACE_W_ID))].map((row) => [
        row.id,
        row.workspace_id === null ? 'compendium' : 'workspace',
      ]),
    );

    const linked = (await sql<LayerRow[]>`select * from spell_ingredients`).filter(
      (l) => l.ingredient_id !== null,
    );
    const tiers = linked.map((l) => tierById.get(l.ingredient_id as string));

    // The precondition: both tiers are populated, so "both appear" is the
    // seed's doing rather than one tier being all there is.
    expect(new Set(tierById.values())).toEqual(new Set(['compendium', 'workspace']));
    expect(tiers.filter((tier) => tier === 'compendium').length).toBeGreaterThanOrEqual(1);
    expect(tiers.filter((tier) => tier === 'workspace').length).toBeGreaterThanOrEqual(1);
    // Every linked layer points at something that really exists — and at an
    // ingredient, never at a stock row (§5, M10.21).
    expect(tiers.filter((tier) => tier === undefined)).toEqual([]);
  });

  // MB.40, story 57: a pinch of dust from the garden path, named for this jar
  // only and never added to the workspace's ingredients.
  it('carries one custom, one-off layer beside the linked ones', async () => {
    await seedDemo(db);

    const custom = (await sql<LayerRow[]>`select * from spell_ingredients`).filter(
      (l) => l.ingredient_id === null,
    );

    expect(custom).toHaveLength(1);
    expect(custom[0].name).toBeTruthy();
    expect(custom[0].form).toBeTruthy();

    // It sits beside linked layers in the same jar, which is the arrangement
    // Wave 13 has to render and reorder.
    const siblings = await layersOf(custom[0].spell_id);
    expect(siblings.filter((l) => l.ingredient_id !== null).length).toBeGreaterThanOrEqual(1);

    // And it is one-off: the name it carries is not an ingredient anywhere,
    // in either tier.
    const named = await sql<{ id: string }[]>`
      select id from ingredients where lower(name) = lower(${custom[0].name as string})
    `;
    expect(named).toEqual([]);
  });

  it('stamps every layer as the bootstrap admin’s and publishes it as the acting user', async () => {
    await seedDemo(db);

    const layers = await sql<LayerRow[]>`select * from spell_ingredients`;
    expect(layers.every((l) => l.created_by === BOOTSTRAP_USER_ID)).toBe(true);

    const probe = await sql<
      { acting_user: string | null }[]
    >`select acting_user from ${sql(PROBE)}`;
    expect(probe).toHaveLength(DEMO_SPELLS.length);
    expect(probe.every((r) => r.acting_user === BOOTSTRAP_USER_ID)).toBe(true);
  });
});

describe('re-running the scenario', () => {
  it('is idempotent: a second run adds nothing anywhere', async () => {
    await seedDemo(db);
    const before = await counts();

    await expect(seedDemo(db)).resolves.toBeUndefined();

    expect(await counts()).toEqual(before);
  });

  // The reason a jar's stack is keyed as a whole rather than layer by layer: a
  // layer pulled out of the middle renumbers everything below it, so the depth
  // the seed wants back is occupied by a different ingredient and the
  // ingredient it wants is already at another depth. A per-layer "insert what
  // is missing" hits the primary key or MB.40's partial unique index and fails
  // the entire scenario, not the row — which is what this asserts does not
  // happen.
  it('leaves a jar someone has edited alone, rather than patching rows back into it', async () => {
    await seedDemo(db);

    const spell = DEMO_SPELLS[0];
    const before = await layersOf(spell.id);
    const pulled = before[2];

    // A member takes the third layer out of the jar — a hard delete (MB.34) —
    // and the ones below it close the gap, the way M10.16's reorder will.
    await sql`
      delete from spell_ingredients
      where spell_id = ${spell.id} and layer_order = ${pulled.layer_order}
    `;
    for (const layer of before.filter((l) => l.layer_order > pulled.layer_order)) {
      await sql`
        update spell_ingredients set layer_order = ${layer.layer_order - 1}
        where spell_id = ${spell.id} and layer_order = ${layer.layer_order}
      `;
    }

    await expect(seedDemo(db)).resolves.toBeUndefined();

    const after = await layersOf(spell.id);
    expect(after).toHaveLength(before.length - 1);
    expect(after.map((l) => l.layer_order)).toEqual(after.map((_layer, index) => index + 1));
    // The layer that was pulled out stayed out — nothing was re-added under a
    // depth that had moved on.
    expect(
      after.filter((l) => l.ingredient_id === pulled.ingredient_id && l.name === pulled.name),
    ).toEqual([]);
  });

  it('does not re-add a layer of a jar someone has reordered', async () => {
    await seedDemo(db);

    const spell = DEMO_SPELLS[0];
    const layers = await layersOf(spell.id);
    // Reverse the stack: n, n-1, … 1, through a scratch offset so the
    // rewrite never collides with the key it is rewriting.
    for (const layer of layers) {
      await sql`
        update spell_ingredients set layer_order = ${layer.layer_order + 1000}
        where spell_id = ${spell.id} and layer_order = ${layer.layer_order}
      `;
    }
    for (const layer of layers) {
      await sql`
        update spell_ingredients set layer_order = ${layers.length + 1 - layer.layer_order}
        where spell_id = ${spell.id} and layer_order = ${layer.layer_order + 1000}
      `;
    }

    await expect(seedDemo(db)).resolves.toBeUndefined();

    const after = await layersOf(spell.id);
    expect(after).toHaveLength(layers.length);
    expect(after.map((l) => l.layer_order)).toEqual(layers.map((l) => l.layer_order));
  });

  it('does not resurrect a spell someone has soft-deleted', async () => {
    await seedDemo(db);
    const [victim] = await allSpells();

    await sql`
      update spells set deleted_at = now(), deleted_by = ${BOOTSTRAP_USER_ID}
      where id = ${victim.id}
    `;

    await seedDemo(db);

    const live = await sql<{ id: string }[]>`select id from spells where deleted_at is null`;
    expect(live.map((r) => r.id)).not.toContain(victim.id);
    expect(await countOf('spells')).toBe(DEMO_SPELLS.length);
  });
});

describe('seed(db, { scenario })', () => {
  it('routes "demo" to this scenario', async () => {
    await seed(db, { scenario: 'demo' });

    expect(await countOf('spells')).toBe(DEMO_SPELLS.length);
    expect(await countOf('workspaces')).toBe(2);
  });
});
