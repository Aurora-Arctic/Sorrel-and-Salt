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
} from '@/db/seed/standard';
import { DEMO_SPELLS, WORKSPACE_W_INGREDIENTS, seedDemo } from '@/db/seed/demo';
import type { IngredientSlugRow, LayerRow, SpellRow } from './types';

// The `demo` scenario against the real schema: a layer's integrity is three
// CHECKs, two partial indexes and a composite key no returned object can
// demonstrate. One run over emptied tables serves every read; a re-run over
// an edited grimoire empties them again first. The shape every seed shares is
// index.test.ts's (MB.183) — claude-docs/db/demo-scenario.md, "The demo scenario".

let sql: ReturnType<typeof postgres>;
let db: ReturnType<typeof drizzle>;

async function allSpells(): Promise<SpellRow[]> {
  return sql<SpellRow[]>`select * from spells order by title`;
}

/** A jar's live layers, in order: what a member pulled out is a tombstone. */
async function layersOf(spellId: string): Promise<LayerRow[]> {
  return sql<LayerRow[]>`
    select * from spell_ingredients
    where spell_id = ${spellId} and deleted_at is null order by layer_order
  `;
}

async function ingredientsIn(workspaceId: string | null): Promise<IngredientSlugRow[]> {
  return workspaceId === null
    ? sql<IngredientSlugRow[]>`select * from ingredients where workspace_id is null order by name`
    : sql<IngredientSlugRow[]>`
        select * from ingredients where workspace_id = ${workspaceId} order by name
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

describe('one run of the scenario', () => {
  beforeAll(async () => {
    await truncateAllTables(sql);
    // Precondition: the truncated clone really starts empty, so every row read below is this run's.
    expect(await countOf('users')).toBe(0);
    expect(await countOf('spells')).toBe(0);
    await seedDemo(db);
  });

  describe('demo is standard plus spells', () => {
    it('seeds everything standard does, in the same one transaction', async () => {
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
      const local = await ingredientsIn(WORKSPACE_W_ID);
      expect(local.map((i) => i.name).sort()).toEqual(
        WORKSPACE_W_INGREDIENTS.map((i) => i.name).sort(),
      );
      expect(await ingredientsIn(WORKSPACE_X_ID)).toEqual([]);
      // Slugged as the compendium is: label, form and formal name, by the one rule.
      for (const row of local) {
        expect(row.slug).toBe(ingredientSlug(row.name, row.form, row.canonical_name));
      }
    });

    // MB.162: the compendium holds only curated forms, so the uncurated value a
    // member writes before an admin curates it — §5's `rhizome` — lives here.
    it('gives W an entry with the uncurated form `rhizome`, which no compendium entry holds', async () => {
      const rhizomes = await sql<{ workspace_id: string | null }[]>`
        select workspace_id from ingredients where lower(btrim(form)) = 'rhizome'
      `;
      expect(rhizomes.map((row) => row.workspace_id)).toEqual([WORKSPACE_W_ID]);

      // Uncurated: no form row, live or retired, folds to it.
      const curated = await sql`
        select 1 from ingredient_forms where lower(btrim(name)) = 'rhizome'
      `;
      expect(curated).toEqual([]);
      // Precondition: the vocabulary is there to be outside of.
      expect(await countOf('ingredient_forms')).toBeGreaterThan(0);
    });
  });

  describe('the grimoire', () => {
    it('holds at least two spells, all of them W’s', async () => {
      const spells = await allSpells();
      expect(spells.length).toBeGreaterThanOrEqual(2);
      expect(spells.length).toBe(DEMO_SPELLS.length);
      expect(spells.every((s) => s.workspace_id === WORKSPACE_W_ID)).toBe(true);
      expect(spells.every((s) => s.deleted_at === null)).toBe(true);
      expect(new Set(spells.map((s) => s.id))).toEqual(new Set(DEMO_SPELLS.map((s) => s.id)));
    });

    it('writes a working rather than a title: intent, instructions and the jar’s details', async () => {
      const spells = await allSpells();
      expect(spells.every((s) => (s.intent ?? '').length > 0)).toBe(true);

      const detailed = await sql<{ jar_size: string | null; instructions: string | null }[]>`
        select jar_size, instructions from spells
      `;
      expect(detailed.every((s) => (s.instructions ?? '').length > 0)).toBe(true);
      expect(detailed.filter((s) => (s.jar_size ?? '').length > 0).length).toBeGreaterThanOrEqual(
        1,
      );
    });

    // The seed names no visibility, so what these rows carry is the column's own
    // default (M10.3). A demo coven whose jars were invisible to everyone but
    // the bootstrap user would be a demo of nothing.
    it('shares every seeded spell with the coven', async () => {
      const visibilities = await sql<{ visibility: string }[]>`
        select visibility::text from spells
      `;
      expect(visibilities).toHaveLength(DEMO_SPELLS.length);
      expect(visibilities.every((row) => row.visibility === 'workspace')).toBe(true);
    });

    it('seeds a draft beside a finished spell, so the status badge has both to show', async () => {
      const statuses = new Set((await allSpells()).map((s) => s.status));
      expect(statuses).toEqual(new Set(['draft', 'complete']));
    });

    it('assigns each spell categories that resolve to real seeded rows', async () => {
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
      for (const spell of DEMO_SPELLS) {
        const layers = await layersOf(spell.id);

        expect(layers.length, `${spell.title} has layers`).toBeGreaterThanOrEqual(2);
        expect(layers.map((l) => l.layer_order)).toEqual(layers.map((_layer, index) => index + 1));
      }
    });

    it('measures most layers, and leaves one unmeasured — a pinch is not a quantity', async () => {
      const layers = await sql<LayerRow[]>`select * from spell_ingredients`;
      expect(
        layers.filter((l) => l.quantity !== null && l.unit !== null).length,
      ).toBeGreaterThanOrEqual(3);
      expect(
        layers.filter((l) => l.quantity === null && l.unit === null).length,
      ).toBeGreaterThanOrEqual(1);
      expect(layers.filter((l) => (l.note ?? '').length > 0).length).toBeGreaterThanOrEqual(1);
    });

    // A real jar mixes what the compendium knows with what the coven wrote down itself.
    it('mixes compendium entries with W’s own ingredients', async () => {
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

      // Precondition: both tiers are populated.
      expect(new Set(tierById.values())).toEqual(new Set(['compendium', 'workspace']));
      expect(tiers.filter((tier) => tier === 'compendium').length).toBeGreaterThanOrEqual(1);
      expect(tiers.filter((tier) => tier === 'workspace').length).toBeGreaterThanOrEqual(1);
      // Every linked layer points at an ingredient, never at a stock row.
      expect(tiers.filter((tier) => tier === undefined)).toEqual([]);
    });

    // Story 57: a one-off layer named for this jar only, never added to the ingredients.
    it('carries one custom, one-off layer beside the linked ones', async () => {
      const custom = (await sql<LayerRow[]>`select * from spell_ingredients`).filter(
        (l) => l.ingredient_id === null,
      );

      expect(custom).toHaveLength(1);
      expect(custom[0].name).toBeTruthy();
      expect(custom[0].form).toBeTruthy();

      const siblings = await layersOf(custom[0].spell_id);
      expect(siblings.filter((l) => l.ingredient_id !== null).length).toBeGreaterThanOrEqual(1);

      // One-off: the name is not an ingredient in either tier.
      const named = await sql<{ id: string }[]>`
        select id from ingredients where lower(name) = lower(${custom[0].name as string})
      `;
      expect(named).toEqual([]);
    });
  });
});

describe('re-running the scenario over an edited grimoire', () => {
  beforeEach(async () => {
    await truncateAllTables(sql);
  });

  // The stack is keyed as a whole: patching one layer back into an edited jar
  // collides with the key or the partial index and fails the whole scenario
  // (see the citation above).
  it('leaves a jar someone has edited alone, rather than patching rows back into it', async () => {
    await seedDemo(db);

    const spell = DEMO_SPELLS[0];
    const before = await layersOf(spell.id);
    const pulled = before[2];

    // A member pulls the third layer out (a soft delete) and the ones below close the gap.
    await sql`
      update spell_ingredients set deleted_at = now(), deleted_by = ${BOOTSTRAP_USER_ID}
      where spell_id = ${spell.id} and layer_order = ${pulled.layer_order}
    `;
    for (const layer of before.filter((l) => l.layer_order > pulled.layer_order)) {
      await sql`
        update spell_ingredients set layer_order = ${layer.layer_order - 1}
        where spell_id = ${spell.id} and layer_order = ${layer.layer_order}
          and deleted_at is null
      `;
    }

    await expect(seedDemo(db)).resolves.toBeUndefined();

    const after = await layersOf(spell.id);
    expect(after).toHaveLength(before.length - 1);
    expect(after.map((l) => l.layer_order)).toEqual(after.map((_layer, index) => index + 1));
    // The pulled layer stayed out.
    expect(
      after.filter((l) => l.ingredient_id === pulled.ingredient_id && l.name === pulled.name),
    ).toEqual([]);
  });

  // A tombstone is a layer the jar has had, so a jar whose every layer was
  // pulled out has been edited, not left unstocked.
  it('does not restock a jar whose every layer was pulled out', async () => {
    await seedDemo(db);

    const spell = DEMO_SPELLS[0];
    await sql`
      update spell_ingredients set deleted_at = now(), deleted_by = ${BOOTSTRAP_USER_ID}
      where spell_id = ${spell.id}
    `;
    // Why it could have been restocked: the jar reads as empty.
    expect(await layersOf(spell.id)).toEqual([]);

    await seedDemo(db);

    expect(await layersOf(spell.id)).toEqual([]);
  });

  it('does not re-add a layer of a jar someone has reordered', async () => {
    await seedDemo(db);

    const spell = DEMO_SPELLS[0];
    const layers = await layersOf(spell.id);
    // Reverse the stack through a scratch offset, so the rewrite never collides with the key.
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
});
