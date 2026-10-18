import { beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { Forbidden, ValidationError } from '@/lib/errors';
import { resolvePage } from '@/lib/pagination';
import type { Session } from '@/lib/session';
import {
  type IngredientFacets,
  compendiumFacets,
  listWorkspaceIngredients,
  workspaceIngredientFacets,
} from '@/modules/ingredients';
import { A, B, C, D, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
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
): Promise<void> {
  const variantId = await variantIdOf(sql, ingredientId, form);
  await insertStock(sql, { workspaceId, ingredientId, variantId, quantityOnHand }, A.id);
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
   * W's own entry and a compendium entry W holds, each with values no other
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

  it('counts each value as the list reads it under source and inStockOnly', async () => {
    await seedCovens();
    const spent = await add('Spentwort', { variants: [makeVariant({ form: 'Spentform' })] });
    await stock(spent, WORKSPACE_W_ID, 'Spentform', '0');
    const full = await add('Fullwort', {
      variants: [makeVariant({ form: 'Fullform' })],
      toxic: true,
    });
    await stock(full, WORKSPACE_W_ID, 'Fullform', '4');
    const bases = [
      { source: 'local' as const },
      { source: 'compendium' as const },
      { inStockOnly: true },
      { source: 'compendium' as const, inStockOnly: true },
      { source: 'local' as const, inStockOnly: true },
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
      inStockOnly: true,
    });
    expect(countedOf(local, 'forms')).not.toEqual(countedOf(all, 'forms'));
    expect(countedOf(inStock, 'forms')).toEqual(['Fullform', 'Heldform', 'Root']);
  });

  it.each([
    ['A, the owner', A],
    ['B, a member', B],
    ['C, a viewer', C],
  ])('counts W for %s', async (_label, user) => {
    await seedCovens();

    const facets = await workspaceIngredientFacets(asUser(user), WORKSPACE_W_ID, {});

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
  filter: Parameters<typeof listWorkspaceIngredients>[2],
): Promise<number> {
  const page = await resolvePage({ first: 100 }, (request) =>
    listWorkspaceIngredients(session, WORKSPACE_W_ID, filter, request),
  );
  return page.edges.length;
}
