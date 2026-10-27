import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeQueryClient } from '@/lib/graphql-client';
import { CARD_PAGE_SIZE } from '@/lib/pagination';

// The Grimoire's two tabs (M10.11): Spells and Drafts. The guard and the services are mocked,
// since what they decide is their own tests' (which spells a reader may list is
// tests/db/repository/readable-spell-page.test.ts's and
// tests/modules/grimoire/services/spell-reads.test.ts's); the tabs' own read runs for real over
// them. Here: the guard on the slug from the address, one page of 24 of the tab's status, the
// address becoming the query, each card's assigned categories, and the pager's addresses.

const COVEN = { id: '5b8f4a10-2d6e-4c19-8a37-0e9d1c2b3a44', slug: 'fixture-coven' };
const session = { user: { id: 'fixture-user' } };

const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/coven/fixture-coven/grimoire',
}));

const requireCovenMembership = vi.fn();
vi.mock('@/lib/request-session', () => ({
  requireCovenMembership,
  requireSession: async () => session,
}));

const GROUP = { id: 'g1', name: 'Fixture Group', colorDark: '#a0c4ff', colorLight: '#1d3557' };
const CATEGORY = {
  id: 'c1',
  slug: 'testwarding',
  name: 'Testwarding',
  description: null,
  group: GROUP,
};
vi.mock('@/app/compendium-reads', () => ({ readCategories: async () => [CATEGORY] }));

const listGrimoire = vi.fn();
const countGrimoire = vi.fn();
const countGrimoireCategories = vi.fn();
const assignedCategoriesOf = vi.fn();
vi.mock('@/modules/grimoire', () => ({
  listGrimoire,
  countGrimoire,
  countGrimoireCategories,
  assignedCategoriesOf,
}));

const displayNamesOf = vi.fn();
vi.mock('@/modules/identity', () => ({ displayNamesOf }));

const EDITED_AT = new Date('2026-09-01T12:00:00.000Z');

const { default: SpellsPage } = await import('@/app/(shell)/coven/[slug]/grimoire/(list)/page');
const { default: DraftsPage } =
  await import('@/app/(shell)/coven/[slug]/grimoire/(list)/drafts/page');
const { default: Layout } = await import('@/app/(shell)/coven/[slug]/grimoire/(list)/layout');

const spell = (id: string, title: string | null, status = 'complete') => ({
  node: {
    id,
    workspaceId: COVEN.id,
    title,
    intent: null,
    status,
    updatedAt: EDITED_AT,
    updatedBy: `editor-${id}`,
  },
  cursor: { key: ['2026-01-01T00:00:00.000Z'], id },
});

type PageFn = typeof SpellsPage;
async function renderTab(Page: PageFn, search: Record<string, string | string[]> = {}) {
  const page = await Page({
    params: Promise.resolve({ slug: COVEN.slug }),
    searchParams: Promise.resolve(search),
  });
  render(<QueryClientProvider client={makeQueryClient()}>{page}</QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('min-width'),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
  requireCovenMembership.mockResolvedValue({
    workspace: COVEN,
    membership: { workspaceId: COVEN.id, userId: 'fixture-user', role: 'viewer' },
  });
  listGrimoire.mockResolvedValue([spell('s1', 'Fixture Working'), spell('s2', 'Testwort Charm')]);
  countGrimoire.mockResolvedValue({ totalCount: 2, countBefore: null });
  countGrimoireCategories.mockResolvedValue([{ value: 'c1', count: 4 }]);
  assignedCategoriesOf.mockResolvedValue([[{ id: 'c1', name: 'Testwarding' }], []]);
  displayNamesOf.mockImplementation(async (_s: unknown, ids: string[]) =>
    ids.map((id) => (id === 'editor-s1' ? 'Fixture A' : null)),
  );
});

describe('the Grimoire tabs', () => {
  it('runs the coven guard on the slug from its own address', async () => {
    await renderTab(SpellsPage);
    expect(requireCovenMembership).toHaveBeenCalledWith('fixture-coven');
  });

  it('reads nothing for a non-member, whom the guard refuses', async () => {
    requireCovenMembership.mockRejectedValue(new Error('NEXT_NOT_FOUND'));
    await expect(renderTab(SpellsPage)).rejects.toThrow('NEXT_NOT_FOUND');
    await expect(renderTab(DraftsPage)).rejects.toThrow('NEXT_NOT_FOUND');
    expect(listGrimoire).not.toHaveBeenCalled();
    expect(countGrimoire).not.toHaveBeenCalled();
  });

  it('lists the complete spells on Spells and the drafts on Drafts, a page of 24 newest edit first', async () => {
    await renderTab(SpellsPage);
    expect(listGrimoire).toHaveBeenCalledWith(
      session,
      COVEN.id,
      expect.objectContaining({ limit: CARD_PAGE_SIZE + 1 }),
      { order: 'UPDATED_DESC', status: 'complete' },
    );
    expect(countGrimoire.mock.calls[0]![2]).toEqual({ order: 'UPDATED_DESC', status: 'complete' });

    vi.clearAllMocks();
    await renderTab(DraftsPage);
    expect(listGrimoire.mock.calls[0]![3]).toEqual({ order: 'UPDATED_DESC', status: 'draft' });
    expect(countGrimoire.mock.calls[0]![2]).toEqual({ order: 'UPDATED_DESC', status: 'draft' });
  });

  it('reads the address as the query, a category by its slug as its id, beside the tab’s status', async () => {
    await renderTab(DraftsPage, {
      query: 'hearth',
      categories: 'testwarding',
      categoryMode: 'any',
    });
    expect(listGrimoire.mock.calls[0]![3]).toEqual({
      order: 'UPDATED_DESC',
      status: 'draft',
      query: 'hearth',
      categoryIds: ['c1'],
      categoryMode: 'any',
    });
  });

  /** The Categories filter's suggestions, the panel opened. */
  function openCategories() {
    fireEvent.click(screen.getByRole('button', { name: /^Filters/ }));
    screen.getByRole('combobox', { name: 'Category' }).focus();
    fireEvent.click(screen.getByRole('button', { name: 'Show Category suggestions' }));
  }

  it('counts the categories under the tab’s status and the address’s query, and offers each with its count', async () => {
    await renderTab(DraftsPage, { query: 'hearth' });
    expect(countGrimoireCategories).toHaveBeenCalledWith(session, COVEN.id, {
      order: 'UPDATED_DESC',
      status: 'draft',
      query: 'hearth',
    });

    openCategories();
    expect(screen.getByRole('option', { name: /^Testwarding\D*4/ })).toBeInTheDocument();
  });

  it('offers no category the count leaves out, since no spell here carries it', async () => {
    countGrimoireCategories.mockResolvedValue([]);
    await renderTab(SpellsPage);

    openCategories();
    expect(screen.queryByRole('option', { name: /^Testwarding/ })).not.toBeInTheDocument();
  });

  it('keeps the tab’s status over a status written into the address', async () => {
    await renderTab(SpellsPage, { status: 'draft' });
    expect(listGrimoire.mock.calls[0]![3]).toMatchObject({ status: 'complete' });
  });

  it('draws each spell as a card with the categories its author assigned it, in one batch', async () => {
    await renderTab(SpellsPage);
    expect(assignedCategoriesOf).toHaveBeenCalledTimes(1);
    expect(assignedCategoriesOf).toHaveBeenCalledWith(session, [
      { id: 's1', workspaceId: COVEN.id },
      { id: 's2', workspaceId: COVEN.id },
    ]);
    const list = screen.getByRole('list', { name: 'Grimoire' });
    const first = within(list).getByRole('listitem', { name: 'Fixture Working' });
    expect(within(first).getByText('Testwarding')).toBeInTheDocument();
    expect(within(list).getByRole('listitem', { name: 'Testwort Charm' })).toBeInTheDocument();
  });

  it('says on each card who last edited it and when, the editors named in one batch', async () => {
    await renderTab(SpellsPage);
    expect(displayNamesOf).toHaveBeenCalledTimes(1);
    expect(displayNamesOf).toHaveBeenCalledWith(session, ['editor-s1', 'editor-s2']);
    const list = screen.getByRole('list', { name: 'Grimoire' });
    const edited = (name: string) =>
      within(within(list).getByRole('listitem', { name })).getByRole('button', {
        name: /^Edited/,
      });
    expect(edited('Fixture Working')).toHaveAccessibleDescription(
      'Last edited by Fixture A on 1 September 2026',
    );
    // An editor the viewer cannot name still leaves the edit's time.
    expect(edited('Testwort Charm')).toHaveAccessibleDescription('Last edited on 1 September 2026');
  });

  it('throws a refused category batch rather than drawing a card without its categories', async () => {
    assignedCategoriesOf.mockResolvedValue([new Error('Forbidden'), []]);
    await expect(renderTab(SpellsPage)).rejects.toThrow('Forbidden');
  });

  it('links the next page beneath the tab’s own address, the filter kept', async () => {
    listGrimoire.mockResolvedValue(
      Array.from({ length: CARD_PAGE_SIZE + 1 }, (_, i) => spell(`s${i}`, `Fixture ${i}`, 'draft')),
    );
    assignedCategoriesOf.mockImplementation(async (_s: unknown, refs: unknown[]) =>
      refs.map(() => []),
    );
    countGrimoire.mockResolvedValue({ totalCount: CARD_PAGE_SIZE + 1, countBefore: null });
    await renderTab(DraftsPage, { query: 'fixture' });
    const next = new URL(
      screen.getByRole('link', { name: /next/i }).getAttribute('href')!,
      'http://localhost',
    );
    expect(next.pathname).toBe('/coven/fixture-coven/grimoire/drafts');
    expect(next.searchParams.get('query')).toBe('fixture');
    expect(next.searchParams.get('after')).toBeTruthy();
  });
});

describe('the Grimoire layout', () => {
  it('heads the tabs Grimoire, with Spells and Drafts each at its own address', async () => {
    const page = (await Layout({
      params: Promise.resolve({ slug: COVEN.slug }),
      children: <p>Fixture Tab</p>,
    })) as ReactElement;
    render(page);
    expect(requireCovenMembership).toHaveBeenCalledWith('fixture-coven');
    expect(screen.getByRole('heading', { level: 1, name: 'Grimoire' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Spells' })).toHaveAttribute(
      'href',
      '/coven/fixture-coven/grimoire',
    );
    expect(screen.getByRole('link', { name: 'Drafts' })).toHaveAttribute(
      'href',
      '/coven/fixture-coven/grimoire/drafts',
    );
  });

  it('draws nothing for a non-member, whom the guard refuses', async () => {
    requireCovenMembership.mockRejectedValue(new Error('NEXT_NOT_FOUND'));
    await expect(
      Layout({ params: Promise.resolve({ slug: COVEN.slug }), children: null }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });
});
