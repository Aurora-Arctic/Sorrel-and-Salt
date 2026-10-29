import { describe, expect, it, vi } from 'vitest';
import { Forbidden } from '@/lib/errors';

// M13.21: what the recipe page's side column reads, as the builder's own steps hold it:
// each step's categories (its ingredient's and its form's) and the coven's jar of its form.
// The services are mocked; what they refuse is their own tests'.

const categoriesOf = vi.fn();
const categoriesOfVariants = vi.fn();
const stockOf = vi.fn();
const variantsOf = vi.fn();
vi.mock('@/modules/ingredients', () => ({
  categoriesOf,
  categoriesOfVariants,
  stockOf,
  variantsOf,
}));
vi.mock('@/app/compendium-reads', () => ({
  readCategories: async () => [
    { id: 'cat-1', name: 'Testwarding', group: { colorDark: '#a0c4ff', colorLight: '#1d3557' } },
    { id: 'cat-2', name: 'Calm', group: { colorDark: '#aaaaaa', colorLight: '#222222' } },
  ],
}));

const { readRecipeAsideOf } = await import('@/app/(shell)/coven/[slug]/grimoire/[id]/recipe-aside');

const session = { user: { id: 'fixture-user' } } as never;
const COVEN = 'c0ffee00-0000-4000-8000-000000000001';
const HERE = '/coven/fixture-coven/grimoire/sp' as never;
const read = (views: never[], intended: never[] = [], mayStock = true) =>
  readRecipeAsideOf(session, COVEN, views, intended, HERE, mayStock);
const row = {
  spellId: 'sp',
  ingredientId: null,
  variantId: null,
  name: null,
  form: null,
  quantity: null,
  unit: null,
  body: null,
  note: null,
  ingredient: null,
  variant: null,
};
const linked = {
  ...row,
  id: 's-1',
  ingredientId: 'ing-1',
  variantId: 'v-1',
  quantity: '2.000',
  unit: 'tsp',
  ingredient: {
    id: 'ing-1',
    workspaceId: null,
    name: 'Testwort',
    canonicalName: null,
    nomenclature: 'none',
    deleted: false,
  },
  variant: {
    id: 'v-1',
    ingredientId: 'ing-1',
    workspaceId: null,
    form: 'dried leaf',
    deleted: false,
  },
};
const oneOff = { ...row, id: 's-2', name: 'Fixture Dust', form: 'dust' };
const instruction = { ...row, id: 's-3', body: 'Stir.' };
const views = [linked, oneOff, instruction] as never[];

describe('readRecipeAsideOf', () => {
  it("reads each linked step's categories, ingredient's then form's, and the coven's jar of its form", async () => {
    categoriesOf.mockResolvedValue([[{ id: 'cat-1', name: 'Testwarding' }]]);
    categoriesOfVariants.mockResolvedValue([[{ id: 'cat-2', name: 'Calm' }]]);
    stockOf.mockResolvedValue([
      [
        {
          id: 'jar-1',
          variantId: 'v-1',
          unit: 'g',
          quantityOnHand: '12.5',
          lowStockThreshold: '2',
        },
      ],
    ]);
    variantsOf.mockResolvedValue([
      [
        { id: 'v-1', form: 'dried leaf' },
        { id: 'v-2', form: 'root' },
      ],
    ]);
    const aside = await read(views, [
      {
        category: { id: 'cat-1', name: 'Testwarding' },
        group: { colorDark: '#a', colorLight: '#b' },
      },
    ] as never[]);

    expect(categoriesOf).toHaveBeenCalledWith(session, [{ id: 'ing-1', workspaceId: null }]);
    expect(categoriesOfVariants).toHaveBeenCalledWith(session, [
      { id: 'v-1', ingredientId: 'ing-1', workspaceId: null },
    ]);
    expect(stockOf).toHaveBeenCalledWith(session, [{ ingredientId: 'ing-1', workspaceId: COVEN }]);
    expect(aside.steps).toEqual([
      expect.objectContaining({
        stepId: 's-1',
        ingredientId: 'ing-1',
        variantId: 'v-1',
        name: 'Testwort',
        form: 'dried leaf',
        quantity: '2',
        unit: 'tsp',
        categories: [
          { id: 'cat-1', name: 'Testwarding' },
          { id: 'cat-2', name: 'Calm' },
        ],
        jar: { unit: 'g', quantity: 12.5, threshold: 2 },
        jarUnit: 'g',
      }),
      expect.objectContaining({
        stepId: 's-2',
        ingredientId: null,
        name: 'Fixture Dust',
        form: 'dust',
        categories: [],
        jar: null,
      }),
      expect.objectContaining({ stepId: 's-3', name: null, body: 'Stir.', categories: [] }),
    ]);
    expect(aside.intended).toEqual([{ id: 'cat-1', name: 'Testwarding' }]);
    // Each linked step's doors (the owner, 2026-10-29): the Quick Look eye to this page's
    // `?entry=`, and Edit Stock on the ingredient's forms and the coven's jars, opening on its form.
    expect(variantsOf).toHaveBeenCalledWith(session, [{ id: 'ing-1', workspaceId: null }]);
    expect(aside.doors).toEqual([
      {
        stepId: 's-1',
        look: {
          href: `${HERE}?entry=ing-1`,
          name: 'Testwort',
          canonicalName: null,
          nomenclature: 'none',
        },
        stock: {
          workspaceId: COVEN,
          ingredientId: 'ing-1',
          ingredientName: 'Testwort',
          forms: [
            { variantId: 'v-1', label: 'Dried Leaf' },
            { variantId: 'v-2', label: 'Root' },
          ],
          jars: [{ id: 'jar-1', variantId: 'v-1', quantity: 12.5, unit: 'g', threshold: 2 }],
          openOn: 'v-1',
        },
      },
    ]);
    expect(aside.groups).toEqual([
      ['cat-1', { colorDark: '#a0c4ff', colorLight: '#1d3557' }],
      ['cat-2', { colorDark: '#aaaaaa', colorLight: '#222222' }],
    ]);
  });

  it('reads nothing for a spell with no linked step, and gives a refused ingredient no categories, no jar and no door', async () => {
    const aside = await read([oneOff, instruction] as never[]);
    expect(categoriesOf).not.toHaveBeenCalled();
    expect(stockOf).not.toHaveBeenCalled();
    expect(variantsOf).not.toHaveBeenCalled();
    expect(aside.steps).toHaveLength(2);
    expect(aside.doors).toEqual([]);

    categoriesOf.mockResolvedValue([new Forbidden()]);
    categoriesOfVariants.mockResolvedValue([new Forbidden()]);
    stockOf.mockResolvedValue([new Forbidden()]);
    variantsOf.mockResolvedValue([new Forbidden()]);
    const refused = await read([linked] as never[]);
    expect(refused.steps[0]).toEqual(expect.objectContaining({ categories: [], jar: null }));
    expect(refused.doors).toEqual([expect.objectContaining({ stepId: 's-1', stock: null })]);
  });

  it('gives a role that may not update stock the eye and no Edit Stock, and a deleted ingredient neither', async () => {
    categoriesOf.mockResolvedValue([[]]);
    categoriesOfVariants.mockResolvedValue([[]]);
    stockOf.mockResolvedValue([[]]);
    variantsOf.mockResolvedValue([[{ id: 'v-1', form: 'dried leaf' }]]);
    const viewer = await read([linked] as never[], [], false);
    expect(variantsOf).not.toHaveBeenCalled();
    expect(viewer.doors).toEqual([
      { stepId: 's-1', look: expect.objectContaining({ name: 'Testwort' }), stock: null },
    ]);

    const gone = {
      ...linked,
      ingredient: { ...linked.ingredient, deleted: true },
      variant: { ...linked.variant, deleted: true },
    };
    const deleted = await read([gone] as never[]);
    expect(deleted.doors).toEqual([{ stepId: 's-1', look: null, stock: null }]);
  });
});
