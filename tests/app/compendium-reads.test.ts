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
vi.mock('@/modules/ingredients', () => ({
  getIngredient,
  readCompendiumEntry,
  listCompendiumHeldIn,
  countCompendiumHeldIn,
  compendiumFacetsHeldIn,
  variantsOf,
}));
vi.mock('@/modules/vocabulary', () => ({
  formChoicesOf: async () => [],
  formGroupsOf: async () => [],
}));

const { readCompendiumDetails, readCompendiumHeldIn, readFacetsHeldIn } =
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

describe('readCompendiumHeldIn and readFacetsHeldIn (M12.55)', () => {
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
