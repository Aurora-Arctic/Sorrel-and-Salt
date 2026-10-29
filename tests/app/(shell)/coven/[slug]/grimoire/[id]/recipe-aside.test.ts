import { describe, expect, it, vi } from 'vitest';
import { Forbidden } from '@/lib/errors';

// M13.21: what the recipe page's side column reads, as the builder's own steps hold it:
// each step's categories (its ingredient's and its form's) and the coven's jar of its form.
// The services are mocked; what they refuse is their own tests'.

const categoriesOf = vi.fn();
const categoriesOfVariants = vi.fn();
const stockOf = vi.fn();
vi.mock('@/modules/ingredients', () => ({ categoriesOf, categoriesOfVariants, stockOf }));
vi.mock('@/app/compendium-reads', () => ({
  readCategories: async () => [
    { id: 'cat-1', name: 'Testwarding', group: { colorDark: '#a0c4ff', colorLight: '#1d3557' } },
    { id: 'cat-2', name: 'Calm', group: { colorDark: '#aaaaaa', colorLight: '#222222' } },
  ],
}));

const { readRecipeAsideOf } = await import('@/app/(shell)/coven/[slug]/grimoire/[id]/recipe-aside');

const session = { user: { id: 'fixture-user' } } as never;
const COVEN = 'c0ffee00-0000-4000-8000-000000000001';
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
  ingredient: { id: 'ing-1', workspaceId: null, name: 'Testwort', deleted: false },
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
      [{ variantId: 'v-1', unit: 'g', quantityOnHand: '12.5', lowStockThreshold: '2' }],
    ]);
    const aside = await readRecipeAsideOf(session, COVEN, views, [
      {
        category: { id: 'cat-1', name: 'Testwarding' },
        group: { colorDark: '#a', colorLight: '#b' },
      },
    ]);

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
    expect(aside.groups).toEqual([
      ['cat-1', { colorDark: '#a0c4ff', colorLight: '#1d3557' }],
      ['cat-2', { colorDark: '#aaaaaa', colorLight: '#222222' }],
    ]);
  });

  it('reads nothing for a spell with no linked step, and gives a refused ingredient no categories and no jar', async () => {
    const aside = await readRecipeAsideOf(session, COVEN, [oneOff, instruction] as never[], []);
    expect(categoriesOf).not.toHaveBeenCalled();
    expect(stockOf).not.toHaveBeenCalled();
    expect(aside.steps).toHaveLength(2);

    categoriesOf.mockResolvedValue([new Forbidden()]);
    categoriesOfVariants.mockResolvedValue([new Forbidden()]);
    stockOf.mockResolvedValue([new Forbidden()]);
    const refused = await readRecipeAsideOf(session, COVEN, [linked] as never[], []);
    expect(refused.steps[0]).toEqual(expect.objectContaining({ categories: [], jar: null }));
  });
});
