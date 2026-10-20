import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Forbidden, NotFound } from '@/lib/errors';
import { entryDetail } from '../support/entry-detail';

// The details a Quick Look opens over the public cards (M12.5): an entry by id, read with no
// session, through the cached public entry read. The services are mocked: that a coven's own
// id answers `NotFound` with no session is getIngredient's test
// (tests/modules/ingredients/services/compendium.test.ts); here, that the read asks it with
// none, and turns its refusal into nothing for the page to open.

const getIngredient = vi.fn();
const readCompendiumEntry = vi.fn();
vi.mock('@/modules/ingredients', () => ({ getIngredient, readCompendiumEntry }));

const { readCompendiumDetails } = await import('@/app/compendium-reads');

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
