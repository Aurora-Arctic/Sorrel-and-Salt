import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Forbidden } from '@/lib/errors';

// What the public compendium page tells each card about the viewer's coven (M9.12): whether the
// coven holds the entry, and where its list shows it. The cards, the cached reads and the viewer
// are mocked; here: which coven is asked, for which entries, and that a visitor and a viewer are
// asked nothing. The held read is per viewer and sits beside the cached ones (CLAUDE.md rule 6).

vi.mock('next/navigation', () => ({ redirect: vi.fn() }));

const viewerIfSignedIn = vi.fn();
vi.mock('@/lib/viewer', () => ({ viewerIfSignedIn }));
const getSession = vi.fn();
vi.mock('@/lib/request-session', () => ({ getSession }));

const heldCompendiumEntryIds = vi.fn();
vi.mock('@/modules/ingredients', () => ({ heldCompendiumEntryIds }));

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
  heldCompendiumEntryIds.mockReset();
  getSession.mockResolvedValue({ userId: 'user-b', role: 'user' });
  heldCompendiumEntryIds.mockResolvedValue(new Set(['id-held']));
});

describe('the public compendium page, for the cards’ held state', () => {
  it('marks the entry the first writable coven holds, and links the check to that coven’s list under its name', async () => {
    viewerIfSignedIn.mockResolvedValue(
      shell(coven('w-view', 'aaa', false), coven('w-1', 'bbb', true)),
    );

    const [held, free] = await entriesGiven();

    expect(heldCompendiumEntryIds).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-b' }),
      'w-1',
      ['id-held', 'id-free'],
    );
    expect(propsGiven()).toMatchObject({ action: 'add', workspaceId: 'w-1' });
    expect(held).toMatchObject({ id: 'id-held', held: true });
    expect(free).toMatchObject({ id: 'id-free', held: false });
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

    expect(heldCompendiumEntryIds).not.toHaveBeenCalled();
    expect(getSession).not.toHaveBeenCalled();
    expect(propsGiven().workspaceId).toBeUndefined();
    for (const each of entries) {
      expect(each.held).toBeUndefined();
      expect(each.heldHref).toBeUndefined();
    }
  });

  it('shows the plus rather than a wrong check when the coven refuses the read', async () => {
    viewerIfSignedIn.mockResolvedValue(shell(coven('w-1', 'bbb', true)));
    heldCompendiumEntryIds.mockRejectedValue(new Forbidden('Forbidden'));

    const entries = await entriesGiven();

    expect(entries.map((each) => each.held)).toEqual([false, false]);
  });
});
