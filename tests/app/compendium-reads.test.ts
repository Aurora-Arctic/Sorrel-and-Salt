import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Forbidden, NotFound } from '@/lib/errors';
import { entryDetail } from '../support/entry-detail';

// The details a Quick Look opens over the public cards: an entry by id, read with no session, through the cached public entry read. The services are mocked.
// That a coven's own id answers `NotFound` with no session is getIngredient's test (tests/modules/ingredients/services/compendium.test.ts); here, the read asks it with none and turns the refusal into nothing for the page to open.

const getIngredient = vi.fn();
const readCompendiumEntry = vi.fn();
// The reads narrowed to the viewer’s covens: which ids they admit is
// tests/modules/ingredients/services/compendium-held-in.test.ts’s; here, that each takes the
// session and the picked ids from the page’s variables, apart from the rest of the filter.
const listCompendiumHeldIn = vi.fn();
const countCompendiumHeldIn = vi.fn();
const compendiumFacetsHeldIn = vi.fn();
const variantsOf = vi.fn();
const cardCategoriesOf = vi.fn();
vi.mock('@/modules/ingredients', () => ({
  cardCategoriesOf,
  getIngredient,
  readCompendiumEntry,
  listCompendiumHeldIn,
  countCompendiumHeldIn,
  compendiumFacetsHeldIn,
  variantsOf,
}));
// One live category in one group, as the card read finds them through the vocabulary.
const WARD = {
  id: 'cat-ward',
  slug: 'testward',
  name: 'Testward',
  description: '',
  groupId: 'g-1',
};
const CHARM = { ...WARD, id: 'cat-charm', slug: 'testcharm', name: 'Testcharm' };
const GROUP = { id: 'g-1', name: 'Testgroup', colorDark: '#112233', colorLight: '#445566' };
vi.mock('@/modules/vocabulary', () => ({
  formChoicesOf: async () => [],
  formGroupsOf: async () => [],
  listCategories: async () => [WARD, CHARM].map((node) => ({ node, cursor: node.id })),
  categoryGroupsOf: async () => [GROUP],
}));

const { readCardCategoriesOf, readCompendiumDetails, readCompendiumHeldIn, readFacetsHeldIn } =
  await import('@/app/compendium-reads');

const DETAIL = entryDetail();
const ID = DETAIL.entry.id;

beforeEach(() => {
  getIngredient.mockReset();
  getIngredient.mockResolvedValue(DETAIL.entry);
  readCompendiumEntry.mockReset();
  readCompendiumEntry.mockResolvedValue({ kind: 'entry', detail: DETAIL, movedAway: null });
});

describe('readCompendiumDetails', () => {
  it("reads the entry by id with no session, then its page's cached read by its slug", async () => {
    await expect(readCompendiumDetails(ID)).resolves.toBe(DETAIL);

    expect(getIngredient).toHaveBeenCalledWith(null, ID);
    expect(readCompendiumEntry).toHaveBeenCalledWith(DETAIL.entry.slug);
  });

  it('answers nothing for an id that names no compendium entry, a coven entry included', async () => {
    getIngredient.mockRejectedValue(new NotFound('No such ingredient'));

    await expect(readCompendiumDetails('a-coven-entry')).resolves.toBeUndefined();
    expect(readCompendiumEntry).not.toHaveBeenCalled();
  });

  it('lets any other failure through', async () => {
    getIngredient.mockRejectedValue(new Forbidden());

    await expect(readCompendiumDetails('another-id')).rejects.toBeInstanceOf(Forbidden);
  });
});

describe('readCompendiumHeldIn and readFacetsHeldIn', () => {
  const SESSION = { userId: 'user-fixture' } as never;
  const VARIABLES = JSON.stringify({ query: 'wort', covenIds: ['w-1', 'w-2'] });

  it('reads the page, its count and its forms with the session and the picked covens', async () => {
    const node = { id: 'entry-1' };
    listCompendiumHeldIn.mockResolvedValue([
      { node, cursor: { key: ['Testwort'], id: 'entry-1' } },
    ]);
    countCompendiumHeldIn.mockResolvedValue({ totalCount: 1, before: 0 });
    variantsOf.mockResolvedValue([[{ form: 'Fixture Herb', formId: null }]]);

    const page = await readCompendiumHeldIn(SESSION, VARIABLES, undefined, undefined, 24);

    expect(listCompendiumHeldIn).toHaveBeenCalledWith(
      SESSION,
      { covenIds: ['w-1', 'w-2'] },
      { query: 'wort' },
      expect.anything(),
    );
    expect(countCompendiumHeldIn.mock.lastCall!.slice(0, 3)).toEqual([
      SESSION,
      { covenIds: ['w-1', 'w-2'] },
      { query: 'wort' },
    ]);
    expect(page.edges.map((edge) => edge.node.id)).toEqual(['entry-1']);
    expect(page.variants).toEqual([[expect.objectContaining({ form: 'Fixture Herb' })]]);
  });

  it('reads the facet counts with the session and the picked covens', async () => {
    compendiumFacetsHeldIn.mockResolvedValue({ toxic: [] });
    await expect(readFacetsHeldIn(SESSION, VARIABLES)).resolves.toEqual({ toxic: [] });
    expect(compendiumFacetsHeldIn).toHaveBeenCalledWith(
      SESSION,
      { covenIds: ['w-1', 'w-2'] },
      { query: 'wort' },
    );
  });

  it('passes Not In on beside the picked covens, or with none picked', async () => {
    compendiumFacetsHeldIn.mockResolvedValue({ toxic: [] });
    await readFacetsHeldIn(SESSION, JSON.stringify({ query: 'wort', covensNot: true }));
    expect(compendiumFacetsHeldIn).toHaveBeenLastCalledWith(
      SESSION,
      { covenIds: [], covensNot: true },
      { query: 'wort' },
    );
    await readFacetsHeldIn(SESSION, JSON.stringify({ covenIds: ['w-1'], covensNot: true }));
    expect(compendiumFacetsHeldIn).toHaveBeenLastCalledWith(
      SESSION,
      { covenIds: ['w-1'], covensNot: true },
      {},
    );
  });
});

// The one read the compendium's cards and a coven's cupboard share. Which categories it finds is
// tests/modules/ingredients/services/card-categories.test.ts's; here, that each chip keeps its forms, as
// the screen names a form, and its group's colours.
describe('readCardCategoriesOf', () => {
  it('passes the session, the refs and the holding coven on, and gives a form-only chip the forms that carry it', async () => {
    cardCategoriesOf.mockResolvedValue([
      [
        { category: WARD, forms: [] },
        { category: CHARM, forms: ['dried testleaf', 'testoil'] },
      ],
    ]);
    const session = { user: { id: 'u-1' } } as never;
    const refs = [{ id: 'i-1', workspaceId: 'w-1' }];
    const heldBy = { workspaceId: 'w-1' } as never;

    const [chips] = await readCardCategoriesOf(session, refs, heldBy);

    expect(cardCategoriesOf).toHaveBeenCalledExactlyOnceWith(session, refs, heldBy);
    const group = {
      id: GROUP.id,
      name: GROUP.name,
      colorDark: GROUP.colorDark,
      colorLight: GROUP.colorLight,
    };
    expect(chips).toEqual([
      { category: { id: WARD.id, name: WARD.name }, group },
      { category: { id: CHARM.id, name: CHARM.name }, group, forms: ['Dried Testleaf', 'Testoil'] },
    ]);
  });
});
