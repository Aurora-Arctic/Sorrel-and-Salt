import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Forbidden, NotFound } from '@/lib/errors';
import { EMPTY_VALUES } from '@/components/IngredientForm/values';
import { makeQueryClient } from '@/lib/graphql-client';
import { entryDetail } from '../../../support/entry-detail';

// A coven's ingredient page (M8.19). The guard and the services are mocked,
// since what they decide is their own tests'. Here: that the coven in the
// address is what the lookup is given, that a refusal is a 404, and which of
// Edit and the compendium link each kind of entry gets.

const notFound = vi.fn(() => {
  throw new Error('not-found');
});
// The edit dialog is a client part, which asks for the router.
const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({ notFound, useRouter: () => router }));

const requireCovenMembership = vi.fn();
const requireSession = vi.fn();
vi.mock('@/lib/request-session', () => ({ requireCovenMembership, requireSession }));

const viewerOf = vi.fn();
vi.mock('@/lib/viewer', () => ({ viewerOf }));

const getIngredient = vi.fn();
const ingredientDetailOf = vi.fn();
const compendiumMatchesOf = vi.fn();
const getCupboardEntry = vi.fn();
// Which rows are retired is the service's to say (M12.24); live unless a test says otherwise.
const isRetired = vi.fn((_row: unknown) => false);
vi.mock('@/modules/ingredients', () => ({
  getIngredient,
  ingredientDetailOf,
  compendiumMatchesOf,
  getCupboardEntry,
  isRetired,
  // The permission Make It Ours is offered on, as the service asserts it (M12.23).
  MAKE_IT_OURS_PERMISSION: { ingredient: ['create', 'delete'], inventory: ['update'] },
  // The pure merge: no cupboard entry, nothing laid over.
  applyCupboardEntry: (entry: unknown) => entry,
  isAnnotated: () => false,
}));

// The form is its own tests'; here only that the dialog holds one.
vi.mock('@/components/IngredientForm', () => ({
  default: () => <form aria-label="Fixture Form" />,
}));

const entryValues = vi.fn();
vi.mock('@/app/entry-values', () => ({ entryValues }));

// The cupboard buttons (M12.17) are client parts that send mutations, so the page
// renders under a query client.
const renderPage = (ui: ReactElement) =>
  render(<QueryClientProvider client={makeQueryClient()}>{ui}</QueryClientProvider>);

const { default: Page, generateMetadata } =
  await import('@/app/(shell)/coven/[slug]/ingredients/[id]/page');

const WORKSPACE = { id: 'w-fixture', name: 'Fixture Coven', slug: 'fixture-coven' };
const SESSION = { userId: 'u-member', role: 'user' };
const ID = '00000000-0000-4000-8000-000000000001';
const params = (id = ID, search: Record<string, string> = {}) => ({
  params: Promise.resolve({ slug: WORKSPACE.slug, id }),
  searchParams: Promise.resolve(search),
});

const compendiumRow = () => entryDetail().entry;
const covenRow = () => entryDetail({ workspaceId: WORKSPACE.id, slug: 'testwort-own' }).entry;
// Edit, a plain link when it is the only choice, or Edit Compendium Entry in the Edit menu
// beside the cupboard's choices (the owner's call, 2026-10-19), opened here.
const edits = () => {
  const menu = screen.queryByRole('button', { name: 'Edit', expanded: false });
  if (menu) fireEvent.click(menu);
  return [
    ...screen.queryAllByRole('link', { name: /edit/i }),
    ...screen.queryAllByRole('menuitem', { name: /edit/i }),
  ];
};

// A cupboard row with no overrides, as the cupboard reads hand it back.
const HELD_ROW = {
  id: 'fixture-jar',
  label: null,
  description: null,
  safetyNotes: null,
  elements: null,
  celestialBodies: null,
  zodiacSigns: null,
  colors: null,
};

const dialog = () => screen.queryByRole('dialog', { name: /Edit Compendium Entry/ });

const open = async (
  row: ReturnType<typeof compendiumRow>,
  canCurate = false,
  search: Record<string, string> = {},
) => {
  getIngredient.mockResolvedValue(row);
  ingredientDetailOf.mockResolvedValue({ ...entryDetail(), entry: row });
  viewerOf.mockResolvedValue({ viewer: { name: 'Fixture Member', canCurate }, workspaces: [] });
  renderPage(await Page(params(ID, search)));
};

beforeEach(() => {
  vi.clearAllMocks();
  getCupboardEntry.mockResolvedValue(null);
  requireCovenMembership.mockResolvedValue({
    workspace: WORKSPACE,
    membership: { workspaceId: WORKSPACE.id, userId: SESSION.userId, role: 'member' },
  });
  requireSession.mockResolvedValue(SESSION);
  entryValues.mockResolvedValue(EMPTY_VALUES);
  getCupboardEntry.mockResolvedValue(null);
  compendiumMatchesOf.mockResolvedValue({ kind: 'none', entries: [], total: 0, canConvert: false });
});

describe('the coven ingredient page', () => {
  it('looks the ingredient up inside the coven the address names', async () => {
    await open(covenRow());

    expect(requireCovenMembership).toHaveBeenCalledWith(WORKSPACE.slug);
    expect(getIngredient).toHaveBeenCalledWith(SESSION, ID, WORKSPACE.id);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Testwort');
  });

  it('renders nothing for a stranger, whom the guard refuses first', async () => {
    requireCovenMembership.mockImplementation(() => {
      throw new Error('not-found');
    });

    await expect(Page(params())).rejects.toThrow('not-found');
    expect(getIngredient).not.toHaveBeenCalled();
  });

  it.each([
    ['an id that names nothing visible to the coven', new NotFound('ingredient')],
    ['an id the service refuses', new Forbidden()],
  ])('answers 404 for %s', async (_case, refusal) => {
    getIngredient.mockRejectedValue(refusal);

    await expect(Page(params('00000000-0000-4000-8000-0000000000ff'))).rejects.toThrow('not-found');
    // The lookup was made with this coven's id, so the refusal is the
    // service's and not the page never having asked.
    expect(getIngredient).toHaveBeenCalledWith(
      SESSION,
      '00000000-0000-4000-8000-0000000000ff',
      WORKSPACE.id,
    );
    expect(notFound).toHaveBeenCalledOnce();
  });

  it('rethrows a failure that is not a refusal', async () => {
    getIngredient.mockRejectedValue(new Error('database down'));

    await expect(Page(params())).rejects.toThrow('database down');
    expect(notFound).not.toHaveBeenCalled();
  });

  it('gives a compendium entry the link to its public page', async () => {
    await open(compendiumRow());

    expect(screen.getByRole('list', { name: 'In the Compendium' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Testwort/ })).toHaveAttribute(
      'href',
      '/compendium/ingredients/testwort-fixtura-testalis',
    );
    expect(screen.queryByText('Local')).toBeNull();
  });

  it('gives a coven member no Edit on a compendium entry', async () => {
    await open(compendiumRow());

    expect(edits()).toHaveLength(0);
  });

  it('gives a curator Edit on a compendium entry, on this very page, with no dialog until asked', async () => {
    await open(compendiumRow(), true);

    const target = new URL(edits()[0]!.getAttribute('href')!, 'http://fixture.test');
    expect(edits()).toHaveLength(1);
    expect(target.pathname).toBe(`/coven/${WORKSPACE.slug}/ingredients/${ID}`);
    expect(target.searchParams.has('edit')).toBe(true);
    expect(dialog()).not.toBeInTheDocument();
    expect(entryValues).not.toHaveBeenCalled();
  });

  it('opens the edit dialog on a curator who asks for it with a bare ?edit', async () => {
    await open(compendiumRow(), true, { edit: '' });

    expect(entryValues).toHaveBeenCalledWith(expect.objectContaining({ id: ID }), null);
    expect(dialog()).toBeInTheDocument();
  });

  it('opens no dialog, and reads nothing for it, for a member who asks for one', async () => {
    await open(compendiumRow(), false, { edit: '' });

    expect(dialog()).not.toBeInTheDocument();
    expect(entryValues).not.toHaveBeenCalled();
  });

  it("gives the coven's own entry neither the public link nor Edit, even to a curator", async () => {
    await open(covenRow(), true);

    expect(screen.getByText('Local')).toBeVisible();
    expect(screen.queryByRole('list', { name: 'In the Compendium' })).toBeNull();
    expect(edits()).toHaveLength(0);
  });

  it('gives a retired compendium entry neither the public link nor Edit, even to a curator', async () => {
    // Why it could have had both: the same entry, live, gets both.
    await open(compendiumRow(), true);
    expect(screen.getByRole('list', { name: 'In the Compendium' })).toBeInTheDocument();
    expect(edits()).toHaveLength(1);
    cleanup();

    getIngredient.mockResolvedValue(compendiumRow());
    ingredientDetailOf.mockResolvedValue({ ...entryDetail(), retired: true });
    renderPage(await Page(params()));

    expect(screen.queryByRole('list', { name: 'In the Compendium' })).toBeNull();
    expect(edits()).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Retired' })).toBeInTheDocument();
  });

  it('offers a retired entry the coven holds Annotate, Make It Ours and Remove, but no compendium Edit, Add or public link', async () => {
    // The owner's decision, 2026-10-19: the coven keeps annotating its row and
    // may take the entry as its own or remove it. The live-only cupboard read finds nothing;
    // the retired-entry read carries the row in the detail.
    getIngredient.mockResolvedValue(compendiumRow());
    ingredientDetailOf.mockResolvedValue({
      ...entryDetail(),
      retired: true,
      cupboardEntry: { ...HELD_ROW },
    });
    viewerOf.mockResolvedValue({
      viewer: { name: 'Fixture Member', canCurate: true },
      workspaces: [],
    });
    renderPage(await Page(params()));

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const items = screen.getAllByRole('menuitem').map((item) => item.textContent);
    expect(items).toEqual(['Annotate', 'Make It Ours', 'Remove']);
    expect(screen.queryByRole('list', { name: 'In the Compendium' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Retired' })).toBeInTheDocument();
  });

  it('opens the annotate dialog on a retired entry the coven holds, asked with ?annotate', async () => {
    getIngredient.mockResolvedValue(compendiumRow());
    ingredientDetailOf.mockResolvedValue({
      ...entryDetail(),
      retired: true,
      cupboardEntry: { ...HELD_ROW },
    });
    viewerOf.mockResolvedValue({
      viewer: { name: 'Fixture Member', canCurate: false },
      workspaces: [],
    });
    renderPage(await Page(params(ID, { annotate: '' })));

    expect(screen.getByRole('dialog', { name: 'Annotate This Entry' })).toBeInTheDocument();
  });

  it("opens no dialog on the coven's own entry, even for a curator who asks for one", async () => {
    await open(covenRow(), true, { edit: '' });

    expect(dialog()).not.toBeInTheDocument();
    expect(entryValues).not.toHaveBeenCalled();
  });
});

describe('the coven ingredient page’s Annotate', () => {
  const annotateDialog = () => screen.queryByRole('dialog', { name: 'Annotate This Entry' });
  const held = () =>
    getCupboardEntry.mockResolvedValue({
      id: 'fixture-jar',
      label: null,
      description: null,
      safetyNotes: null,
      elements: null,
      celestialBodies: null,
      zodiacSigns: null,
      colors: null,
    });
  const annotateLink = () => {
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    return screen.getByRole('menuitem', { name: 'Annotate' });
  };

  it('links Annotate to this very page with a bare ?annotate, and draws no dialog until asked', async () => {
    held();
    await open(compendiumRow());

    const target = new URL(annotateLink().getAttribute('href')!, 'http://fixture.test');
    expect(target.pathname).toBe(`/coven/${WORKSPACE.slug}/ingredients/${ID}`);
    expect(target.searchParams.has('annotate')).toBe(true);
    expect(annotateDialog()).not.toBeInTheDocument();
  });

  it('opens the annotate dialog for a member of a coven that holds the entry, who asks with ?annotate', async () => {
    held();
    await open(compendiumRow(), false, { annotate: '' });

    expect(annotateDialog()).toBeInTheDocument();
  });

  it('ignores ?annotate while the coven does not hold the entry', async () => {
    // Why it could have opened: the same member, holding the entry, gets the dialog.
    await open(compendiumRow(), false, { annotate: '' });

    expect(annotateDialog()).not.toBeInTheDocument();
  });

  it('ignores ?annotate for a viewer, who may not annotate', async () => {
    held();
    requireCovenMembership.mockResolvedValue({
      workspace: WORKSPACE,
      membership: { workspaceId: WORKSPACE.id, userId: SESSION.userId, role: 'viewer' },
    });
    await open(compendiumRow(), false, { annotate: '' });

    expect(annotateDialog()).not.toBeInTheDocument();
  });
});

// Compendium on every compendium entry in a coven, and the shelf before the
// name for one the cupboard holds (the owner's call, 2026-10-19).
describe('the coven ingredient page’s marks', () => {
  const compendiumMark = () => screen.queryByRole('status');
  const shelf = () => screen.queryByRole('button', { name: 'In Your Cupboard' });

  it('marks a compendium entry the coven does not hold as from the Compendium, with no shelf', async () => {
    await open(compendiumRow());

    expect(compendiumMark()).toBeInTheDocument();
    expect(shelf()).not.toBeInTheDocument();
  });

  it('draws the shelf beside the heading once the coven holds the entry, not inside it', async () => {
    getCupboardEntry.mockResolvedValue({
      id: 'fixture-jar',
      label: null,
      description: null,
      safetyNotes: null,
      elements: null,
      celestialBodies: null,
      zodiacSigns: null,
      colors: null,
    });
    await open(compendiumRow());

    expect(compendiumMark()).toBeInTheDocument();
    expect(shelf()).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).not.toContainElement(shelf());
  });

  it("draws the shelf on the coven's own entry, which the cupboard always holds, and no Compendium", async () => {
    await open(covenRow());

    expect(compendiumMark()).not.toBeInTheDocument();
    expect(shelf()).toBeInTheDocument();
  });
});

describe('the coven ingredient page’s compendium matches', () => {
  const replaced = (count: number, total: number, kind = 'same', canConvert = false) => ({
    kind,
    canConvert,
    entries: Array.from({ length: count }, (_, at) => ({
      id: `00000000-0000-4000-8000-00000000010${at}`,
      slug: `fixture-replaced-${at}`,
      name: `Fixture Replaced ${at}`,
      canonicalName: at === 0 ? 'Fixtura replacata' : null,
    })),
    total,
  });
  const list = () => screen.queryByRole('list', { name: 'In the Compendium' });

  it('passes the service’s entries and total to the component, each by title to its public page', async () => {
    compendiumMatchesOf.mockResolvedValue(replaced(3, 4));

    await open(covenRow());

    expect(compendiumMatchesOf).toHaveBeenCalledWith(SESSION, covenRow());
    const links = within(list()!).getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/compendium/ingredients/fixture-replaced-0',
      '/compendium/ingredients/fixture-replaced-1',
      '/compendium/ingredients/fixture-replaced-2',
    ]);
    expect(links[0]).toHaveAccessibleName(/Fixture Replaced 0 \(Fixtura replacata\)/);
    // "See All" stands after the list, not in it: it is not a compendium entry.
    const seeAll = screen.getByRole('link', { name: /4/ });
    expect(list()).not.toContainElement(seeAll);
    expect(seeAll.getAttribute('href')).toContain('/compendium?query=');
  });

  it('offers an unnamed own entry the matches as Similar, a radio for each to choose from', async () => {
    compendiumMatchesOf.mockResolvedValue(replaced(2, 2, 'similar', true));

    await open(covenRow());

    expect(screen.queryByRole('list', { name: 'In the Compendium' })).toBeNull();
    const similar = screen.getByRole('list', { name: 'Similar in the Compendium' });
    expect(within(similar).getAllByRole('radio')).toHaveLength(2);
  });

  it('offers a role that may not convert the matches and no radios', async () => {
    compendiumMatchesOf.mockResolvedValue(replaced(2, 2, 'similar', false));

    await open(covenRow());

    const similar = screen.getByRole('list', { name: 'Similar in the Compendium' });
    expect(within(similar).getAllByRole('link')).toHaveLength(2);
    expect(within(similar).queryByRole('radio')).toBeNull();
  });

  it('passes a compendium entry itself, once, to its public address, and no See All', async () => {
    await open(compendiumRow());

    // The service finds nothing replaced for a compendium entry; the page
    // passes the entry itself.
    expect(compendiumMatchesOf).toHaveBeenCalledWith(SESSION, compendiumRow());
    const links = within(list()!).getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/compendium/ingredients/testwort-fixtura-testalis',
    ]);
    expect(screen.queryByRole('link', { name: /^See All/ })).toBeNull();
  });
});

describe('the coven ingredient page title', () => {
  it('names the public page as canonical for a compendium entry', async () => {
    getIngredient.mockResolvedValue(compendiumRow());

    const result = await generateMetadata(params());
    expect(result.title).toBe(`${compendiumRow().name} (${compendiumRow().canonicalName})`);
    expect(result.alternates?.canonical).toBe(
      'https://sorrelandsalt.com/compendium/ingredients/testwort-fixtura-testalis',
    );
  });

  it('names no canonical for a retired compendium entry, whose public page is gone', async () => {
    getIngredient.mockResolvedValue(compendiumRow());
    isRetired.mockReturnValueOnce(true);

    const result = await generateMetadata(params());
    expect(result.title).toBe(`${compendiumRow().name} (${compendiumRow().canonicalName})`);
    expect(result.alternates).toBeUndefined();
    expect(isRetired).toHaveBeenCalledWith(compendiumRow());
  });

  it("names no canonical for the coven's own entry", async () => {
    getIngredient.mockResolvedValue(covenRow());

    const result = await generateMetadata(params());
    expect(result.title).toBe(`${covenRow().name} (${covenRow().canonicalName})`);
    expect(result.alternates).toBeUndefined();
  });
});
