import { beforeEach, describe, expect, it, vi } from 'vitest';

// The covens the compendium cards' three dots offer: what each role permits, read as the
// entry page reads it, and which covens hold the entry. The viewer is mocked; the roles go
// through the real `rolePermits`, so a role is refused here exactly as the service refuses it.

const covenRolesIfSignedIn = vi.fn();
vi.mock('@/lib/viewer', () => ({ covenRolesIfSignedIn }));
vi.mock('@/modules/ingredients', () => ({
  MAKE_IT_OURS_PERMISSION: { ingredient: ['create', 'delete'], inventory: ['update'] },
}));
vi.mock('@/modules/coven', async () => ({
  rolePermits: (await vi.importActual<typeof import('@/modules/coven')>('@/modules/coven'))
    .rolePermits,
}));

const { cardPlacesOf, readCardCovens } = await import('@/app/(public)/compendium/card-places');

const coven = (id: string) => ({ id, slug: id, name: `Coven ${id}` });
const STOCK = { forms: [{ variantId: 'v1', label: 'Leaf' }], jars: [] };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('readCardCovens', () => {
  it('says whether each role may update stock: an owner and a member may, a viewer may not', async () => {
    covenRolesIfSignedIn.mockResolvedValue(
      new Map([
        ['a', 'owner'],
        ['b', 'member'],
        ['c', 'viewer'],
      ]),
    );

    const covens = await readCardCovens([coven('a'), coven('b'), coven('c')]);

    expect(covens.map(({ workspaceId, canStock }) => [workspaceId, canStock])).toEqual([
      ['a', true],
      ['b', true],
      ['c', false],
    ]);
  });
});

describe('cardPlacesOf', () => {
  const covens = [
    {
      workspaceId: 'a',
      covenSlug: 'a',
      name: 'Coven a',
      canAnnotate: true,
      canMakeOurs: true,
      canRemove: true,
      canStock: true,
    },
    {
      workspaceId: 'b',
      covenSlug: 'b',
      name: 'Coven b',
      canAnnotate: false,
      canMakeOurs: false,
      canRemove: false,
      canStock: false,
    },
  ];

  it('hands a holding coven that may update stock its stock', () => {
    const places = cardPlacesOf(
      covens,
      () => true,
      '/compendium/ingredients/testwort',
      () => STOCK,
    );

    expect(places.map(({ workspaceId }) => workspaceId)).toEqual(['a']);
    expect(places[0].stock).toBe(STOCK);
  });

  it('hands no stock to a coven that does not hold the entry, whatever its role may do', () => {
    // Why it could have had some: the stock is read for the coven and its role may update it.
    const places = cardPlacesOf(
      covens,
      (id) => id !== 'a',
      '/compendium/ingredients/testwort',
      () => STOCK,
    );

    expect(places).toEqual([]);
  });

  it('hands no stock where none was read, and a role that may only stock still has a place', () => {
    const only = [{ ...covens[0], canAnnotate: false, canMakeOurs: false, canRemove: false }];

    expect(
      cardPlacesOf(
        only,
        () => true,
        '/x',
        () => STOCK,
      ),
    ).toHaveLength(1);
    expect(
      cardPlacesOf(
        only,
        () => true,
        '/x',
        () => undefined,
      ),
    ).toEqual([]);
    expect(cardPlacesOf(only, () => true, '/x')).toEqual([]);
  });
});
