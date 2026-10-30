import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CARD_PAGE_SIZE } from '@/lib/pagination';

// The coven's Ingredients reads. The services are mocked, since what they decide is
// their own tests'. Here: the page size, the one batch per page for forms, categories and
// jars, and what each edge keeps for the card.

const COVEN = '5b8f4a10-2d6e-4c19-8a37-0e9d1c2b3a44';
const membership = { workspaceId: '5b8f4a10-2d6e-4c19-8a37-0e9d1c2b3a44', role: 'member' } as never;
const session = { user: { id: 'fixture-user' } };
vi.mock('@/lib/request-session', () => ({ requireSession: async () => session }));

const listWorkspaceIngredients = vi.fn();
const countWorkspaceIngredients = vi.fn();
const stockOf = vi.fn();
const lastEditsOf = vi.fn();
const variantsOf = vi.fn();
const getIngredient = vi.fn();
const heldCompendiumEntry = vi.fn();
const ingredientDetailOf = vi.fn();
const covenJarsOf = vi.fn();
const covensHolding = vi.fn();
const workspaceIngredientFacets = vi.fn();
vi.mock('@/modules/ingredients', () => ({
  listWorkspaceIngredients,
  countWorkspaceIngredients,
  stockOf,
  lastEditsOf,
  variantsOf,
  workspaceIngredientFacets,
  getIngredient,
  heldCompendiumEntry,
  ingredientDetailOf,
  applyCupboardEntry: (entry: unknown) => entry,
  isRetired: () => false,
}));
vi.mock('@/app/coven-stock', () => ({ covenJarsOf }));
vi.mock('@/app/plus-covens', () => ({ covensHolding }));
vi.mock('@/app/entry-values', () => ({ entryValues: vi.fn() }));

const readCardCategoriesOf = vi.fn();
vi.mock('@/app/compendium-reads', () => ({
  readCardCategoriesOf,
  readFormIcons: async () => new Map([['fixture herb', 'leaf']]),
}));

const { readCovenIngredients, readCovenFacets, readViewedEntry } =
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
  lastEditsOf.mockResolvedValue([{ by: 'Fixture Name', at: '2026-01-01T00:00:00.000Z' }, null]);
});

describe('readCovenIngredients', () => {
  it('reads one page of the card size, counted, for the signed-in session and the coven', async () => {
    const page = await readCovenIngredients(COVEN, '{}', undefined, undefined, membership);

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
    const page = await readCovenIngredients(COVEN, '{}', undefined, undefined, membership);

    expect(stockOf).toHaveBeenCalledTimes(1);
    expect(stockOf).toHaveBeenCalledWith(session, [
      { ingredientId: 'a1', workspaceId: COVEN },
      { ingredientId: 'b2', workspaceId: COVEN },
    ]);
    expect(variantsOf).toHaveBeenCalledTimes(1);
    expect(readCardCategoriesOf).toHaveBeenCalledTimes(1);
    expect(variantsOf).toHaveBeenCalledWith(session, [own, held], membership);
    expect(readCardCategoriesOf).toHaveBeenCalledWith(session, [own, held], membership);
    expect(page.jars).toEqual([[{ id: 'j1' }], []]);
  });

  it('keeps what each edge needs for the card: its cupboard entry, form icons, form names and variant ids', async () => {
    const page = await readCovenIngredients(COVEN, '{}', undefined, undefined, membership);

    expect(page.edges.map(({ cupboardEntry }) => cupboardEntry)).toEqual([null, { label: 'Ours' }]);
    // A form's icon is drawn by its name.
    expect(page.variants[0][0].formChoice).toEqual({ group: { icon: 'leaf' } });
    expect(page.variants[1][0].formChoice).toBeNull();
    // Every variant's form is named, so a jar can say which form it holds.
    expect(Object.fromEntries(page.formOf)).toEqual({ v1: 'Fixture Herb', v2: 'Fixture Oil' });
    // The variant ids sit beside the forms, for the stock dialog.
    expect(page.variantIds).toEqual([['v1'], ['v2']]);
  });

  it('passes the address variables to the list as the filter', async () => {
    await readCovenIngredients(
      COVEN,
      '{"source":"local","inStock":true}',
      undefined,
      undefined,
      membership,
    );

    expect(listWorkspaceIngredients.mock.calls[0][2]).toEqual({ source: 'local', inStock: true });
    expect(countWorkspaceIngredients.mock.calls[0][2]).toEqual({ source: 'local', inStock: true });
  });

  it("reads every entry's last edit in one batch for the page", async () => {
    const page = await readCovenIngredients(COVEN, '{}', undefined, undefined, membership);

    expect(lastEditsOf).toHaveBeenCalledTimes(1);
    expect(lastEditsOf).toHaveBeenCalledWith(session, COVEN, [own, held]);
    expect(page.lastEdits).toEqual([{ by: 'Fixture Name', at: '2026-01-01T00:00:00.000Z' }, null]);
  });

  it('throws a refusal in a batch rather than draw a card without its jars', async () => {
    stockOf.mockResolvedValue([new Error('Forbidden'), []]);

    await expect(
      readCovenIngredients(COVEN, '{}', undefined, undefined, membership),
    ).rejects.toThrow();
  });
});

describe('readCovenFacets', () => {
  it('reads the facets for the session, the coven and the filter', async () => {
    workspaceIngredientFacets.mockResolvedValue({ forms: [] });

    await readCovenFacets(COVEN, '{"inStock":true}');

    expect(workspaceIngredientFacets).toHaveBeenCalledWith(session, COVEN, { inStock: true });
  });
});

describe('readViewedEntry', () => {
  const edit = { by: 'Fixture Name', at: '2026-01-01T00:00:00.000Z' };
  const proof = { workspaceId: COVEN, role: 'member' } as never;

  beforeEach(() => {
    ingredientDetailOf.mockResolvedValue({ cupboardEntry: null });
    covenJarsOf.mockResolvedValue([]);
    covensHolding.mockResolvedValue([]);
    lastEditsOf.mockResolvedValue([edit]);
  });

  it("reads the coven's own entry's last edit as the cards do, for that one entry", async () => {
    getIngredient.mockResolvedValue(own);
    const read = await readViewedEntry(proof, 'a1');

    expect(lastEditsOf).toHaveBeenCalledWith(session, COVEN, [own]);
    expect(read?.lastEdit).toEqual(edit);
  });

  it('reads it for a held compendium entry too, and returns null when there is none', async () => {
    getIngredient.mockResolvedValue(held);
    heldCompendiumEntry.mockResolvedValue({ entry: held, cupboardEntry: null });
    lastEditsOf.mockResolvedValue([null]);
    const read = await readViewedEntry(proof, 'b2');

    expect(lastEditsOf).toHaveBeenCalledWith(session, COVEN, [held]);
    expect(read?.lastEdit).toBeNull();
  });
});
