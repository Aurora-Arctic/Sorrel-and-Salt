import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Forbidden } from '@/lib/errors';

// What the public compendium page tells each card about the viewer's covens (M9.12): whether
// every coven they may write in holds the entry, which ones do, and where a list shows it. The cards, the cached reads and the viewer
// are mocked; here: which coven is asked, for which entries, and that a visitor and a viewer are
// asked nothing. The held read is per viewer and sits beside the cached ones (CLAUDE.md rule 6).

vi.mock('next/navigation', () => ({ redirect: vi.fn() }));

const viewerIfSignedIn = vi.fn();
vi.mock('@/lib/viewer', () => ({ viewerIfSignedIn }));
const getSession = vi.fn();
vi.mock('@/lib/request-session', () => ({ getSession }));

const heldCompendiumEntryIdsIn = vi.fn();
vi.mock('@/modules/ingredients', () => ({ heldCompendiumEntryIdsIn }));

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
  getSession.mockReset();
  heldCompendiumEntryIdsIn.mockReset();
  getSession.mockResolvedValue({ userId: 'user-b', role: 'user' });
  heldCompendiumEntryIdsIn.mockResolvedValue(new Map([['w-1', new Set(['id-held'])]]));
});

describe('the public compendium page, for the cards’ held state', () => {
  it('marks the entry the first writable coven holds, and links the check to that coven’s list under its name', async () => {
    viewerIfSignedIn.mockResolvedValue(
      shell(coven('w-view', 'aaa', false), coven('w-1', 'bbb', true)),
    );

    const [held, free] = await entriesGiven();

    expect(heldCompendiumEntryIdsIn).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-b' }),
      ['w-1'],
      ['id-held', 'id-free'],
    );
    expect(propsGiven()).toMatchObject({
      action: 'add',
      workspaceId: 'w-1',
      covens: [{ id: 'w-1', name: 'bbb' }],
    });
    expect(held).toMatchObject({ id: 'id-held', held: true, heldIn: ['w-1'] });
    expect(free).toMatchObject({ id: 'id-free', held: false, heldIn: [] });
    for (const each of [held, free]) {
      const href = new URL(each.heldHref as string, 'https://fixture.test');
      expect(href.pathname).toBe('/coven/bbb/ingredients');
      expect(href.searchParams.get('query')).toBe(each.name);
    }
  });

  it.each([
    ['a visitor with no account', null],
    ['someone who only views', shell(coven('w-view', 'aaa', false))],
    ['someone in no coven', shell()],
  ] as const)('reads nothing per viewer, and marks nothing, for %s', async (_who, viewer) => {
    viewerIfSignedIn.mockResolvedValue(viewer);

    const entries = await entriesGiven();

    expect(heldCompendiumEntryIdsIn).not.toHaveBeenCalled();
    expect(getSession).not.toHaveBeenCalled();
    expect(propsGiven().workspaceId).toBeUndefined();
    for (const each of entries) {
      expect(each.held).toBeUndefined();
      expect(each.heldHref).toBeUndefined();
    }
  });

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

    it('asks about both writable covens in one read, and hands the cards both, the first the default', async () => {
      viewerIfSignedIn.mockResolvedValue(both());
      holding([], []);

      await entriesGiven();

      expect(heldCompendiumEntryIdsIn).toHaveBeenCalledOnce();
      expect(heldCompendiumEntryIdsIn.mock.calls[0]![1]).toEqual(['w-1', 'w-2']);
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

    it("leads the check to the default coven's list if it holds the entry, else the first that does", async () => {
      viewerIfSignedIn.mockResolvedValue(both());
      holding(['id-held'], ['id-held', 'id-free']);
      const [heldInBoth, onlyInSecond] = await entriesGiven();
      expect(new URL(heldInBoth.heldHref as string, 'https://fixture.test').pathname).toBe(
        '/coven/bbb/ingredients',
      );
      // Not held by every coven, so no check shows; the address is still the one that holds it.
      expect(new URL(onlyInSecond.heldHref as string, 'https://fixture.test').pathname).toBe(
        '/coven/ccc/ingredients',
      );
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
