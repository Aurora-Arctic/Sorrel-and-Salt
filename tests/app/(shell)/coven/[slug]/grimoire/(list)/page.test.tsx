import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFound } from '@/lib/errors';
import { makeQueryClient } from '@/lib/graphql-client';
import { CARD_PAGE_SIZE } from '@/lib/pagination';

// The Grimoire's two tabs (M10.11): Spells and Drafts. The guard and the services are mocked,
// since what they decide is their own tests' (which spells a reader may list is
// tests/db/repository/readable-spell-page.test.ts's and
// tests/modules/grimoire/services/spell-reads.test.ts's); the tabs' own read runs for real over
// them. Here: the guard on the slug from the address, one page of 24 of the tab's status, the
// address becoming the query, each card's assigned categories, and the pager's addresses; and
// the spell builder's dialog over the tab (M10.12), `?new=spell-<slug>` and `?edit=<id>`, beside the
// shell's Add Ingredient, `?new=ingredient-coven-<slug>`.

const COVEN = {
  id: '5b8f4a10-2d6e-4c19-8a37-0e9d1c2b3a44',
  slug: 'fixture-coven',
  name: 'Fixture Coven',
};
const session = { user: { id: 'fixture-user' } };

const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
// The address the layout's New Spell reads, as the browser has it.
const address = vi.hoisted(() => ({ path: '/coven/fixture-coven/grimoire', search: '' }));
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => address.path,
  useSearchParams: () => new URLSearchParams(address.search),
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
const readSpell = vi.fn();
vi.mock('@/modules/grimoire', () => ({
  listGrimoire,
  countGrimoire,
  countGrimoireCategories,
  assignedCategoriesOf,
  readSpell,
}));

const displayNamesOf = vi.fn();
// Partial: the layout reads `rolePermits` from @/modules/coven, whose GraphQL
// types extend identity's `UserRef`.
vi.mock('@/modules/identity', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/modules/identity')>()),
  displayNamesOf,
}));

const EDITED_AT = new Date('2026-09-01T12:00:00.000Z');

const { default: SpellsPage } = await import('@/app/(shell)/coven/[slug]/grimoire/(list)/page');
const { default: DraftsPage } =
  await import('@/app/(shell)/coven/[slug]/grimoire/(list)/drafts/page');
const { default: Layout } = await import('@/app/(shell)/coven/[slug]/grimoire/(list)/layout');

const spell = (
  id: string,
  title: string | null,
  status = 'complete',
  visibility = 'workspace',
) => ({
  node: {
    id,
    workspaceId: COVEN.id,
    title,
    intent: null,
    status,
    visibility,
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
  address.path = '/coven/fixture-coven/grimoire';
  address.search = '';
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

  // The service lists a private spell to its author alone (M10.6), so the card
  // badges what it is handed (M10.13).
  it('badges a private spell Private, and a spell shared with the coven with nothing', async () => {
    listGrimoire.mockResolvedValue([
      spell('s1', 'Fixture Working', 'complete', 'private'),
      spell('s2', 'Testwort Charm'),
    ]);
    await renderTab(SpellsPage);
    const list = screen.getByRole('list', { name: 'Grimoire' });
    const card = (name: string) => within(within(list).getByRole('listitem', { name }));
    expect(card('Fixture Working').getByText('Private')).toBeInTheDocument();
    expect(card('Testwort Charm').queryByText('Private')).not.toBeInTheDocument();
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

describe('the spell builder over a Grimoire tab', () => {
  const SPELL_ID = '0f6d2c8e-3b1a-4e5f-9a7c-2d4b6e8f1a3c';
  const SPELL = {
    id: SPELL_ID,
    revision: 4,
    workspaceId: COVEN.id,
    title: 'Fixture Working',
    intent: 'Calm',
    jarDescription: '4 oz',
    sealWaxColor: null,
    moonPhase: 'Full Moon',
    dayOfWeek: null,
    note: null,
  };

  function as(role: 'owner' | 'member' | 'viewer') {
    requireCovenMembership.mockResolvedValue({
      workspace: COVEN,
      membership: { workspaceId: COVEN.id, userId: 'fixture-user', role },
    });
  }

  it.each([
    ['owner', 'spell-fixture-coven'],
    ['member', 'spell-fixture-coven'],
    // `?new=spell` is the current grimoire's, an alias.
    ['member', 'spell'],
  ] as const)(
    'opens New Spell over the tab for a coven %s under ?new=%s, the list still beneath it',
    async (role, value) => {
      as(role);
      await renderTab(SpellsPage, { new: value });

      const dialog = screen.getByRole('dialog', { name: 'New Spell to Fixture Coven' });
      expect(within(dialog).getByRole('textbox', { name: 'Title' })).toHaveValue('');
      expect(screen.getAllByRole('heading', { name: 'Fixture Working' }).length).toBeGreaterThan(0);
    },
  );

  it('opens nothing under ?new=spell-<slug> for a viewer, who may not create a spell', async () => {
    as('viewer');
    await renderTab(SpellsPage, { new: 'spell-fixture-coven' });

    // The tab drew for this viewer: the missing dialog is the role's, not a refusal.
    expect(screen.getAllByRole('heading', { name: 'Fixture Working' }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens a saved draft under ?edit=<id> with its values, read for the signed-in member', async () => {
    as('member');
    readSpell.mockResolvedValue(SPELL);
    await renderTab(DraftsPage, { edit: SPELL_ID });

    expect(readSpell).toHaveBeenCalledWith(session, COVEN.id, SPELL_ID);
    const dialog = screen.getByRole('dialog', { name: 'Edit Spell, Fixture Working' });
    // A saved spell opens its sections shut.
    fireEvent.click(within(dialog).getByRole('button', { name: 'Open All' }));
    expect(within(dialog).getByRole('textbox', { name: 'Intent' })).toHaveValue('Calm');
    expect(within(dialog).getByRole('textbox', { name: 'Jar Description' })).toHaveValue('4 oz');
  });

  it('reads nothing and opens nothing under ?edit=<id> for a viewer', async () => {
    as('viewer');
    readSpell.mockResolvedValue(SPELL);
    await renderTab(DraftsPage, { edit: SPELL_ID });

    expect(readSpell).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens nothing for a spell the service will not give this member', async () => {
    as('member');
    readSpell.mockRejectedValue(new NotFound('No such spell in this coven'));
    await renderTab(DraftsPage, { edit: SPELL_ID });

    expect(readSpell).toHaveBeenCalledWith(session, COVEN.id, SPELL_ID);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('reads nothing for an ?edit that is not an id', async () => {
    as('member');
    await renderTab(DraftsPage, { edit: 'not-an-id' });

    expect(readSpell).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it.each(['', 'ingredient', 'ingredient-coven-fixture-coven', 'spell-other-coven'])(
    "opens no saved spell and no New Spell while ?new=%s is another dialog's, so one dialog shows",
    async (value) => {
      as('member');
      readSpell.mockResolvedValue(SPELL);
      await renderTab(SpellsPage, { new: value, edit: SPELL_ID });

      // The tab drew for a member who may edit a spell: the builder waits for ?new to go.
      expect(screen.getAllByRole('heading', { name: 'Fixture Working' }).length).toBeGreaterThan(0);
      expect(readSpell).not.toHaveBeenCalled();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    },
  );

  it('opens New Spell, not the saved spell, when the address holds both ?new=spell-<slug> and ?edit', async () => {
    as('member');
    readSpell.mockResolvedValue(SPELL);
    await renderTab(SpellsPage, { new: 'spell-fixture-coven', edit: SPELL_ID });

    expect(screen.getByRole('dialog', { name: 'New Spell to Fixture Coven' })).toBeInTheDocument();
    expect(readSpell).not.toHaveBeenCalled();
  });

  it('closes back to the tab as it was, its filter kept and the dialog dropped', async () => {
    as('member');
    await renderTab(DraftsPage, { query: 'fixture', new: 'spell-fixture-coven' });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    });

    // The modal fades out first: this test's media query leaves motion on.
    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith(
        '/coven/fixture-coven/grimoire/drafts?query=fixture',
      ),
    );
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

  async function renderLayoutAs(role: 'owner' | 'member' | 'viewer') {
    requireCovenMembership.mockResolvedValue({
      workspace: COVEN,
      membership: { workspaceId: COVEN.id, userId: 'fixture-user', role },
    });
    render(
      (await Layout({
        params: Promise.resolve({ slug: COVEN.slug }),
        children: <p>Fixture Tab</p>,
      })) as ReactElement,
    );
    // The heading drew for this member, so a missing action is the role's, not a refusal.
    expect(requireCovenMembership).toHaveBeenCalledWith('fixture-coven');
    expect(screen.getByRole('heading', { level: 1, name: 'Grimoire' })).toBeInTheDocument();
  }

  it.each(['owner', 'member'] as const)(
    'links New Spell to the open tab under ?new=spell-<slug> at the heading for a coven %s, who may create a spell',
    async (role) => {
      await renderLayoutAs(role);
      expect(screen.getByRole('link', { name: 'New Spell' })).toHaveAttribute(
        'href',
        '/coven/fixture-coven/grimoire?new=spell-fixture-coven',
      );
    },
  );

  it('keeps the open tab’s filter and page in New Spell’s address, and no other dialog', async () => {
    address.path = '/coven/fixture-coven/grimoire/drafts';
    address.search =
      'query=fixture&after=c1&new=ingredient-coven-fixture-coven&edit=0f6d2c8e-3b1a-4e5f-9a7c-2d4b6e8f1a3c';
    await renderLayoutAs('member');

    expect(screen.getByRole('link', { name: 'New Spell' })).toHaveAttribute(
      'href',
      '/coven/fixture-coven/grimoire/drafts?query=fixture&after=c1&new=spell-fixture-coven',
    );
  });

  it('draws no New Spell for a viewer, who reads the grimoire but may not create a spell', async () => {
    await renderLayoutAs('viewer');
    expect(screen.getByRole('link', { name: 'Spells' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'New Spell' })).not.toBeInTheDocument();
  });

  it('draws nothing for a non-member, whom the guard refuses', async () => {
    requireCovenMembership.mockRejectedValue(new Error('NEXT_NOT_FOUND'));
    await expect(
      Layout({ params: Promise.resolve({ slug: COVEN.slug }), children: null }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });
});
