import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Forbidden } from '@/lib/errors';

// What the public compendium page tells each card about the viewer's covens: whether every coven they may write in holds the entry, and which ones do.
// The cards, cached reads and viewer are mocked; a visitor and a viewer are asked nothing. The held read is per viewer and sits beside the cached ones (CLAUDE.md rule 6).

vi.mock('next/navigation', () => ({ redirect: vi.fn() }));

const viewerIfSignedIn = vi.fn();
// The viewer's role in each coven, which decides what the three dots hold.
const covenRolesIfSignedIn = vi.fn();
vi.mock('@/lib/viewer', () => ({ viewerIfSignedIn, covenRolesIfSignedIn }));
const getSession = vi.fn();
vi.mock('@/lib/request-session', () => ({ getSession }));

// What Edit Stock opens with is `entry-stock.ts`'s, tests/app/entry-stock.test.ts; here only which
// (coven, entry) pairs it is asked for, and that its answer reaches the place.
const readEntryStock = vi.fn();
vi.mock('@/app/entry-stock', () => ({
  readEntryStock,
  stockKey: (workspaceId: string, ingredientId: string) => `${workspaceId}:${ingredientId}`,
}));

const heldCompendiumEntryIdsIn = vi.fn();
vi.mock('@/modules/ingredients', () => ({
  heldCompendiumEntryIdsIn,
  MAKE_IT_OURS_PERMISSION: {
    ingredient: ['create', 'delete'],
    inventory: ['update'],
  },
}));

vi.mock('@/app/compendium-reads', () => ({
  readCompendium: async () => ({
    edges: ENTRIES.map((node) => ({ node, cursor: node.id })),
    pageInfo: { hasNextPage: false, hasPreviousPage: false },
    position: { page: 1, pages: 1 },
    totalCount: ENTRIES.length,
    variants: ENTRIES.map(() => []),
    forms: ENTRIES.map(() => []),
  }),
  readFacets: async () => ({
    forms: [],
    deities: [],
    categories: [],
    zodiacSigns: [],
    celestialBodies: [],
    elements: [],
    toxic: [],
    withoutReferences: 0,
  }),
  readFormIcons: async () => new Map(),
  readDeities: async () => [],
  readCategories: async () => [],
  readCardCategories: async (ids: readonly string[]) => ids.map(() => []),
}));

const cards = vi.fn((_props: Record<string, unknown>) => null);
vi.mock('@/components/CompendiumCards', () => ({ default: cards }));

const { default: Page } = await import('@/app/(public)/compendium/page');

const entry = (id: string, name: string) => ({
  id,
  name,
  slug: name.toLowerCase(),
  canonicalName: null,
  nomenclature: 'none',
  toxic: false,
  safetyNotes: null,
  createdAt: new Date('2020-01-01'),
  updatedAt: new Date('2020-01-01'),
});
const ENTRIES = [entry('id-held', 'Heldwort'), entry('id-free', 'Free Wort & Co')];

const coven = (id: string, slug: string, canWrite: boolean) => ({
  id,
  slug,
  name: slug,
  canReadMembers: true,
  canWrite,
});
const shell = (...workspaces: ReturnType<typeof coven>[]) => ({
  viewer: { name: 'Fixture Member', canCurate: false },
  workspaces,
});

/** The entries as the cards were handed them. */
async function entriesGiven(): Promise<Record<string, unknown>[]> {
  cards.mockClear();
  await Page({ searchParams: Promise.resolve({}) }).then((tree) => {
    // The page returns a tree whose cards element holds the props: read them off it.
    const found: Record<string, unknown>[] = [];
    const walk = (node: unknown): void => {
      if (!node || typeof node !== 'object') return;
      const element = node as { type?: unknown; props?: Record<string, unknown> };
      if (element.type === cards && element.props) found.push(element.props);
      for (const child of [element.props?.children].flat()) walk(child);
    };
    walk(tree);
    cards.mock.calls.length = 0;
    cards.mock.calls.push(...found.map((props) => [props] as [Record<string, unknown>]));
  });
  return (cards.mock.calls[0]![0].entries as Record<string, unknown>[]) ?? [];
}

const propsGiven = () => cards.mock.calls[0]![0];

beforeEach(() => {
  viewerIfSignedIn.mockReset();
  covenRolesIfSignedIn.mockReset();
  covenRolesIfSignedIn.mockResolvedValue(
    new Map([
      ['w-view', 'viewer'],
      ['w-1', 'owner'],
      ['w-2', 'member'],
    ]),
  );
  getSession.mockReset();
  heldCompendiumEntryIdsIn.mockReset();
  readEntryStock.mockReset();
  readEntryStock.mockResolvedValue(new Map());
  getSession.mockResolvedValue({ userId: 'user-b', role: 'user' });
  heldCompendiumEntryIdsIn.mockResolvedValue(new Map([['w-1', new Set(['id-held'])]]));
});

describe('the public compendium page, for the cards’ held state', () => {
  it('marks the entry the first writable coven holds, and names it in heldIn', async () => {
    viewerIfSignedIn.mockResolvedValue(
      shell(coven('w-view', 'aaa', false), coven('w-1', 'bbb', true)),
    );

    const [held, free] = await entriesGiven();

    // Every coven of the viewer's is asked, the one they only view too, for the holding count
    // ; held and heldIn still count only the writable ones.
    expect(heldCompendiumEntryIdsIn).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-b' }),
      ['w-view', 'w-1'],
      ['id-held', 'id-free'],
    );
    expect(propsGiven()).toMatchObject({
      action: 'add',
      workspaceId: 'w-1',
      covens: [{ id: 'w-1', name: 'bbb' }],
    });
    expect(held).toMatchObject({ id: 'id-held', held: true, heldIn: ['w-1'] });
    expect(free).toMatchObject({ id: 'id-free', held: false, heldIn: [] });
    // The check is a mark, not a link: no address for it.
    for (const each of [held, free]) expect(each).not.toHaveProperty('heldHref');
  });

  it.each([
    ['a visitor with no account', null],
    ['someone who only views', shell(coven('w-view', 'aaa', false))],
    ['someone in no coven', shell()],
  ] as const)(
    'reads nothing per viewer, and marks nothing and names no place, for %s',
    async (_who, viewer) => {
      viewerIfSignedIn.mockResolvedValue(viewer);

      const entries = await entriesGiven();

      expect(heldCompendiumEntryIdsIn).not.toHaveBeenCalled();
      expect(getSession).not.toHaveBeenCalled();
      expect(propsGiven().workspaceId).toBeUndefined();
      for (const each of entries) {
        expect(each.held).toBeUndefined();
        expect(each.places).toEqual([]);
      }
    },
  );

  describe('for someone who may write in two covens', () => {
    const both = () =>
      shell(coven('w-view', 'aaa', false), coven('w-1', 'bbb', true), coven('w-2', 'ccc', true));
    const holding = (first: string[], second: string[]) =>
      heldCompendiumEntryIdsIn.mockResolvedValue(
        new Map([
          ['w-1', new Set(first)],
          ['w-2', new Set(second)],
        ]),
      );

    it('asks about every coven in one read, and hands the cards both writable ones, the first the default', async () => {
      viewerIfSignedIn.mockResolvedValue(both());
      holding([], []);

      await entriesGiven();

      expect(heldCompendiumEntryIdsIn).toHaveBeenCalledOnce();
      expect(heldCompendiumEntryIdsIn.mock.calls[0]![1]).toEqual(['w-view', 'w-1', 'w-2']);
      expect(propsGiven()).toMatchObject({
        workspaceId: 'w-1',
        covens: [
          { id: 'w-1', name: 'bbb' },
          { id: 'w-2', name: 'ccc' },
        ],
      });
    });

    it('calls an entry held only when every writable coven holds it, and names who does', async () => {
      viewerIfSignedIn.mockResolvedValue(both());
      holding(['id-held'], ['id-held', 'id-free']);

      const [held, free] = await entriesGiven();

      expect(held).toMatchObject({ held: true, heldIn: ['w-1', 'w-2'] });
      expect(free).toMatchObject({ held: false, heldIn: ['w-2'] });
    });
  });

  // The three dots: the covens that hold the entry, where the
  // viewer's role lets them annotate, make it theirs or remove it.
  describe('the places the three dots act in', () => {
    const placesOf = (each: Record<string, unknown>) =>
      each.places as { workspaceId: string; canAnnotate: boolean; canRemove: boolean }[];

    it('names the writable coven that holds the entry, with what the role permits, and none for one that does not', async () => {
      viewerIfSignedIn.mockResolvedValue(
        shell(coven('w-view', 'aaa', false), coven('w-1', 'bbb', true)),
      );

      const [held, free] = await entriesGiven();

      expect(placesOf(held)).toEqual([
        expect.objectContaining({
          workspaceId: 'w-1',
          covenSlug: 'bbb',
          canAnnotate: true,
          canMakeOurs: true,
          canRemove: true,
          annotateHref: '/compendium/ingredients/heldwort?annotate=bbb',
        }),
      ]);
      expect(placesOf(free)).toEqual([]);
    });

    it('names both covens where both hold the entry', async () => {
      viewerIfSignedIn.mockResolvedValue(
        shell(coven('w-1', 'bbb', true), coven('w-2', 'ccc', true)),
      );
      heldCompendiumEntryIdsIn.mockResolvedValue(
        new Map([
          ['w-1', new Set(['id-held'])],
          ['w-2', new Set(['id-held'])],
        ]),
      );

      const [held] = await entriesGiven();

      expect(placesOf(held).map(({ workspaceId }) => workspaceId)).toEqual(['w-1', 'w-2']);
    });

    it('reads the stock of the held entries in covens whose role may update it, in one call, and hands it on', async () => {
      const STOCK = { forms: [{ variantId: 'v1', label: 'Leaf' }], jars: [] };
      // w-view only views; w-1 and w-2 may update stock. Why it could have been read for w-view:
      // it holds the entry too.
      viewerIfSignedIn.mockResolvedValue(
        shell(coven('w-view', 'aaa', true), coven('w-1', 'bbb', true)),
      );
      heldCompendiumEntryIdsIn.mockResolvedValue(
        new Map([
          ['w-view', new Set(['id-held'])],
          ['w-1', new Set(['id-held'])],
        ]),
      );
      readEntryStock.mockResolvedValue(new Map([['w-1:id-held', STOCK]]));

      const [held, free] = await entriesGiven();

      expect(readEntryStock).toHaveBeenCalledExactlyOnceWith([
        { ingredientId: 'id-held', workspaceId: 'w-1' },
      ]);
      expect(
        (held.places as { workspaceId: string; stock?: unknown }[]).map(
          ({ workspaceId, stock }) => [workspaceId, stock],
        ),
      ).toEqual([['w-1', STOCK]]);
      expect(placesOf(free)).toEqual([]);
    });
  });

  it('shows the plus rather than a wrong check when the coven refuses the read', async () => {
    viewerIfSignedIn.mockResolvedValue(shell(coven('w-1', 'bbb', true)));
    heldCompendiumEntryIdsIn.mockRejectedValue(new Forbidden('Forbidden'));

    const entries = await entriesGiven();

    expect(entries.map((each) => each.held)).toEqual([false, false]);
    expect(entries.map((each) => each.heldIn)).toEqual([[], []]);
  });
});

// How many of the viewer's covens hold each entry, any role, for the count on its plus or
// check; and every coven of theirs for the filter's In My Covens, the ones they only view too.
describe('the public compendium page, for the holding count and In My Covens', () => {
  it('names every coven holding each entry, one the viewer only views included', async () => {
    viewerIfSignedIn.mockResolvedValue(
      shell(coven('w-view', 'aaa', false), coven('w-1', 'bbb', true)),
    );
    heldCompendiumEntryIdsIn.mockResolvedValue(
      new Map([
        ['w-view', new Set(['id-held', 'id-free'])],
        ['w-1', new Set(['id-held'])],
      ]),
    );

    const [held, free] = await entriesGiven();

    expect(held).toMatchObject({ held: true, heldIn: ['w-1'], holding: ['aaa', 'bbb'] });
    // Why the viewer’s coven could have been taken for a writable one: it holds the entry.
    expect(free).toMatchObject({ held: false, heldIn: [], holding: ['aaa'] });
  });

  it('hands the filter every coven of the viewer’s, and none to a visitor or someone in no coven', async () => {
    viewerIfSignedIn.mockResolvedValue(
      shell(coven('w-view', 'aaa', false), coven('w-1', 'bbb', true)),
    );
    await entriesGiven();
    expect(propsGiven().myCovens).toEqual([
      { id: 'w-view', name: 'aaa' },
      { id: 'w-1', name: 'bbb' },
    ]);

    // A viewer alone has no plus to count on, but the filter is theirs too.
    viewerIfSignedIn.mockResolvedValue(shell(coven('w-view', 'aaa', false)));
    await entriesGiven();
    expect(propsGiven().myCovens).toEqual([{ id: 'w-view', name: 'aaa' }]);

    for (const viewer of [null, shell()]) {
      viewerIfSignedIn.mockResolvedValue(viewer);
      await entriesGiven();
      expect(propsGiven().myCovens).toEqual([]);
    }
  });
});
