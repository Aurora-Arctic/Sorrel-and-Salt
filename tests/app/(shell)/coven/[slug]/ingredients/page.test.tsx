import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EMPTY_VALUES } from '@/components/IngredientForm/values';
import { NotFound } from '@/lib/errors';
import { makeQueryClient } from '@/lib/graphql-client';
import { CARD_PAGE_SIZE } from '@/lib/pagination';
import { entryDetail } from '../../../../../support/entry-detail';

// A coven's Ingredients page. The guard and the services are mocked, since what they
// decide is their own tests'; the page's own reads run for real over them. Here: the guard on
// the slug from the address, one page of 24 with one stock call for the whole page, the address
// becoming the filter, what a card shows of the coven's label, kind and jars, and the edit
// dialog `?edit=<id>` opens over the list on the coven's own entry, and the Annotate dialog `?annotate=<id>` over a compendium entry
// the cupboard holds.

const COVEN = {
  id: '5b8f4a10-2d6e-4c19-8a37-0e9d1c2b3a44',
  slug: 'fixture-coven',
  name: 'Fixture Coven',
};
const session = { user: { id: 'fixture-user' } };

const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const requireCovenMembership = vi.fn();
vi.mock('@/lib/request-session', () => ({
  requireCovenMembership,
  requireSession: async () => session,
  getSession: async () => session,
}));

// Which covens the viewer may add in, for the plus beside the details' pencil; the rule
// itself is tests/app/plus-covens.test.ts's, so by default none, and the details draw no plus.
const viewerIfSignedIn = vi.fn();
const covenRolesIfSignedIn = vi.fn();
vi.mock('@/lib/viewer', () => ({ viewerIfSignedIn, covenRolesIfSignedIn }));

vi.mock('@/app/compendium-reads', () => ({
  readFormIcons: async () => new Map([['fixture herb', 'botanical']]),
  readDeities: async () => [],
  readCategories: async () => [],
  readCardCategoriesOf: async (_session: unknown, refs: readonly unknown[]) => refs.map(() => []),
}));

const listWorkspaceIngredients = vi.fn();
const countWorkspaceIngredients = vi.fn();
const stockOf = vi.fn();
const lastEditsOf = vi.fn();
const variantsOf = vi.fn();
const workspaceIngredientFacets = vi.fn();
const getIngredient = vi.fn();
const heldCompendiumEntry = vi.fn();
const ingredientDetailOf = vi.fn();
// The viewer's own covens that hold the open entry, for the details' In Your Cupboards.
// Mocked so no real query runs here; which covens it admits is
// tests/modules/ingredients/services/covens-holding.test.ts's.
const covensHoldingEntry = vi.fn();
vi.mock('@/modules/ingredients', async (importActual) => ({
  ...(await importActual<typeof import('@/modules/ingredients')>()),
  listWorkspaceIngredients,
  countWorkspaceIngredients,
  stockOf,
  lastEditsOf,
  variantsOf,
  workspaceIngredientFacets,
  getIngredient,
  heldCompendiumEntry,
  ingredientDetailOf,
  covensHoldingEntry,
}));

// The form is its own tests'; here only which ways out of it lead where.
vi.mock('@/components/IngredientForm', () => ({
  default: ({ onSaved, onCancel }: { onSaved: (saved: unknown) => void; onCancel: () => void }) => (
    <form aria-label="Fixture Form">
      <button type="button" onClick={() => onSaved({ slug: 'testwort' })}>
        Save
      </button>
      <button type="button" onClick={onCancel}>
        Cancel
      </button>
    </form>
  ),
}));

// The search row and its facet panel are CovenCards' and FacetPanel's tests'; no test here opens
// them, and the address they read is asserted on the service calls.
vi.mock('@/components/CompendiumList/filter', () => ({ default: () => null }));

// The Annotate form is its own tests' too; here, which entry it was handed and its way out.
vi.mock('@/components/CupboardEntryForm', () => ({
  default: ({
    ingredientId,
    compendium,
    overrides,
    onDone,
  }: {
    ingredientId: string;
    compendium: { name: string };
    overrides: { label: string | null };
    onDone: () => void;
  }) => (
    <form aria-label={`Annotate ${ingredientId}, ${compendium.name}, ${overrides.label}`}>
      <button type="button" onClick={onDone}>
        Cancel
      </button>
    </form>
  ),
}));

const entryValues = vi.fn();
vi.mock('@/app/entry-values', () => ({ entryValues }));

const { default: Page } = await import('@/app/(shell)/coven/[slug]/ingredients/page');

const row = (id: string, name: string, workspaceId: string | null) => ({
  id,
  name,
  workspaceId,
  canonicalName: null,
  nomenclature: 'none',
  toxic: false,
  safetyNotes: null,
  deletedAt: null,
});

const NO_FACETS = {
  forms: [],
  deities: [],
  categories: [],
  zodiacSigns: [],
  celestialBodies: [],
  elements: [],
  toxic: [],
  source: [],
  inStock: 0,
  lowStockOnly: 0,
};

async function renderPage(search: Record<string, string> = {}) {
  const page = await Page({
    params: Promise.resolve({ slug: COVEN.slug }),
    searchParams: Promise.resolve(search),
  });
  render(<QueryClientProvider client={makeQueryClient()}>{page}</QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  covensHoldingEntry.mockResolvedValue([]);
  viewerIfSignedIn.mockResolvedValue(undefined);
  covenRolesIfSignedIn.mockResolvedValue(undefined);
  requireCovenMembership.mockResolvedValue({
    workspace: COVEN,
    membership: { workspaceId: COVEN.id, userId: 'fixture-user', role: 'member' },
  });
  listWorkspaceIngredients.mockResolvedValue([
    {
      node: row('a1', 'Testwort', COVEN.id),
      cursor: { key: ['Testwort'], id: 'a1' },
      cupboardEntry: null,
    },
    {
      node: row('b2', 'Fixture Salt', null),
      cursor: { key: ['Fixture Salt'], id: 'b2' },
      cupboardEntry: { label: 'House Salt', description: null },
    },
  ]);
  countWorkspaceIngredients.mockResolvedValue({ totalCount: 2, countBefore: null });
  variantsOf.mockResolvedValue([
    [{ id: 'v1', form: 'Fixture Herb', toxic: false, safetyNotes: null }],
    [],
  ]);
  stockOf.mockResolvedValue([
    [{ id: 'j1', variantId: 'v1', quantityOnHand: '3', unit: 'oz', lowStockThreshold: '1' }],
    [],
  ]);
  lastEditsOf.mockResolvedValue([{ by: 'Fixture Editor', at: '2026-03-04T05:06:07.000Z' }, null]);
  workspaceIngredientFacets.mockResolvedValue(NO_FACETS);
  getIngredient.mockImplementation(async (_session: unknown, id: string) =>
    id === 'a1' ? row('a1', 'Testwort', COVEN.id) : row(id, 'Fixture Salt', null),
  );
  entryValues.mockResolvedValue(EMPTY_VALUES);
  // The open details' sections, each entry's own caution and folk name.
  ingredientDetailOf.mockImplementation(async (_session: unknown, entry: { id: string }) => ({
    ...entryDetail({ id: entry.id, safetyNotes: `Fixture caution of ${entry.id}.` }),
    folkNames: [`Fixture Bane of ${entry.id}`],
  }));
});

describe('the coven Ingredients page', () => {
  it('runs the coven guard on the slug from its own address', async () => {
    await renderPage();
    expect(requireCovenMembership).toHaveBeenCalledWith('fixture-coven');
  });

  it("reads the forms on the coven's proof, so a retired entry it holds still has them", async () => {
    await renderPage();
    const { membership } = await requireCovenMembership.mock.results[0].value;
    expect(variantsOf.mock.calls[0][2]).toBe(membership);
  });

  it('does not read anything for a non-member, whom the guard refuses', async () => {
    requireCovenMembership.mockRejectedValue(new Error('NEXT_NOT_FOUND'));
    await expect(renderPage()).rejects.toThrow('NEXT_NOT_FOUND');
    expect(listWorkspaceIngredients).not.toHaveBeenCalled();
    expect(stockOf).not.toHaveBeenCalled();
  });

  it('asks for a page of 24 and reads every jar of it in one stock call', async () => {
    await renderPage();
    expect(listWorkspaceIngredients.mock.calls[0]![3]).toMatchObject({ limit: CARD_PAGE_SIZE + 1 });
    expect(stockOf).toHaveBeenCalledTimes(1);
  });

  it('hands a card its last edit, and a card with none draws none', async () => {
    await renderPage();
    expect(lastEditsOf).toHaveBeenCalledTimes(1);
    expect(screen.getAllByText(/Last edited by Fixture Editor/)).toHaveLength(1);
  });

  it('links each entry to its page in the coven, under the coven’s label', async () => {
    await renderPage();
    const list = screen.getByRole('list', { name: 'Ingredients' });
    expect(
      within(list)
        .getAllByRole('link')
        .map((link) => link.getAttribute('href'))
        // A member's Edit and Annotate are the dialogs' tests', Quick Look the details'.
        .filter((href) => !/[?&](edit|annotate|entry)=/.test(href ?? '')),
    ).toEqual(['/coven/fixture-coven/ingredients/a1', '/coven/fixture-coven/ingredients/b2']);
    expect(within(list).getByRole('link', { name: /^House Salt/ })).toBeInTheDocument();
  });

  it('reads the address as the filter, Source and In Stock included', async () => {
    await renderPage({ source: 'local', inStock: '1' });
    expect(listWorkspaceIngredients.mock.calls[0]![2]).toEqual({ source: 'local', inStock: true });
    expect(workspaceIngredientFacets.mock.calls[0]![2]).toEqual({ source: 'local', inStock: true });
  });

  describe('with an empty cupboard', () => {
    beforeEach(() => {
      listWorkspaceIngredients.mockResolvedValue([]);
      countWorkspaceIngredients.mockResolvedValue({ totalCount: 0, countBefore: null });
      variantsOf.mockResolvedValue([]);
      stockOf.mockResolvedValue([]);
    });
    const emptyState = () => screen.getByRole('status', { name: 'No Ingredients' });

    it('offers a member the first add', async () => {
      await renderPage();
      expect(
        within(emptyState()).getByRole('button', { name: 'Add Ingredient' }),
      ).toBeInTheDocument();
    });

    it('offers a viewer, who may not add, no button', async () => {
      requireCovenMembership.mockResolvedValue({
        workspace: COVEN,
        membership: { workspaceId: COVEN.id, userId: 'fixture-user', role: 'viewer' },
      });
      await renderPage();
      expect(within(emptyState()).queryByRole('button')).toBeNull();
    });
  });
});

describe("the coven Ingredients page's edit dialog", () => {
  const asRole = (role: string) =>
    requireCovenMembership.mockResolvedValue({
      workspace: COVEN,
      membership: { workspaceId: COVEN.id, userId: 'fixture-user', role },
    });
  const editLinks = () =>
    within(screen.getByRole('list', { name: 'Ingredients' })).queryAllByRole('link', {
      name: /^Edit/,
    });
  const editDialog = () => screen.queryByRole('dialog', { name: /Edit Ingredient/ });
  const FILTERED_HREF = '/coven/fixture-coven/ingredients?source=local';

  it("gives a member Edit on the coven's own entry alone, keeping the filter, and reads nothing until asked", async () => {
    await renderPage({ source: 'local' });
    // Both rows are on the page, so Edit's absence on the compendium's is the rule, not the fixture.
    expect(screen.getByRole('link', { name: /^House Salt/ })).toBeInTheDocument();
    const edits = editLinks();
    expect(edits).toHaveLength(1);
    expect(edits[0]).toHaveAccessibleName('Edit Testwort');
    expect(edits[0]).toHaveAttribute('href', `${FILTERED_HREF}&edit=a1`);
    expect(editDialog()).not.toBeInTheDocument();
    expect(getIngredient).not.toHaveBeenCalled();
  });

  it('gives a viewer no Edit', async () => {
    asRole('viewer');
    await renderPage();
    expect(screen.getByRole('link', { name: /^Testwort/ })).toBeInTheDocument();
    expect(editLinks()).toHaveLength(0);
  });

  it("opens the coven's own entry under ?edit=<id>, its values read as the member", async () => {
    await renderPage({ source: 'local', edit: 'a1' });
    expect(getIngredient).toHaveBeenCalledWith(session, 'a1', COVEN.id);
    expect(entryValues).toHaveBeenCalledWith(expect.objectContaining({ id: 'a1' }), session);
    const dialog = editDialog()!;
    expect(within(dialog).getByRole('form', { name: 'Fixture Form' })).toBeInTheDocument();
  });

  it('opens nothing over a compendium entry the coven names', async () => {
    await renderPage({ edit: 'b2' });
    // The read was made, and found the row: the page, not the lookup, said no.
    expect(getIngredient).toHaveBeenCalledWith(session, 'b2', COVEN.id);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(entryValues).not.toHaveBeenCalled();
  });

  it('opens nothing for a viewer, and reads nothing', async () => {
    asRole('viewer');
    await renderPage({ edit: 'a1' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(getIngredient).not.toHaveBeenCalled();
    expect(ingredientDetailOf).not.toHaveBeenCalled();
    expect(entryValues).not.toHaveBeenCalled();
  });

  it('opens nothing for an id the coven cannot reach', async () => {
    getIngredient.mockRejectedValue(new NotFound('No such ingredient'));
    await renderPage({ edit: 'gone' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(entryValues).not.toHaveBeenCalled();
  });

  it('lets any other failure of the read through', async () => {
    getIngredient.mockRejectedValue(new Error('connection lost'));
    await expect(renderPage({ edit: 'a1' })).rejects.toThrow('connection lost');
  });

  it('goes back to the filtered list on a save, fetched again, and on Cancel', async () => {
    await renderPage({ source: 'local', edit: 'a1' });
    fireEvent.click(within(editDialog()!).getByRole('button', { name: 'Save' }));
    expect(router.replace.mock.lastCall?.[0]).toBe(FILTERED_HREF);
    expect(router.refresh).toHaveBeenCalled();

    fireEvent.click(within(editDialog()!).getByRole('button', { name: 'Cancel' }));
    expect(router.replace.mock.lastCall?.[0]).toBe(FILTERED_HREF);
  });
});

describe("the coven Ingredients page's details modal", () => {
  const asRole = (role: string) =>
    requireCovenMembership.mockResolvedValue({
      workspace: COVEN,
      membership: { workspaceId: COVEN.id, userId: 'fixture-user', role },
    });
  const FILTERED_HREF = '/coven/fixture-coven/ingredients?source=local';
  const details = (name: string) => screen.queryByRole('dialog', { name });
  const editDialog = () => screen.queryByRole('dialog', { name: /Edit Ingredient/ });
  const SALT = row('b2', 'Fixture Salt', null);

  beforeEach(() => {
    heldCompendiumEntry.mockImplementation(async (_membership: unknown, id: string) =>
      id === 'b2'
        ? {
            entry: SALT,
            cupboardEntry: {
              ingredientId: 'b2',
              label: 'House Salt',
              description: null,
              safetyNotes: 'Fixture house caution.',
            },
          }
        : undefined,
    );
  });

  it("gives each card a Quick Look to the list's own address with ?entry=<id>, filter kept, and reads nothing until asked", async () => {
    await renderPage({ source: 'local' });
    expect(screen.getByRole('link', { name: 'Quick Look Testwort' })).toHaveAttribute(
      'href',
      `${FILTERED_HREF}&entry=a1`,
    );
    expect(screen.getByRole('link', { name: 'Quick Look House Salt' })).toHaveAttribute(
      'href',
      `${FILTERED_HREF}&entry=b2`,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(getIngredient).not.toHaveBeenCalled();
  });

  it("reads the opened entry's last edit for Quick Look, from the same service as the cards", async () => {
    lastEditsOf.mockResolvedValue([{ by: 'Fixture Editor', at: '2026-03-04T05:06:07.000Z' }]);
    await renderPage({ source: 'local', entry: 'a1' });
    const dialog = details('Testwort')!;
    expect(lastEditsOf).toHaveBeenCalledWith(session, COVEN.id, [
      expect.objectContaining({ id: 'a1' }),
    ]);
    expect(within(dialog).getByRole('button', { name: /^Edited/ })).toHaveAccessibleDescription(
      /Fixture Editor/,
    );
  });

  it("opens the coven's own entry under ?entry=<id>, read as the member, with its full page in the coven", async () => {
    await renderPage({ source: 'local', entry: 'a1' });
    expect(getIngredient).toHaveBeenCalledWith(session, 'a1', COVEN.id);
    const dialog = details('Testwort')!;
    expect(within(dialog).getByRole('link', { name: 'See in Your Cupboard' })).toHaveAttribute(
      'href',
      '/coven/fixture-coven/ingredients/a1',
    );
    // A coven's own entry is held by this coven alone, so no covens are read for it.
    expect(covensHoldingEntry).not.toHaveBeenCalled();
  });

  it("gives a member Edit and the bin on the coven's own entry, Edit opening the edit modal over the details", async () => {
    // The window carries its card's controls: the pencil, a link,
    // and the bin, a lone Delete, with no menu between them.
    await renderPage({ source: 'local', entry: 'a1' });
    const dialog = details('Testwort')!;
    expect(within(dialog).getByRole('link', { name: 'Edit Testwort' })).toHaveAttribute(
      'href',
      `${FILTERED_HREF}&entry=a1&edit=a1`,
    );
    expect(
      within(dialog).getByRole('button', { name: 'Delete Ingredient Testwort' }),
    ).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: /^More for\b/ })).not.toBeInTheDocument();
  });

  it('gives a viewer the details, and no Edit in them', async () => {
    asRole('viewer');
    await renderPage({ entry: 'a1' });
    // The details opened, so Edit's absence is the role's, not a missing dialog.
    const dialog = details('Testwort')!;
    expect(within(dialog).getByRole('link', { name: 'See in Your Cupboard' })).toBeInTheDocument();
    expect(within(dialog).queryByRole('link', { name: /^Edit\b/ })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: /^Edit\b/ })).not.toBeInTheDocument();
    expect(entryValues).not.toHaveBeenCalled();
  });

  it("opens a compendium entry the cupboard holds under the coven's label, with no Edit", async () => {
    await renderPage({ entry: 'b2' });
    expect(heldCompendiumEntry).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: COVEN.id }),
      'b2',
    );
    const dialog = details('House Salt')!;
    expect(within(dialog).getByRole('link', { name: 'See in Your Cupboard' })).toHaveAttribute(
      'href',
      '/coven/fixture-coven/ingredients/b2',
    );
    expect(within(dialog).queryByRole('link', { name: /^Edit\b/ })).not.toBeInTheDocument();
    // Nor the menu a coven's own entry has; Edit Stock edits the jars, not the entry.
    expect(
      within(dialog).queryByRole('button', { name: /^Edit\b(?! Stock)/ }),
    ).not.toBeInTheDocument();
  });

  it("draws neither the plus nor the check in the details of a held compendium entry, though another of the member's covens lacks it", async () => {
    // The window carries its card's controls and a coven's card has no plus, so a coven's window has
    // none; the compendium's and the admin's windows do.
    const other = { id: 'w-other', slug: 'other-coven', name: 'Other Coven' };
    viewerIfSignedIn.mockResolvedValue({
      viewer: { name: 'Fixture Member', canCurate: false },
      workspaces: [COVEN, other].map((c) => ({ ...c, canReadMembers: true, canWrite: true })),
    });
    covenRolesIfSignedIn.mockResolvedValue(
      new Map([
        [COVEN.id, 'member'],
        [other.id, 'member'],
      ]),
    );
    covensHoldingEntry.mockResolvedValue([{ id: COVEN.id, slug: COVEN.slug, name: COVEN.name }]);
    await renderPage({ entry: 'b2' });

    // Why it could have: the window is open on the held entry, with the card's own More in it,
    // and the other coven, where the member may add, lacks the entry.
    const dialog = details('House Salt')!;
    expect(within(dialog).getByRole('button', { name: 'More for House Salt' })).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: /^Add to My Ingredients: / })).toBeNull();
    expect(within(dialog).queryByRole('button', { name: /^In Every Cupboard: / })).toBeNull();
  });

  it("lists the member's own covens that hold a held compendium entry in the details, read as the member", async () => {
    covensHoldingEntry.mockResolvedValue([
      { id: COVEN.id, slug: 'fixture-coven', name: 'Fixture Coven' },
      { id: 'w-other', slug: 'other-coven', name: 'Other Coven' },
    ]);
    await renderPage({ entry: 'b2' });

    expect(covensHoldingEntry).toHaveBeenCalledExactlyOnceWith(session, 'b2');
    const covens = within(details('House Salt')!).getByRole('list', { name: 'In Your Cupboards' });
    expect(within(covens).getByRole('link', { name: 'Other Coven' })).toHaveAttribute(
      'href',
      '/coven/other-coven/ingredients/b2',
    );
    expect(within(covens).getAllByRole('link')).toHaveLength(2);
  });

  it("shows the coven's own entry's sections in the details, read as the member", async () => {
    await renderPage({ entry: 'a1' });
    // Not retired, so read with no coven named, as the entry's own page reads it.
    expect(ingredientDetailOf).toHaveBeenCalledWith(
      session,
      expect.objectContaining({ id: 'a1' }),
      undefined,
    );
    const dialog = details('Testwort')!;
    expect(
      within(within(dialog).getByRole('region', { name: 'Caution' })).getByText(
        'Fixture caution of a1.',
      ),
    ).toBeInTheDocument();
    expect(
      within(within(dialog).getByRole('list', { name: 'Folk Names' })).getByText(
        'Fixture Bane of a1',
      ),
    ).toBeInTheDocument();
  });

  it("shows a held compendium entry's sections with the coven's annotations laid over them", async () => {
    await renderPage({ entry: 'b2' });
    const dialog = details('House Salt')!;
    const caution = within(dialog).getByRole('region', { name: 'Caution' });
    // Why the compendium's could show: the read returned it, and the cupboard's replaces it.
    expect(ingredientDetailOf).toHaveBeenCalledWith(
      session,
      expect.objectContaining({ id: 'b2' }),
      undefined,
    );
    expect(within(caution).getByText('Fixture house caution.')).toBeInTheDocument();
    expect(within(caution).queryByText('Fixture caution of b2.')).not.toBeInTheDocument();
    expect(within(dialog).getByText('Fixture Bane of b2')).toBeInTheDocument();
  });

  it('opens nothing for a compendium entry the cupboard does not hold', async () => {
    getIngredient.mockResolvedValue(row('c3', 'Other Salt', null));
    await renderPage({ entry: 'c3' });
    // The read found the row: the cupboard, not the lookup, said no.
    expect(heldCompendiumEntry).toHaveBeenCalledWith(expect.anything(), 'c3');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens nothing for an id the coven cannot reach', async () => {
    getIngredient.mockRejectedValue(new NotFound('No such ingredient'));
    await renderPage({ entry: 'gone' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('lets any other failure of the read through', async () => {
    getIngredient.mockRejectedValue(new Error('connection lost'));
    await expect(renderPage({ entry: 'a1' })).rejects.toThrow('connection lost');
  });

  it('closes back to the filtered list', async () => {
    await renderPage({ source: 'local', entry: 'a1' });
    await act(async () => {
      fireEvent.click(within(details('Testwort')!).getByRole('button', { name: 'Close' }));
      // The close waits on the fade.
      fireEvent.transitionEnd(details('Testwort')!);
    });
    expect(router.replace.mock.lastCall?.[0]).toBe(FILTERED_HREF);
  });

  it('opens the edit modal over the details, and a save or Cancel goes back to the details, fetched again', async () => {
    await renderPage({ source: 'local', entry: 'a1', edit: 'a1' });
    expect(details('Testwort')).toBeInTheDocument();
    fireEvent.click(within(editDialog()!).getByRole('button', { name: 'Save' }));
    expect(router.replace.mock.lastCall?.[0]).toBe(`${FILTERED_HREF}&entry=a1`);
    // Fetched again, so the list and the details beneath both show the save.
    expect(router.refresh).toHaveBeenCalled();

    fireEvent.click(within(editDialog()!).getByRole('button', { name: 'Cancel' }));
    expect(router.replace.mock.lastCall?.[0]).toBe(`${FILTERED_HREF}&entry=a1`);
  });
});

describe("the coven Ingredients page's Annotate dialog", () => {
  const asRole = (role: string) =>
    requireCovenMembership.mockResolvedValue({
      workspace: COVEN,
      membership: { workspaceId: COVEN.id, userId: 'fixture-user', role },
    });
  const annotateLinks = () =>
    within(screen.getByRole('list', { name: 'Ingredients' })).queryAllByRole('link', {
      name: /^Annotate/,
    });
  const annotateDialog = () => screen.queryByRole('dialog', { name: 'Annotate This Entry' });
  const FILTERED_HREF = '/coven/fixture-coven/ingredients?source=local';
  const SALT = { ...row('b2', 'Fixture Salt', null), description: null };
  const held = (entry: { id: string; deletedAt: Date | null } = SALT) => ({
    entry,
    cupboardEntry: { ingredientId: entry.id, label: 'House Salt', description: null },
  });

  beforeEach(() => {
    heldCompendiumEntry.mockImplementation(async (_membership: unknown, id: string) =>
      id === 'b2' ? held() : undefined,
    );
  });

  it('gives a member Annotate on the compendium entry alone, keeping the filter, and reads nothing until asked', async () => {
    await renderPage({ source: 'local' });
    // Both rows are on the page, so Annotate's absence on the coven's own is the rule.
    expect(screen.getByRole('link', { name: /^Testwort/ })).toBeInTheDocument();
    const annotates = annotateLinks();
    expect(annotates).toHaveLength(1);
    expect(annotates[0]).toHaveAccessibleName('Annotate House Salt');
    expect(annotates[0]).toHaveAttribute('href', `${FILTERED_HREF}&annotate=b2`);
    expect(annotateDialog()).not.toBeInTheDocument();
    expect(heldCompendiumEntry).not.toHaveBeenCalled();
  });

  it('gives Annotate on a retired entry the cupboard still holds', async () => {
    listWorkspaceIngredients.mockResolvedValue([
      {
        node: { ...row('b2', 'Fixture Salt', null), deletedAt: new Date('2026-10-01') },
        cursor: { key: ['Fixture Salt'], id: 'b2' },
        cupboardEntry: { label: 'House Salt', description: null },
      },
    ]);
    variantsOf.mockResolvedValue([[]]);
    stockOf.mockResolvedValue([[]]);
    await renderPage();
    expect(annotateLinks()).toHaveLength(1);
  });

  it('gives a viewer no Annotate', async () => {
    asRole('viewer');
    await renderPage();
    expect(screen.getByRole('link', { name: /^House Salt/ })).toBeInTheDocument();
    expect(annotateLinks()).toHaveLength(0);
  });

  it('opens the held entry under ?annotate=<id>, read on the coven’s proof, with its values and the coven’s', async () => {
    await renderPage({ annotate: 'b2' });
    const { membership } = await requireCovenMembership.mock.results[0].value;
    expect(heldCompendiumEntry).toHaveBeenCalledWith(membership, 'b2');
    const dialog = annotateDialog()!;
    expect(
      within(dialog).getByRole('form', { name: 'Annotate b2, Fixture Salt, House Salt' }),
    ).toBeInTheDocument();
  });

  it('opens a retired entry the cupboard still holds', async () => {
    heldCompendiumEntry.mockResolvedValue(held({ ...SALT, deletedAt: new Date('2026-10-01') }));
    await renderPage({ annotate: 'b2' });
    expect(annotateDialog()).toBeInTheDocument();
  });

  it('opens nothing for a viewer, and reads nothing', async () => {
    asRole('viewer');
    await renderPage({ annotate: 'b2' });
    // The entry is held: a member asking for the same address gets the dialog (above).
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(heldCompendiumEntry).not.toHaveBeenCalled();
  });

  it('opens nothing for an id the cupboard does not hold, the coven’s own entry included', async () => {
    await renderPage({ annotate: 'a1' });
    // The read was made, and the cupboard named nothing.
    expect(heldCompendiumEntry).toHaveBeenCalledWith(expect.anything(), 'a1');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('goes back to the filtered list on Cancel', async () => {
    await renderPage({ source: 'local', annotate: 'b2' });
    fireEvent.click(within(annotateDialog()!).getByRole('button', { name: 'Cancel' }));
    // The form closes the modal through its own close, which fades out first.
    await waitFor(() => expect(router.replace.mock.lastCall?.[0]).toBe(FILTERED_HREF));
  });
});

describe("the coven Ingredients page's card More", () => {
  const asRole = (role: string) =>
    requireCovenMembership.mockResolvedValue({
      workspace: COVEN,
      membership: { workspaceId: COVEN.id, userId: 'fixture-user', role },
    });

  it("draws a member's lone Delete on the coven's own entry as its bin, with no More", async () => {
    await renderPage({ source: 'local' });
    expect(screen.getByRole('button', { name: 'Delete Ingredient Testwort' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'More for Testwort' })).not.toBeInTheDocument();
  });

  it('gives a viewer no More, and no bin', async () => {
    asRole('viewer');
    await renderPage();
    expect(screen.getByRole('link', { name: /^Testwort/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^More for/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^(Delete|Remove) / })).not.toBeInTheDocument();
  });
});

describe("the coven Ingredients page's Edit Stock", () => {
  const asRole = (role: string) =>
    requireCovenMembership.mockResolvedValue({
      workspace: COVEN,
      membership: { workspaceId: COVEN.id, userId: 'fixture-user', role },
    });
  const JAR = {
    id: 'j1',
    variantId: 'v1',
    quantityOnHand: '3',
    unit: 'oz',
    lowStockThreshold: '1',
  };
  const list = () => screen.getByRole('list', { name: 'Ingredients' });
  const pencil = (scope: HTMLElement, name: string) =>
    within(scope).queryByRole('button', { name: `Edit Stock, ${name}` });
  // The foot's controls bar the card's own two links, its name and its Quick Look.
  const footOf = (scope: HTMLElement): string[] =>
    [...within(scope).queryAllByRole('button'), ...within(scope).queryAllByRole('link')]
      .map((control) => control.getAttribute('aria-label') ?? control.textContent ?? '')
      .filter((name) => /^(Edit|Annotate|Delete|More|Remove)/.test(name))
      .sort();

  beforeEach(() => {
    // Each ingredient's own jars, whether the list's batch or the details' one read.
    stockOf.mockImplementation(async (_session: unknown, refs: { ingredientId: string }[]) =>
      refs.map(({ ingredientId }) => (ingredientId === 'a1' ? [JAR] : [])),
    );
    ingredientDetailOf.mockImplementation(async (_session: unknown, entry: { id: string }) => ({
      ...entryDetail({ id: entry.id }),
      variants: [
        {
          variant: { id: 'v1', form: 'fixture herb', toxic: false, safetyNotes: null },
          icon: null,
          categories: [],
          substitutes: [],
          references: [],
        },
      ],
    }));
    heldCompendiumEntry.mockResolvedValue(undefined);
  });

  it('gives a member Edit Stock on every card', async () => {
    await renderPage();
    expect(pencil(list(), 'Testwort')).toBeInTheDocument();
    expect(pencil(list(), 'House Salt')).toBeInTheDocument();
  });

  it('gives a viewer no Edit Stock, on a card or in the details, though both show', async () => {
    asRole('viewer');
    await renderPage({ entry: 'a1' });
    // The card and the details are drawn, so the pencil's absence is the role's.
    expect(screen.getByRole('link', { name: 'Quick Look Testwort' })).toBeInTheDocument();
    const details = screen.getByRole('dialog', { name: 'Testwort' });
    expect(within(list()).queryAllByRole('button', { name: /^Edit Stock/ })).toHaveLength(0);
    expect(within(details).queryByRole('button', { name: /^Edit Stock/ })).toBeNull();
  });

  it("draws the same controls in the details as on the entry's card, Edit Stock among them", async () => {
    await renderPage({ entry: 'a1' });
    const details = screen.getByRole('dialog', { name: 'Testwort' });
    const card = screen.getByRole('link', { name: 'Quick Look Testwort' }).closest('article')!;
    expect(footOf(details)).toContain('Edit Stock, Testwort');
    expect(footOf(details)).toEqual(footOf(card as HTMLElement));
  });
  it("shows each form's jar in the details' Forms to every role, a viewer included", async () => {
    asRole('viewer');
    await renderPage({ entry: 'a1' });
    const forms = within(screen.getByRole('dialog', { name: 'Testwort' })).getByRole('list', {
      name: 'Forms',
    });
    // The jar read for the details, on its form: the quantity is the coven's, not the compendium's.
    expect(within(forms).getByRole('listitem')).toHaveTextContent(/Fixture Herb.*3 oz/);
  });
});
