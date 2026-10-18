import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Forbidden, NotFound } from '@/lib/errors';
import { EMPTY_VALUES } from '@/components/IngredientForm/values';
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
const compendiumEntriesReplacedBy = vi.fn();
const getCupboardEntry = vi.fn();
vi.mock('@/modules/ingredients', () => ({
  getIngredient,
  ingredientDetailOf,
  compendiumEntriesReplacedBy,
  getCupboardEntry,
  // The pure merge: no cupboard entry, nothing laid over.
  applyCupboardEntry: (entry: unknown) => entry,
}));

// The form is its own tests'; here only that the dialog holds one.
vi.mock('@/components/IngredientForm', () => ({
  default: () => <form aria-label="Fixture Form" />,
}));

const entryValues = vi.fn();
vi.mock('@/app/(shell)/admin/compendium/entry-values', () => ({ entryValues }));

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
const edits = () => screen.queryAllByRole('link', { name: /edit/i });

const dialog = () => screen.queryByRole('dialog', { name: /Edit Ingredient/ });

const open = async (
  row: ReturnType<typeof compendiumRow>,
  canCurate = false,
  search: Record<string, string> = {},
) => {
  getIngredient.mockResolvedValue(row);
  ingredientDetailOf.mockResolvedValue({ ...entryDetail(), entry: row });
  viewerOf.mockResolvedValue({ viewer: { name: 'Fixture Member', canCurate }, workspaces: [] });
  render(await Page(params(ID, search)));
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
  compendiumEntriesReplacedBy.mockResolvedValue({ entries: [], total: 0 });
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

    expect(entryValues).toHaveBeenCalledWith(expect.objectContaining({ id: ID }));
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

  it("opens no dialog on the coven's own entry, even for a curator who asks for one", async () => {
    await open(covenRow(), true, { edit: '' });

    expect(dialog()).not.toBeInTheDocument();
    expect(entryValues).not.toHaveBeenCalled();
  });
});

describe('the coven ingredient page’s replaced compendium entries', () => {
  const replaced = (count: number, total: number) => ({
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
    compendiumEntriesReplacedBy.mockResolvedValue(replaced(3, 4));

    await open(covenRow());

    expect(compendiumEntriesReplacedBy).toHaveBeenCalledWith(SESSION, covenRow());
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

  it('passes a compendium entry itself, once, to its public address, and no See All', async () => {
    await open(compendiumRow());

    // The service finds nothing replaced for a compendium entry; the page
    // passes the entry itself.
    expect(compendiumEntriesReplacedBy).toHaveBeenCalledWith(SESSION, compendiumRow());
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

    expect(await generateMetadata(params())).toEqual({
      title: `${compendiumRow().name} (${compendiumRow().canonicalName})`,
      alternates: { canonical: '/compendium/ingredients/testwort-fixtura-testalis' },
    });
  });

  it("names no canonical for the coven's own entry", async () => {
    getIngredient.mockResolvedValue(covenRow());

    expect(await generateMetadata(params())).toEqual({
      title: `${covenRow().name} (${covenRow().canonicalName})`,
    });
  });
});
