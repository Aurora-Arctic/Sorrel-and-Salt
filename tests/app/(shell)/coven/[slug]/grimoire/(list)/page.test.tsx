import { QueryClientProvider } from '@tanstack/react-query';
import { press } from '../../../../../../support/interact';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFound } from '@/lib/errors';
import { makeQueryClient } from '@/lib/graphql-client';
import { CARD_PAGE_SIZE } from '@/lib/pagination';
import { offerCategories } from '../../../../../../support/msw/ingredient-lookups';
import { mockGraphQLQuery } from '../../../../../../support/msw/graphql';

// The Grimoire's two tabs, Spells and Drafts, with the guard and services mocked (which spells a reader may list is tests/db/repository/readable-spell-page.test.ts's and tests/modules/grimoire/services/spell-reads.test.ts's) and the tabs' own read run for real.
// It proves the guard on the slug from the address, one page of 24 of the tab's status, the address becoming the query, each card's assigned categories, and the pager's addresses;
// also the spell builder's dialog over the tab (`?new=spell-<slug>`, `?edit=<id>`) beside the shell's Add Ingredient (`?new=ingredient-coven-<slug>`).

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

const MAKER = '00000000-0000-4000-8000-0000000000aa';
const listGrimoire = vi.fn();
const countGrimoire = vi.fn();
const countGrimoireCategories = vi.fn();
const countGrimoireFacets = vi.fn();
const assignedCategoriesOf = vi.fn();
const readSpell = vi.fn();
// Each spell has no ingredient steps, unless a test says otherwise.
const stepsOfSpells = vi.fn(async (_session: unknown, refs: unknown[]): Promise<unknown[]> =>
  refs.map((): unknown[] => []),
);
// How often each spell was made: none, by default.
const workingCountsOf = vi.fn(async (_session: unknown, refs: unknown[]) => refs.map(() => 0));
vi.mock('@/modules/grimoire', () => ({
  workingCountsOf,
  stepsOfSpells,
  listGrimoire,
  countGrimoire,
  countGrimoireCategories,
  countGrimoireFacets,
  assignedCategoriesOf,
  readSpell,
}));

// The coven roster, which the list leaves to the Record a Working dialog to read.
const memberRoster = vi.fn(async () => []);
vi.mock('@/modules/coven', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/modules/coven')>()),
  memberRoster,
}));

const displayNamesOf = vi.fn();
// Partial: the layout reads `rolePermits` from @/modules/coven, whose GraphQL
// types extend identity's `UserRef`.
vi.mock('@/modules/identity', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/modules/identity')>()),
  displayNamesOf,
}));

// The coven’s jars, which the Quick Look’s stock marks read.
const stockOf = vi.fn();
vi.mock('@/modules/ingredients', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/modules/ingredients')>()),
  stockOf,
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
  offerCategories([]);
  // The dialog reads a saved spell's steps once it opens on ?edit=<id>.
  mockGraphQLQuery('SpellBuilderSteps', ({ id }: { id: string }) => ({ spell: { id, steps: [] } }));
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
  countGrimoireFacets.mockResolvedValue({
    moonPhases: [{ value: 'Waxing Crescent', count: 2 }],
    daysOfWeek: [],
    visibilities: [{ value: 'private', count: 1 }],
    makers: [{ value: MAKER, count: 3 }],
  });
  assignedCategoriesOf.mockResolvedValue([[{ id: 'c1', name: 'Testwarding' }], []]);
  displayNamesOf.mockImplementation(async (_s: unknown, ids: string[]) =>
    ids.map((id) => (id === 'editor-s1' ? 'Fixture A' : id === MAKER ? 'Fixture Maker' : null)),
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

  it('reads the four facets from the address into the query, and counts them under the tab’s status', async () => {
    await renderTab(SpellsPage, {
      moonPhase: 'Waxing Crescent',
      dayOfWeek: ['Friday', 'Monday'],
      visibility: 'private',
      maker: [MAKER, 'not-an-id'],
    });
    const facets = {
      order: 'UPDATED_DESC',
      status: 'complete',
      moonPhases: ['Waxing Crescent'],
      daysOfWeek: ['Friday', 'Monday'],
      visibilities: ['private'],
      makerIds: [MAKER],
    };
    expect(listGrimoire.mock.calls[0]![3]).toEqual(facets);
    expect(countGrimoireFacets).toHaveBeenCalledWith(session, COVEN.id, facets);
  });

  it('keeps both visibilities in the chip whether or not a spell holds each, resting on Any when one holds none', async () => {
    await renderTab(SpellsPage);
    fireEvent.click(screen.getByRole('button', { name: /^Filters/ }));
    // The count read has Private only, so Shared is read as zero and the chip cannot narrow.
    const group = screen.getByRole('group', { name: 'Visibility' });
    expect(within(group).getByRole('button', { name: /Any/ })).toBeDisabled();
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
    const list = screen.getByRole('list', { name: 'Spells' });
    const first = within(list).getByRole('article', { name: 'Fixture Working' });
    expect(within(first).getByText('Testwarding')).toBeInTheDocument();
    expect(within(list).getByRole('article', { name: 'Testwort Charm' })).toBeInTheDocument();
  });

  // The service lists a private spell to its author alone, so the card
  // badges what it is handed.
  it('badges a private spell Private, and a spell shared with the coven with nothing', async () => {
    listGrimoire.mockResolvedValue([
      spell('s1', 'Fixture Working', 'complete', 'private'),
      spell('s2', 'Testwort Charm'),
    ]);
    await renderTab(SpellsPage);
    const list = screen.getByRole('list', { name: 'Spells' });
    const card = (name: string) => within(within(list).getByRole('article', { name }));
    expect(card('Fixture Working').getByText('Private')).toBeInTheDocument();
    expect(card('Testwort Charm').queryByText('Private')).not.toBeInTheDocument();
  });

  it('says on each card who last edited it and when, the editors named in one batch', async () => {
    await renderTab(SpellsPage);
    // One batch for the page's editors, one for the members the Coven Members facet offers.
    expect(displayNamesOf).toHaveBeenCalledTimes(2);
    expect(displayNamesOf).toHaveBeenCalledWith(session, ['editor-s1', 'editor-s2']);
    expect(displayNamesOf).toHaveBeenCalledWith(session, [MAKER]);
    const list = screen.getByRole('list', { name: 'Spells' });
    const edited = (name: string) =>
      within(within(list).getByRole('article', { name })).getByRole('button', {
        name: /^Edited/,
      });
    expect(edited('Fixture Working')).toHaveAccessibleDescription(
      'Last edited by Fixture A on 1 September 2026',
    );
    // An editor the viewer cannot name still leaves the edit's time.
    expect(edited('Testwort Charm')).toHaveAccessibleDescription('Last edited on 1 September 2026');
  });

  it('offers a maker the viewer cannot name as A former member, so the facet is never empty of them', async () => {
    const STRANGER = '00000000-0000-4000-8000-0000000000bb';
    countGrimoireFacets.mockResolvedValue({
      moonPhases: [],
      daysOfWeek: [],
      visibilities: [],
      makers: [
        { value: MAKER, count: 3 },
        { value: STRANGER, count: 52 },
      ],
    });
    const { readGrimoireFacetCounts } =
      await import('@/app/(shell)/coven/[slug]/grimoire/(list)/reads');
    const { makers } = await readGrimoireFacetCounts(COVEN.id, '{}', 'complete');
    expect(makers).toEqual([
      { value: MAKER, label: 'Fixture Maker', count: 3 },
      { value: STRANGER, label: 'A former member', count: 52 },
    ]);
  });

  it('throws a refused category batch rather than drawing a card without its categories', async () => {
    assignedCategoriesOf.mockResolvedValue([new Error('Forbidden'), []]);
    await expect(renderTab(SpellsPage)).rejects.toThrow('Forbidden');
  });

  it('says what a delete removed, from ?deleted, above the list, as a status', async () => {
    await renderTab(SpellsPage, { deleted: 'Fixture Working' });
    // Among the page's other status regions, the one carrying the deleted spell's name.
    const notice = screen
      .getAllByRole('status')
      .find((region) => within(region).queryByText('Fixture Working') !== null);
    expect(notice).toBeDefined();
    expect(notice!.compareDocumentPosition(screen.getByRole('list', { name: 'Spells' }))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it('says nothing of a delete without ?deleted', async () => {
    await renderTab(SpellsPage);
    for (const region of screen.queryAllByRole('status')) {
      expect(region).not.toHaveTextContent('was deleted');
    }
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
    visibility: 'private' as const,
    status: 'draft' as const,
    updatedAt: EDITED_AT,
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

  it('draws an Edit pencil on each card for a member, linking to the tab with ?edit=<id>', async () => {
    as('member');
    await renderTab(DraftsPage, { query: 'fixture' });
    const pencil = screen.getByRole('link', { name: 'Edit Fixture Working' });
    const href = new URL(pencil.getAttribute('href') ?? '', 'https://example.test');
    expect(href.pathname).toBe('/coven/fixture-coven/grimoire/drafts');
    expect(href.searchParams.get('edit')).toBe('s1');
    // The address it opens over is kept, so closing returns to it as it was.
    expect(href.searchParams.get('query')).toBe('fixture');
    expect(screen.getAllByRole('link', { name: /^Edit / })).toHaveLength(2);
  });

  it.each([
    ['owner', 1],
    ['member', 1],
    ['viewer', 0],
  ] as const)('draws a Delete Spell bin on each card for a coven %s: %i', async (role, count) => {
    as(role);
    await renderTab(DraftsPage, { query: 'fixture' });
    expect(screen.getAllByRole('link', { name: /^Quick Look / }).length).toBeGreaterThan(0);
    const more = screen.queryAllByRole('button', { name: 'More for Fixture Working' });
    expect(more).toHaveLength(count);
    if (count > 0) {
      press(more[0]!);
      expect(await screen.findByRole('menuitem', { name: 'Delete Spell' })).toBeInTheDocument();
    }
  });

  it('draws no Edit pencil for a viewer, who could read the same cards', async () => {
    as('viewer');
    await renderTab(DraftsPage);
    expect(screen.getAllByRole('heading', { name: 'Fixture Working' }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('link', { name: /^Edit / })).not.toBeInTheDocument();
  });

  it('draws Record a Working on a member’s complete spells yet reads no roster or steps for it, which the dialog reads once opened', async () => {
    as('member');
    await renderTab(SpellsPage);
    // A member may record a working, and both spells are complete: the reads were owed if the list made them.
    expect(
      screen.getByRole('button', { name: 'Record a Working of Fixture Working' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Record a Working of Testwort Charm' }),
    ).toBeInTheDocument();
    expect(memberRoster).not.toHaveBeenCalled();
    expect(stepsOfSpells).not.toHaveBeenCalled();
  });

  it('draws no Record a Working for a viewer, who may not record one', async () => {
    as('viewer');
    await renderTab(SpellsPage);
    expect(screen.getAllByRole('heading', { name: 'Fixture Working' }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /^Record a Working/ })).not.toBeInTheDocument();
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

  it('offers Delete in the Edit dialog to a member, who may delete a spell', async () => {
    as('member');
    readSpell.mockResolvedValue(SPELL);
    await renderTab(DraftsPage, { edit: SPELL_ID });

    const dialog = screen.getByRole('dialog', { name: 'Edit Spell, Fixture Working' });
    expect(
      within(dialog).getByRole('button', { name: 'Delete Spell Fixture Working' }),
    ).toBeInTheDocument();
  });

  it('opens a saved spell under ?edit=<id> with the categories its author assigned it picked', async () => {
    as('member');
    readSpell.mockResolvedValue(SPELL);
    offerCategories([
      {
        id: CATEGORY.id,
        name: CATEGORY.name,
        description: 'Keeps a fixture warded.',
        group: GROUP,
      },
    ]);
    // Testwarding is this spell’s alone: the cards beneath carry none.
    assignedCategoriesOf.mockImplementation(async (_s: unknown, spells: { id: string }[]) =>
      spells.map(({ id }) => (id === SPELL_ID ? [{ id: 'c1', name: 'Testwarding' }] : [])),
    );
    await renderTab(DraftsPage, { edit: SPELL_ID });

    // The spell is the one asked for, so its picks are this spell’s and no other’s.
    expect(assignedCategoriesOf).toHaveBeenCalledWith(session, [
      { id: SPELL_ID, workspaceId: COVEN.id },
    ]);
    const dialog = screen.getByRole('dialog', { name: 'Edit Spell, Fixture Working' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Open All' }));
    expect(
      await within(dialog).findByRole('button', { name: 'Remove Testwarding' }),
    ).toBeInTheDocument();
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

describe('Quick Look over a Grimoire tab', () => {
  const SPELL_ID = '0f6d2c8e-3b1a-4e5f-9a7c-2d4b6e8f1a3c';
  const SPELL = {
    id: SPELL_ID,
    revision: 4,
    workspaceId: COVEN.id,
    title: 'Fixture Working',
    intent: 'Calm',
    jarDescription: null,
    sealWaxColor: null,
    moonPhase: null,
    dayOfWeek: null,
    note: null,
    visibility: 'private' as const,
    status: 'complete' as const,
    updatedAt: EDITED_AT,
    updatedBy: 'editor-s1',
  };
  const STEP = {
    id: 'st1',
    position: 1,
    ingredientId: null,
    name: null,
    body: 'Light the candle',
    form: null,
    quantity: null,
    unit: null,
    note: null,
    ingredient: null,
    variant: null,
  };

  function as(role: 'owner' | 'member' | 'viewer') {
    requireCovenMembership.mockResolvedValue({
      workspace: COVEN,
      membership: { workspaceId: COVEN.id, userId: 'fixture-user', role },
    });
  }

  beforeEach(() => {
    readSpell.mockResolvedValue(SPELL);
    // No jar of anything, unless a test says otherwise.
    stockOf.mockImplementation(async (_session, refs: unknown[]) => refs.map(() => []));
    stepsOfSpells.mockResolvedValue([[STEP]]);
  });

  it('draws a Quick Look eye on every card, linking to the tab with ?spell=<id>, the filter kept', async () => {
    as('viewer');
    await renderTab(SpellsPage, { query: 'fixture' });

    const eye = screen.getByRole('link', { name: 'Quick Look Fixture Working' });
    expect(eye).toHaveAttribute('href', '/coven/fixture-coven/grimoire?query=fixture&spell=s1');
  });

  it("gives an ingredient step's Quick Look eye the tab's address with ?spell kept and &entry=<id> added, so the details open over the modal", async () => {
    as('member');
    stepsOfSpells.mockResolvedValue([
      [
        {
          ...STEP,
          body: null,
          ingredientId: 'ing-1',
          ingredient: {
            id: 'ing-1',
            name: 'Testwort',
            canonicalName: null,
            nomenclature: 'none',
            toxic: false,
            safetyNotes: null,
            deleted: false,
          },
          variant: { id: 'v-1', form: 'root', toxic: false, safetyNotes: null, deleted: false },
        },
      ],
    ]);
    await renderTab(SpellsPage, { query: 'fixture', spell: SPELL_ID });

    const dialog = screen.getByRole('dialog', { name: 'Fixture Working' });
    expect(within(dialog).getByRole('link', { name: 'Quick Look Testwort' })).toHaveAttribute(
      'href',
      `/coven/fixture-coven/grimoire?query=fixture&spell=${SPELL_ID}&entry=ing-1`,
    );
    // The page's side column (In Coven Inventory, Category Match) is the page's alone.
    expect(within(dialog).queryByRole('region', { name: /Inventory|Category Match/ })).toBeNull();
  });

  describe('the step’s stock mark', () => {
    const TESTWORT_ROOT = {
      ...STEP,
      body: null,
      quantity: '2.000',
      unit: 'g',
      ingredientId: 'ing-1',
      ingredient: {
        id: 'ing-1',
        name: 'Testwort',
        canonicalName: null,
        nomenclature: 'none',
        toxic: false,
        safetyNotes: null,
        deleted: false,
      },
      variant: { id: 'v-1', form: 'root', toxic: false, safetyNotes: null, deleted: false },
    };
    const jar = (quantityOnHand: string) => [
      [{ variantId: 'v-1', unit: 'g', quantityOnHand, lowStockThreshold: null }],
    ];

    beforeEach(() => {
      as('viewer');
      stepsOfSpells.mockResolvedValue([[TESTWORT_ROOT]]);
    });

    it('marks an ingredient step Out where the coven’s jar of its form is empty, read in the coven', async () => {
      stockOf.mockResolvedValue(jar('0'));
      await renderTab(SpellsPage, { spell: SPELL_ID });

      expect(stockOf).toHaveBeenCalledWith(session, [
        { ingredientId: 'ing-1', workspaceId: COVEN.id },
      ]);
      const dialog = screen.getByRole('dialog', { name: 'Fixture Working' });
      expect(within(dialog).getByRole('button', { name: 'Out' })).toBeInTheDocument();
    });

    it('marks it Not Enough where the jar holds less than the step needs', async () => {
      stockOf.mockResolvedValue(jar('1'));
      await renderTab(SpellsPage, { spell: SPELL_ID });

      const dialog = screen.getByRole('dialog', { name: 'Fixture Working' });
      expect(within(dialog).getByRole('button', { name: 'Not Enough' })).toBeInTheDocument();
    });

    it('draws no mark where the jar holds enough', async () => {
      stockOf.mockResolvedValue(jar('50'));
      await renderTab(SpellsPage, { spell: SPELL_ID });

      const dialog = screen.getByRole('dialog', { name: 'Fixture Working' });
      expect(
        within(dialog).queryByRole('button', { name: /^(Out|Not Enough|Low|Units Differ)$/ }),
      ).toBeNull();
    });
  });

  it.each(['owner', 'member', 'viewer'] as const)(
    'opens the spell in a modal over the list for a coven %s, read through the service',
    async (role) => {
      as(role);
      await renderTab(SpellsPage, { spell: SPELL_ID });

      expect(readSpell).toHaveBeenCalledWith(session, COVEN.id, SPELL_ID);
      const dialog = screen.getByRole('dialog', { name: 'Fixture Working' });
      expect(within(dialog).getByText('Calm')).toBeInTheDocument();
      expect(within(dialog).getByText('Light the candle')).toBeInTheDocument();
      expect(within(dialog).getByText('Testwarding')).toBeInTheDocument();
      expect(within(dialog).getByRole('link', { name: 'See Full Recipe' })).toHaveAttribute(
        'href',
        `/coven/fixture-coven/grimoire/${SPELL_ID}`,
      );
      // The list stays beneath it.
      expect(screen.getAllByText('Testwort Charm').length).toBeGreaterThan(0);
    },
  );

  it.each([
    ['owner', true],
    ['member', true],
    ['viewer', false],
  ] as const)('offers Edit to a coven %s: %s, replacing ?spell with ?edit', async (role, shown) => {
    as(role);
    await renderTab(SpellsPage, { query: 'fixture', spell: SPELL_ID });

    const dialog = screen.getByRole('dialog', { name: 'Fixture Working' });
    const edit = within(dialog).queryByRole('link', { name: 'Edit Fixture Working' });
    if (shown) {
      expect(edit).toHaveAttribute(
        'href',
        `/coven/fixture-coven/grimoire?query=fixture&edit=${SPELL_ID}`,
      );
    } else {
      expect(edit).not.toBeInTheDocument();
    }
  });

  it.each([
    ['member', 2],
    ['viewer', 0],
  ] as const)(
    'offers Delete Spell on a card and in the open Quick Look to a coven %s: %i',
    async (role, count) => {
      as(role);
      await renderTab(SpellsPage, { query: 'fixture', spell: SPELL_ID });

      const dialog = screen.getByRole('dialog', { name: 'Fixture Working' });
      expect(
        within(dialog).queryAllByRole('button', { name: 'Delete Spell Fixture Working' }),
      ).toHaveLength(count / 2);
      // The card’s own Delete Spell sits in its More menu.
      const more = screen.queryAllByRole('button', {
        name: 'More for Fixture Working',
        hidden: true,
      });
      expect(more).toHaveLength(count / 2);
      if (count > 0) {
        press(more[0]!);
        expect(
          (await screen.findAllByRole('menuitem', { name: 'Delete Spell', hidden: true })).length,
        ).toBeGreaterThan(0);
      }
    },
  );

  it('names the editor in one displayNamesOf call for the modal', async () => {
    as('member');
    await renderTab(SpellsPage, { spell: SPELL_ID });

    const forModal = displayNamesOf.mock.calls.filter(
      ([, ids]) => ids.length === 1 && ids[0] === 'editor-s1',
    );
    expect(forModal).toHaveLength(1);
  });

  it('opens nothing for another member’s private spell, which the same read gave its author', async () => {
    as('member');
    // The precondition: the spell exists, and its author's read returns it.
    expect(await readSpell(session, COVEN.id, SPELL_ID)).toEqual(SPELL);
    readSpell.mockRejectedValue(new NotFound('No such spell in this coven'));
    await renderTab(SpellsPage, { spell: SPELL_ID });

    expect(readSpell).toHaveBeenLastCalledWith(session, COVEN.id, SPELL_ID);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('Light the candle')).not.toBeInTheDocument();
  });

  it('reads nothing for a ?spell that is not an id', async () => {
    as('member');
    await renderTab(SpellsPage, { spell: 'not-an-id' });

    expect(readSpell).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('waits beneath another dialog, so one dialog shows at a time', async () => {
    as('member');
    await renderTab(SpellsPage, { new: 'spell-fixture-coven', spell: SPELL_ID });

    expect(readSpell).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: 'Fixture Working' })).not.toBeInTheDocument();
  });

  it('says so in a Notice when the read fails, rather than drawing an empty spell', async () => {
    as('member');
    readSpell.mockRejectedValue(new Error('database down'));
    await renderTab(SpellsPage, { spell: SPELL_ID });

    expect(screen.getByRole('alert')).toHaveTextContent(/could not be read/);
  });

  it('closes back to the tab as it was, the filter kept and ?spell dropped', async () => {
    as('member');
    await renderTab(DraftsPage, { query: 'fixture', spell: SPELL_ID });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    });

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
