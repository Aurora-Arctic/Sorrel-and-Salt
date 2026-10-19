import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CARD_PAGE_SIZE } from '@/lib/pagination';

// The coven's Ingredients reads (M9.6). The services are mocked, since what they decide is
// their own tests'. Here: the page size, the one batch per page for forms, categories and
// jars, and what each edge keeps for the card.

const COVEN = '5b8f4a10-2d6e-4c19-8a37-0e9d1c2b3a44';
const session = { user: { id: 'fixture-user' } };
vi.mock('@/lib/request-session', () => ({ requireSession: async () => session }));

const listWorkspaceIngredients = vi.fn();
const countWorkspaceIngredients = vi.fn();
const stockOf = vi.fn();
const variantsOf = vi.fn();
const workspaceIngredientFacets = vi.fn();
vi.mock('@/modules/ingredients', () => ({
  listWorkspaceIngredients,
  countWorkspaceIngredients,
  stockOf,
  variantsOf,
  workspaceIngredientFacets,
}));

const readCardCategoriesOf = vi.fn();
vi.mock('@/app/compendium-reads', () => ({
  readCardCategoriesOf,
  readFormIcons: async () => new Map([['fixture herb', 'leaf']]),
}));

const { readCovenIngredients, readCovenFacets } =
  await import('@/app/(shell)/coven/[slug]/ingredients/reads');

const own = { id: 'a1', workspaceId: COVEN };
const held = { id: 'b2', workspaceId: null };
const entry = (node: { id: string; workspaceId: string | null }, cupboardEntry: object | null) => ({
  node,
  cursor: { key: ['fixture'], id: node.id },
  cupboardEntry,
});

beforeEach(() => {
  vi.clearAllMocks();
  listWorkspaceIngredients.mockResolvedValue([entry(own, null), entry(held, { label: 'Ours' })]);
  countWorkspaceIngredients.mockResolvedValue({ totalCount: 2, countBefore: null });
  variantsOf.mockResolvedValue([
    [{ id: 'v1', form: 'Fixture Herb', toxic: false, safetyNotes: null }],
    [{ id: 'v2', form: 'Fixture Oil', toxic: true, safetyNotes: 'Fixture note' }],
  ]);
  readCardCategoriesOf.mockResolvedValue([[], []]);
  stockOf.mockResolvedValue([[{ id: 'j1' }], []]);
});

describe('readCovenIngredients', () => {
  it('reads one page of the card size, counted, for the signed-in session and the coven', async () => {
    const page = await readCovenIngredients(COVEN, '{}', undefined, undefined);

    expect(CARD_PAGE_SIZE).toBe(24);
    expect(listWorkspaceIngredients).toHaveBeenCalledWith(
      session,
      COVEN,
      {},
      expect.objectContaining({ limit: CARD_PAGE_SIZE + 1 }),
    );
    expect(page.position).toEqual({ page: 1, pages: 1 });
    expect(page.totalCount).toBe(2);
  });

  it('reads every jar of the page in one stock call, and its forms and categories in one each', async () => {
    const page = await readCovenIngredients(COVEN, '{}', undefined, undefined);

    expect(stockOf).toHaveBeenCalledTimes(1);
    expect(stockOf).toHaveBeenCalledWith(session, [
      { ingredientId: 'a1', workspaceId: COVEN },
      { ingredientId: 'b2', workspaceId: COVEN },
    ]);
    expect(variantsOf).toHaveBeenCalledTimes(1);
    expect(readCardCategoriesOf).toHaveBeenCalledTimes(1);
    expect(variantsOf).toHaveBeenCalledWith(session, [own, held]);
    expect(page.jars).toEqual([[{ id: 'j1' }], []]);
  });

  it("keeps each edge's cupboard entry, and draws a form's icon by its name", async () => {
    const page = await readCovenIngredients(COVEN, '{}', undefined, undefined);

    expect(page.edges.map(({ cupboardEntry }) => cupboardEntry)).toEqual([null, { label: 'Ours' }]);
    expect(page.variants[0][0].formChoice).toEqual({ group: { icon: 'leaf' } });
    expect(page.variants[1][0].formChoice).toBeNull();
  });

  it('names the form of every variant on the page, so a jar can say which form it holds', async () => {
    const page = await readCovenIngredients(COVEN, '{}', undefined, undefined);

    expect(Object.fromEntries(page.formOf)).toEqual({ v1: 'Fixture Herb', v2: 'Fixture Oil' });
  });

  it('passes the address variables to the list as the filter', async () => {
    await readCovenIngredients(COVEN, '{"source":"local","inStock":true}', undefined, undefined);

    expect(listWorkspaceIngredients.mock.calls[0][2]).toEqual({ source: 'local', inStock: true });
    expect(countWorkspaceIngredients.mock.calls[0][2]).toEqual({ source: 'local', inStock: true });
  });

  it('throws a refusal in a batch rather than draw a card without its jars', async () => {
    stockOf.mockResolvedValue([new Error('Forbidden'), []]);

    await expect(readCovenIngredients(COVEN, '{}', undefined, undefined)).rejects.toThrow();
  });
});

describe('readCovenFacets', () => {
  it('reads the facets for the session, the coven and the filter', async () => {
    workspaceIngredientFacets.mockResolvedValue({ forms: [] });

    await readCovenFacets(COVEN, '{"inStock":true}');

    expect(workspaceIngredientFacets).toHaveBeenCalledWith(session, COVEN, { inStock: true });
  });
});
