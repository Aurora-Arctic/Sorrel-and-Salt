import { beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { Forbidden, ValidationError } from '@/lib/errors';
import type { Session } from '@/lib/session';
import {
  type IngredientFacets,
  compendiumFacets,
  countWorkspaceIngredients,
  workspaceIngredientFacets,
} from '@/modules/ingredients';
import { A, B, C, D, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertCupboardEntry } from '../../../support/db/insert-cupboard-entry';
import type { CupboardEntryFixture } from '../../../support/db/insert-cupboard-entry';
import { insertDeityLink, insertIngredient } from '../../../support/db/insert-ingredient';
import { insertStock } from '../../../support/db/insert-stock';
import { variantIdOf } from '../../../support/db/read-variants';
import { type IngredientFixture, makeIngredient, makeVariant } from '../../../support/fixtures';
import type { Overrides } from '../../../support/fixtures';
import { clearDataCache } from '../../../support/next-data-cache';

// M12.3's two services: the compendium's facets, public and cached as the
// list is, and a coven's, under the coven's proof and never cached. A data
// cache that holds, as Next's does, so a row written underneath a read shows
// whether the repeat read reached Postgres. The counting itself is
// tests/db/repository/ingredient-facets.test.ts's.
vi.mock('next/cache', () => import('../../../support/next-data-cache'));

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
  clearDataCache();
});

/** An entry, compendium by default, with no formal name unless stated. */
function add(name: string, overrides: Overrides<IngredientFixture> = {}): Promise<string> {
  return insertIngredient(sql, makeIngredient({ name, nomenclature: 'none', ...overrides }), A.id);
}

/** A jar in `workspaceId` of the ingredient's form `form`, written raw. */
async function stock(
  ingredientId: string,
  workspaceId: string,
  form: string,
  quantityOnHand: string | null = null,
  lowStockThreshold: string | null = null,
): Promise<void> {
  const variantId = await variantIdOf(sql, ingredientId, form);
  await insertStock(
    sql,
    { workspaceId, ingredientId, variantId, quantityOnHand, lowStockThreshold },
    A.id,
  );
}

/** The compendium entry `ingredientId` in `workspaceId`'s cupboard, with `overrides`. */
async function hold(
  ingredientId: string,
  workspaceId = WORKSPACE_W_ID,
  overrides: Omit<CupboardEntryFixture, 'workspaceId' | 'ingredientId'> = {},
): Promise<void> {
  await insertCupboardEntry(sql, { workspaceId, ingredientId, ...overrides }, A.id);
}

/** A live vocabulary row's id, by name. */
async function idOf(table: 'categories' | 'deities', name: string): Promise<string> {
  const [row] = await sql`
    select id from ${sql(table)} where name = ${name} and deleted_at is null`;
  return row.id as string;
}

/** The values of one kind, whatever their counts. */
const valuesOf = (facets: IngredientFacets, kind: keyof IngredientFacets) =>
  facets[kind].map(({ value }) => value);

/** The values of one kind some entry carries. */
const countedOf = (facets: IngredientFacets, kind: keyof IngredientFacets) =>
  facets[kind].filter(({ count }) => count > 0).map(({ value }) => value);

describe('compendiumFacets', () => {
  it('counts the compendium for a caller with no session', async () => {
    await add('Alphawort', { variants: [makeVariant({ form: 'Resin' })] });
    await add('Covenwort', {
      workspaceId: WORKSPACE_W_ID,
      variants: [makeVariant({ form: 'Covenform' })],
    });

    const facets = await compendiumFacets({});

    expect(facets.forms).toEqual([{ value: 'Resin', count: 1 }]);
  });

  it('refuses a filter naming a category by an id that is not one', async () => {
    await expect(compendiumFacets({ categoryIds: ['not-an-id'] })).rejects.toThrow(ValidationError);
  });
});

describe('workspaceIngredientFacets', () => {
  let hecate: string;
  let protection: string;

  /**
   * W's own entry and a compendium entry W's cupboard holds, each with values no other
   * row carries; X's own entry; and a compendium entry no coven holds.
   */
  async function seedCovens(): Promise<void> {
    hecate = await idOf('deities', 'Hecate');
    protection = await idOf('categories', 'Protection');
    const own = await add('Covenwort', {
      workspaceId: WORKSPACE_W_ID,
      variants: [makeVariant({ form: 'Covenform' })],
      categories: ['Protection'],
      zodiacSigns: ['Leo'],
      toxic: true,
    });
    await insertDeityLink(sql, own, hecate, 0, A.id);
    const held = await add('Heldwort', {
      variants: [makeVariant({ form: 'Heldform' }), makeVariant({ form: 'Root' })],
      celestialBodies: ['Sun'],
      elements: ['fire'],
    });
    await hold(held);
    await stock(held, WORKSPACE_W_ID, 'Heldform');
    await add('Elsewort', {
      workspaceId: WORKSPACE_X_ID,
      variants: [makeVariant({ form: 'Elseform' })],
      zodiacSigns: ['Aries'],
    });
    await add('Unheldwort', {
      variants: [makeVariant({ form: 'Unheldform' })],
      categories: ['Cleansing'],
      zodiacSigns: ['Gemini'],
    });
  }

  it("counts the coven's own entries and the compendium entries it holds, and nothing else", async () => {
    await seedCovens();

    const facets = await workspaceIngredientFacets(asUser(B), WORKSPACE_W_ID, {});

    expect(facets.forms).toEqual([
      { value: 'Covenform', count: 1 },
      { value: 'Heldform', count: 1 },
      { value: 'Root', count: 1 },
    ]);
    expect(facets.deities).toEqual([{ value: hecate, count: 1 }]);
    expect(facets.categories).toEqual([{ value: protection, count: 1 }]);
    expect(countedOf(facets, 'zodiacSigns')).toEqual(['Leo']);
    expect(countedOf(facets, 'celestialBodies')).toEqual(['Sun']);
    expect(countedOf(facets, 'elements')).toEqual(['fire']);
    expect(facets.toxic).toEqual([
      { value: 'toxic', count: 1 },
      { value: 'not_toxic', count: 1 },
    ]);
  });

  it('counts Local and Compendium to the list total, by cupboard row and not by jar', async () => {
    await seedCovens();
    await hold(await add('Jarlesswort'));
    const jarOnly = await add('Jaronlywort', { variants: [makeVariant({ form: 'Jaronlyform' })] });
    await stock(jarOnly, WORKSPACE_W_ID, 'Jaronlyform');

    const facets = await workspaceIngredientFacets(asUser(B), WORKSPACE_W_ID, {});

    expect(facets.source).toEqual([
      { value: 'local', count: 1 },
      { value: 'compendium', count: 2 },
    ]);
    expect(facets.source[0].count + facets.source[1].count).toBe(await listedCount(asUser(B), {}));
  });

  it("counts a list override as the cupboard row states it, a null one as the compendium's, a cleared one under none", async () => {
    const moved = await add('Movedwort', {
      elements: ['fire'],
      zodiacSigns: ['Leo'],
      celestialBodies: ['Sun'],
    });
    await hold(moved, WORKSPACE_W_ID, { elements: ['water'], zodiacSigns: ['Aries'] });
    const cleared = await add('Clearedwort', {
      elements: ['fire'],
      zodiacSigns: ['Leo'],
      celestialBodies: ['Sun'],
    });
    await hold(cleared, WORKSPACE_W_ID, { elements: [], zodiacSigns: [], celestialBodies: [] });
    // X's override of the same entry is X's alone.
    await hold(moved, WORKSPACE_X_ID, { elements: ['air'] });
    const countIn = (facets: IngredientFacets, kind: keyof IngredientFacets, value: string) =>
      facets[kind].find((entry) => entry.value === value)?.count;

    const facets = await workspaceIngredientFacets(asUser(B), WORKSPACE_W_ID, {});

    expect(countedOf(facets, 'elements')).toEqual(['water']);
    expect(countedOf(facets, 'zodiacSigns')).toEqual(['Aries']);
    expect(countIn(facets, 'celestialBodies', 'Sun')).toBe(1);
    // Why the overrides could have been missed: the compendium counts the entries' own.
    const compendium = await compendiumFacets({});
    expect(countIn(compendium, 'elements', 'fire')).toBe(2);
    expect(countIn(compendium, 'zodiacSigns', 'Leo')).toBe(2);
    expect(countIn(compendium, 'celestialBodies', 'Sun')).toBe(2);
    // The list filters as the facets count.
    expect(await listedCount(asUser(B), { elements: ['water'] })).toBe(1);
    expect(await listedCount(asUser(B), { elements: ['fire'] })).toBe(0);
    expect(await listedCount(asUser(B), { zodiacSigns: ['leo'] })).toBe(0);
    expect(await listedCount(asUser(B), { celestialBodies: ['sun'] })).toBe(1);
    expect(
      countIn(await workspaceIngredientFacets(asUser(D), WORKSPACE_X_ID, {}), 'elements', 'air'),
    ).toBe(1);
  });

  it("counts each value as the coven's list reads it with that value chosen", async () => {
    await seedCovens();
    const bases = [{}, { zodiacSigns: ['leo'] }, { forms: ['root'] }, { query: 'heldwort' }];

    let checked = 0;
    for (const base of bases) {
      const facets = await workspaceIngredientFacets(asUser(B), WORKSPACE_W_ID, base);
      for (const { value, count } of facets.forms) {
        expect({ base, value, count }).toEqual({
          base,
          value,
          count: await listedCount(asUser(B), { ...base, forms: [value] }),
        });
        checked += 1;
      }
      for (const { value, count } of facets.zodiacSigns) {
        expect({ base, value, count }).toEqual({
          base,
          value,
          count: await listedCount(asUser(B), { ...base, zodiacSigns: [value] }),
        });
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(20);
  });

  it('counts each value as the list reads it under source and inStock', async () => {
    await seedCovens();
    const spent = await add('Spentwort', { variants: [makeVariant({ form: 'Spentform' })] });
    await hold(spent);
    await stock(spent, WORKSPACE_W_ID, 'Spentform', '0');
    const full = await add('Fullwort', {
      variants: [makeVariant({ form: 'Fullform' })],
      toxic: true,
    });
    await hold(full);
    await stock(full, WORKSPACE_W_ID, 'Fullform', '4');
    const bases = [
      { source: 'local' as const },
      { source: 'compendium' as const },
      { inStock: true },
      { source: 'compendium' as const, inStock: true },
      { source: 'local' as const, inStock: true },
    ];

    let checked = 0;
    for (const base of bases) {
      const facets = await workspaceIngredientFacets(asUser(B), WORKSPACE_W_ID, base);
      for (const { value, count } of facets.forms) {
        expect({ base, value, count }).toEqual({
          base,
          value,
          count: await listedCount(asUser(B), { ...base, forms: [value] }),
        });
        checked += 1;
      }
      for (const { value, count } of facets.toxic) {
        expect({ base, value, count }).toEqual({
          base,
          value,
          count: await listedCount(asUser(B), { ...base, toxic: value }),
        });
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(10);
    // Why the filters could have changed nothing: they narrow the unfiltered counts.
    const all = await workspaceIngredientFacets(asUser(B), WORKSPACE_W_ID, {});
    const local = await workspaceIngredientFacets(asUser(B), WORKSPACE_W_ID, { source: 'local' });
    const inStock = await workspaceIngredientFacets(asUser(B), WORKSPACE_W_ID, {
      inStock: true,
    });
    expect(countedOf(local, 'forms')).not.toEqual(countedOf(all, 'forms'));
    expect(countedOf(inStock, 'forms')).toEqual(['Fullform', 'Heldform', 'Root']);
  });

  describe('the Source and In Stock counts', () => {
    /**
     * W's local entries (one jarred at 4, one with a jar at 0, one with a jar
     * of no quantity, one with no jar), a compendium entry W holds in stock, one
     * it holds at 0, one it does not hold, and X's local entry with a jar in X.
     */
    async function seedSources(): Promise<void> {
      const form = (name: string, workspaceId?: string) =>
        add(name, { workspaceId, variants: [makeVariant({ form: `${name}form` })] });
      const full = await form('Fullwort', WORKSPACE_W_ID);
      await stock(full, WORKSPACE_W_ID, 'Fullwortform', '4');
      const spent = await form('Spentwort', WORKSPACE_W_ID);
      await stock(spent, WORKSPACE_W_ID, 'Spentwortform', '0');
      const unweighed = await form('Unweighedwort', WORKSPACE_W_ID);
      await stock(unweighed, WORKSPACE_W_ID, 'Unweighedwortform');
      await form('Barewort', WORKSPACE_W_ID);
      const held = await form('Heldwort');
      await hold(held);
      await stock(held, WORKSPACE_W_ID, 'Heldwortform', '2');
      const heldSpent = await form('Heldspentwort');
      await hold(heldSpent);
      await stock(heldSpent, WORKSPACE_W_ID, 'Heldspentwortform', '0');
      await form('Unheldwort');
      const elsewhere = await form('Elsewort', WORKSPACE_X_ID);
      await stock(elsewhere, WORKSPACE_X_ID, 'Elsewortform', '9');
    }

    const countOf = (facets: { source: { value: string; count: number }[] }, value: string) =>
      facets.source.find((entry) => entry.value === value)?.count;

    it('counts Local and Compendium, both always present, zeros kept', async () => {
      await seedSources();

      const facets = await workspaceIngredientFacets(asUser(B), WORKSPACE_W_ID, {});

      expect(facets.source).toEqual([
        { value: 'local', count: 4 },
        { value: 'compendium', count: 2 },
      ]);
      expect(facets.inStock).toBe(3);

      await sql`truncate ingredients cascade`;
      const empty = await workspaceIngredientFacets(asUser(B), WORKSPACE_W_ID, {});
      expect(empty.source).toEqual([
        { value: 'local', count: 0 },
        { value: 'compendium', count: 0 },
      ]);
      expect(empty.inStock).toBe(0);
    });

    it('counts each source under inStock and the rest, whatever source is chosen', async () => {
      await seedSources();

      for (const source of [undefined, 'local', 'compendium'] as const) {
        const stocked = await workspaceIngredientFacets(asUser(B), WORKSPACE_W_ID, {
          source,
          inStock: true,
        });
        // A jar at 0 is out of stock; one with no quantity is held.
        expect(stocked.source).toEqual([
          { value: 'local', count: 2 },
          { value: 'compendium', count: 1 },
        ]);
      }
    });

    it('counts In Stock under the chosen source, whatever inStock is', async () => {
      await seedSources();
      const expected = { undefined: 3, local: 2, compendium: 1 };

      for (const source of [undefined, 'local', 'compendium'] as const) {
        for (const inStock of [undefined, true]) {
          const facets = await workspaceIngredientFacets(asUser(B), WORKSPACE_W_ID, {
            source,
            inStock,
          });
          expect({ source, inStock, count: facets.inStock }).toEqual({
            source,
            inStock,
            count: expected[`${source}`],
          });
        }
      }
    });

    it('counts what the list totals with that value added, and counts the rest of the filter', async () => {
      await seedSources();
      const bases = [{}, { query: 'wort' }, { query: 'held' }, { toxic: 'not_toxic' as const }];

      let checked = 0;
      for (const base of bases) {
        for (const inStock of [{}, { inStock: true }]) {
          const facets = await workspaceIngredientFacets(asUser(B), WORKSPACE_W_ID, {
            ...base,
            ...inStock,
          });
          for (const value of ['local', 'compendium'] as const) {
            expect({ base, inStock, value, count: countOf(facets, value) }).toEqual({
              base,
              inStock,
              value,
              count: await listedCount(asUser(B), { ...base, ...inStock, source: value }),
            });
            checked += 1;
          }
        }
        for (const source of [{}, { source: 'local' as const }]) {
          const facets = await workspaceIngredientFacets(asUser(B), WORKSPACE_W_ID, {
            ...base,
            ...source,
          });
          expect({ base, source, count: facets.inStock }).toEqual({
            base,
            source,
            count: await listedCount(asUser(B), { ...base, ...source, inStock: true }),
          });
          checked += 1;
        }
      }
      expect(checked).toBe(24);
      // Why the rest of the filter could have changed nothing: it does.
      const narrowed = await workspaceIngredientFacets(asUser(B), WORKSPACE_W_ID, {
        query: 'held',
      });
      expect(narrowed.source).toEqual([
        { value: 'local', count: 0 },
        { value: 'compendium', count: 2 },
      ]);
    });

    it("leaves another coven's entries and jars out of both counts", async () => {
      await seedSources();

      const elsewhere = await workspaceIngredientFacets(asUser(D), WORKSPACE_X_ID, {});

      expect(elsewhere.source).toEqual([
        { value: 'local', count: 1 },
        { value: 'compendium', count: 0 },
      ]);
      expect(elsewhere.inStock).toBe(1);
    });
  });

  describe('the Low Stock Only count (M9.8)', () => {
    /** W: a low jar, an out jar, a healthy jar, an unweighed one, a held compendium entry low; X: its own out jar. */
    async function seedLow(): Promise<void> {
      const form = (name: string, workspaceId?: string) =>
        add(name, { workspaceId, variants: [makeVariant({ form: `${name}form` })] });
      const jar = async (name: string, quantity: string | null, workspaceId = WORKSPACE_W_ID) => {
        const id = await form(name, workspaceId);
        await stock(id, workspaceId, `${name}form`, quantity, '3');
      };
      await jar('Lowwort', '2');
      await jar('Outwort', '0');
      await jar('Fullwort', '50');
      await jar('Unweighedwort', null);
      await jar('Elsewort', '0', WORKSPACE_X_ID);
      const held = await form('Heldlowwort');
      await hold(held);
      await stock(held, WORKSPACE_W_ID, 'Heldlowwortform', '1', '3');
    }

    it('counts the entries with a Low Stock or Out of Stock jar, in this coven alone', async () => {
      await seedLow();

      const facets = await workspaceIngredientFacets(asUser(B), WORKSPACE_W_ID, {});
      const elsewhere = await workspaceIngredientFacets(asUser(D), WORKSPACE_X_ID, {});

      // Why it could have been larger: W lists five entries, and X holds a jar that is out.
      expect(facets.source.reduce((sum, { count }) => sum + count, 0)).toBe(5);
      expect(facets.lowStockOnly).toBe(3);
      expect(elsewhere.lowStockOnly).toBe(1);
    });

    it("equals the list's total with the switch on, whatever the rest of the filter and the switch itself", async () => {
      await seedLow();
      const bases = [{}, { query: 'low' }, { source: 'local' as const }, { inStock: true }];

      for (const base of bases) {
        for (const on of [{}, { lowStockOnly: true }]) {
          const facets = await workspaceIngredientFacets(asUser(B), WORKSPACE_W_ID, {
            ...base,
            ...on,
          });
          expect({ base, on, count: facets.lowStockOnly }).toEqual({
            base,
            on,
            count: await listedCount(asUser(B), { ...base, lowStockOnly: true }),
          });
        }
      }
    });

    it('counts the other values under the switch as the list reads them', async () => {
      await seedLow();

      const facets = await workspaceIngredientFacets(asUser(B), WORKSPACE_W_ID, {
        lowStockOnly: true,
      });

      expect(countedOf(facets, 'forms')).toEqual(['Heldlowwortform', 'Lowwortform', 'Outwortform']);
      expect(facets.source).toEqual([
        { value: 'local', count: 2 },
        { value: 'compendium', count: 1 },
      ]);
    });
  });

  // The viewer stands for every role: reading is one permission owner, member
  // and viewer all hold (tests/modules/coven/services/access-control.test.ts).
  it('counts W for C, a viewer', async () => {
    await seedCovens();

    const facets = await workspaceIngredientFacets(asUser(C), WORKSPACE_W_ID, {});

    expect(countedOf(facets, 'forms')).toContain('Covenform');
  });

  it("gives D, over X, none of W's values, and refuses D naming W", async () => {
    await seedCovens();
    // Why D could have read them: W's call returns each, and D is admitted to a coven.
    const own = await workspaceIngredientFacets(asUser(A), WORKSPACE_W_ID, {});
    expect(countedOf(own, 'forms')).toEqual(['Covenform', 'Heldform', 'Root']);
    expect(valuesOf(own, 'deities')).toEqual([hecate]);
    expect(valuesOf(own, 'categories')).toEqual([protection]);

    const elsewhere = await workspaceIngredientFacets(asUser(D), WORKSPACE_X_ID, {});
    expect(elsewhere.forms).toEqual([{ value: 'Elseform', count: 1 }]);
    expect(elsewhere.deities).toEqual([]);
    expect(elsewhere.categories).toEqual([]);
    expect(countedOf(elsewhere, 'zodiacSigns')).toEqual(['Aries']);

    await expect(workspaceIngredientFacets(asUser(D), WORKSPACE_W_ID, {})).rejects.toThrow(
      Forbidden,
    );
  });

  it('refuses the site admin, who belongs to no coven', async () => {
    await seedCovens();
    expect(
      countedOf(await workspaceIngredientFacets(asUser(B), WORKSPACE_W_ID, {}), 'forms'),
    ).toContain('Covenform');

    await expect(workspaceIngredientFacets(asUser(E), WORKSPACE_W_ID, {})).rejects.toThrow(
      Forbidden,
    );
  });

  it('is never cached: a repeat read sees a row written in between', async () => {
    await add('Covenwort', {
      workspaceId: WORKSPACE_W_ID,
      variants: [makeVariant({ form: 'Covenform' })],
    });
    expect(
      countedOf(await workspaceIngredientFacets(asUser(B), WORKSPACE_W_ID, {}), 'forms'),
    ).toEqual(['Covenform']);

    await add('Laterwort', {
      workspaceId: WORKSPACE_W_ID,
      variants: [makeVariant({ form: 'Laterform' })],
    });

    expect(
      countedOf(await workspaceIngredientFacets(asUser(B), WORKSPACE_W_ID, {}), 'forms'),
    ).toEqual(['Covenform', 'Laterform']);
  });
});

/** How many entries the coven list shows `session` in W under `filter`. */
async function listedCount(
  session: Session,
  filter: Parameters<typeof countWorkspaceIngredients>[2],
): Promise<number> {
  const { totalCount } = await countWorkspaceIngredients(
    session,
    WORKSPACE_W_ID,
    filter,
    undefined,
  );
  return totalCount;
}
