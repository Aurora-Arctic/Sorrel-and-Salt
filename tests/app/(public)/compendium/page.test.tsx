import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeQueryClient } from '@/lib/graphql-client';
import { CARD_PAGE_SIZE, encodeCursor } from '@/lib/pagination';
import { EMPTY_VALUES } from '@/components/IngredientForm/values';
import { NotFound } from '@/lib/errors';
import { entryDetail } from '../../../support/entry-detail';

const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
const redirect = vi.fn((_to: string) => {
  throw new Error('redirected');
});
vi.mock('next/navigation', () => ({ redirect, useRouter: () => router }));

const viewerIfSignedIn = vi.fn();
const covenRolesIfSignedIn = vi.fn();
vi.mock('@/lib/viewer', () => ({ viewerIfSignedIn, covenRolesIfSignedIn }));

const readCompendium = vi.fn();
const readFacets = vi.fn();
const readCompendiumDetails = vi.fn();
const readCompendiumHeldIn = vi.fn();
const readFacetsHeldIn = vi.fn();
vi.mock('@/app/compendium-reads', () => ({
  readCompendium,
  readFacets,
  readCompendiumHeldIn,
  readFacetsHeldIn,
  readCompendiumDetails,
  readFormIcons: async () => new Map(),
  readDeities: async () => [],
  readCategories: async () => [],
  readCardCategories: async (ids: readonly string[]) => ids.map(() => []),
}));

const resolveCompendiumSlug = vi.fn();
const readSourcingScore = vi.fn(async () => null);
const SESSION = { userId: 'user-fixture' };
const getSession = vi.fn();
vi.mock('@/lib/request-session', () => ({ getSession }));
const covensHoldingEntry = vi.fn();
const readCompendiumReview = vi.fn();
const getIngredient = vi.fn();
const heldCompendiumEntryIdsIn = vi.fn(async () => new Map<string, ReadonlySet<string>>());
vi.mock('@/modules/ingredients', () => ({
  readSourcingScore,
  readCompendiumReview,
  getIngredient,
  resolveCompendiumSlug,
  covensHoldingEntry,
  heldCompendiumEntryIdsIn,
  MAKE_IT_OURS_PERMISSION: { ingredient: ['create', 'delete'], inventory: ['update'] },
}));
const readEntryStock = vi.fn();
vi.mock('@/app/entry-stock', () => ({
  readEntryStock,
  stockKey: (workspaceId: string, ingredientId: string) => `${workspaceId}:${ingredientId}`,
}));
const entryValues = vi.fn();
vi.mock('@/app/entry-values', () => ({ entryValues }));
vi.mock('@/components/IngredientForm', () => ({
  default: ({ review }: { review?: { reviewed: boolean } }) => (
    <form aria-label="Fixture Form">
      {review && (
        <input
          type="checkbox"
          role="switch"
          aria-label="Reviewed"
          defaultChecked={review.reviewed}
        />
      )}
    </form>
  ),
}));

const { default: Page, generateMetadata } = await import('@/app/(public)/compendium/page');

const NODE = {
  id: '3f0d6a52-8c1e-4b7a-9e25-6d4c2b1a0f93',
  name: 'Testwort',
  slug: 'testwort-fixtura-testalis',
  canonicalName: 'Fixtura testalis',
  nomenclature: 'botanical',
  revision: 1,
  updatedAt: new Date('2026-03-04T05:06:07.000Z'),
  toxic: false,
  safetyNotes: null,
};

const NO_FACETS = {
  forms: [],
  deities: [],
  categories: [],
  zodiacSigns: [],
  celestialBodies: [],
  elements: [],
  toxic: [],
  withoutReferences: 0,
};

const shellOf = (...canWrite: boolean[]) => ({
  viewer: { name: 'Fixture Member' },
  workspaces: canWrite.map((write, i) => ({
    id: `w${i}`,
    slug: `coven-${i}`,
    name: `Coven ${i}`,
    canReadMembers: true,
    canWrite: write,
  })),
});

async function renderPage(params: Record<string, string | string[]> = {}) {
  const page = await Page({ searchParams: Promise.resolve(params) });
  render(<QueryClientProvider client={makeQueryClient()}>{page}</QueryClientProvider>);
}

const sizeRead = () => readCompendium.mock.lastCall![3] as number;
const variablesRead = () => JSON.parse(readCompendium.mock.lastCall![0] as string);

beforeEach(() => {
  readEntryStock.mockReset();
  readEntryStock.mockResolvedValue(new Map());
  readCompendium.mockReset();
  readCompendium.mockResolvedValue({
    edges: [{ node: NODE, cursor: 'c' }],
    pageInfo: { hasNextPage: false, hasPreviousPage: false },
    position: { page: 1, pages: 1 },
    totalCount: 1,
    variants: [[{ form: 'Fixture Herb', formChoice: null }]],
    forms: [[]],
  });
  readFacets.mockReset();
  readFacets.mockResolvedValue(NO_FACETS);
  readCompendiumHeldIn.mockReset();
  readFacetsHeldIn.mockReset();
  readFacetsHeldIn.mockResolvedValue(NO_FACETS);
  viewerIfSignedIn.mockReset();
  viewerIfSignedIn.mockResolvedValue(null);
  covenRolesIfSignedIn.mockReset();
  covenRolesIfSignedIn.mockResolvedValue(null);
  resolveCompendiumSlug.mockReset();
  resolveCompendiumSlug.mockResolvedValue({ kind: 'entry', entry: { ...NODE }, movedAway: null });
  entryValues.mockReset();
  entryValues.mockResolvedValue({ ...EMPTY_VALUES, name: 'Testwort' });
  redirect.mockClear();
  readCompendiumDetails.mockReset();
  readCompendiumDetails.mockResolvedValue(undefined);
  getSession.mockResolvedValue(SESSION);
  covensHoldingEntry.mockResolvedValue([]);
  readCompendiumReview.mockReset();
  readCompendiumReview.mockResolvedValue(null);
  getIngredient.mockReset();
  getIngredient.mockResolvedValue({ shown: true });
});

describe('the public compendium page', () => {
  it('lists the entry as a link to its own page for a visitor with no account', async () => {
    await renderPage();
    const list = screen.getByRole('list', { name: 'Compendium' });
    expect(within(list).getByRole('link', { name: /^Testwort$/ })).toHaveAttribute(
      'href',
      `/compendium/ingredients/${NODE.slug}`,
    );
  });

  it("asks for a page of the cards' size, so the grid ends on a full row", async () => {
    await renderPage({ after: encodeCursor({ key: ['Testwort'], id: NODE.id }) });

    expect(sizeRead()).toBe(CARD_PAGE_SIZE);
  });

  it('reads the same list with ?withoutReferences=1 as without it', async () => {
    await renderPage();
    const unfiltered = readCompendium.mock.lastCall![0];
    readCompendium.mockClear();
    document.body.innerHTML = '';
    await renderPage({ withoutReferences: '1' });
    expect(readCompendium.mock.lastCall![0]).toBe(unfiltered);
    expect(variablesRead()).not.toHaveProperty('withoutReferences');
  });

  it('reads the same list with ?withoutForms=1 as without it', async () => {
    await renderPage();
    const unfiltered = readCompendium.mock.lastCall![0];
    readCompendium.mockClear();
    document.body.innerHTML = '';
    await renderPage({ withoutForms: '1' });
    expect(readCompendium.mock.lastCall![0]).toBe(unfiltered);
    expect(variablesRead()).not.toHaveProperty('withoutForms');
  });

  it('reads the same list with ?reviewed=1 as without it, for a curator too', async () => {
    await renderPage();
    const unfiltered = readCompendium.mock.lastCall![0];
    readCompendium.mockClear();
    document.body.innerHTML = '';
    viewerIfSignedIn.mockResolvedValue({
      ...shellOf(),
      viewer: { name: 'Fixture', canCurate: true },
    });
    await renderPage({ reviewed: '1' });
    expect(readCompendium.mock.lastCall![0]).toBe(unfiltered);
    expect(variablesRead()).not.toHaveProperty('reviewed');
  });

  it('leaves a visitor with no account no action on the cards, and no second Sign In', async () => {
    await renderPage();
    expect(screen.getAllByRole('link', { name: 'Testwort' }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /^Add to My Ingredients: / })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Sign In' })).toBeNull();
  });

  it.each([
    ['a member of one coven', [true], 1],
    ['someone who only views', [false], 0],
  ] as const)(
    'offers Add to My Ingredients to %s only as the role allows',
    async (_who, writes, buttons) => {
      viewerIfSignedIn.mockResolvedValue(shellOf(...writes));
      await renderPage();
      const add = screen.queryAllByRole('button', { name: /^Add to My Ingredients: / });
      expect(add).toHaveLength(buttons);
      expect(screen.queryByRole('link', { name: 'Sign In' })).toBeNull();
    },
  );
});

describe('the public compendium page, narrowed to the viewer’s covens', () => {
  beforeEach(async () => {
    readCompendiumHeldIn.mockResolvedValue(await readCompendium());
    readCompendium.mockClear();
  });

  it("hands In My Covens each coven's pause as the shell read it, and counts holdings in the unpaused covens alone", async () => {
    const shell = shellOf(true, true);
    viewerIfSignedIn.mockResolvedValue({
      ...shell,
      workspaces: [
        { ...shell.workspaces[0]!, canWrite: false, paused: { until: null } },
        { ...shell.workspaces[1]!, paused: null },
      ],
    });
    await renderPage();

    fireEvent.click(screen.getByRole('button', { name: /^Filters/ }));
    fireEvent.click(screen.getByRole('combobox', { name: 'In My Covens' }));

    // The holding count asks only the coven the viewer may read: the paused one's read would be refused, and blank the count for both.
    expect(heldCompendiumEntryIdsIn).toHaveBeenLastCalledWith(SESSION, ['w1'], expect.any(Array));

    const paused = screen.getByRole('option', { name: /Coven 0/ });
    expect(paused).toHaveAccessibleName('Coven 0 Paused, with no end date');
    expect(paused).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('option', { name: 'Coven 1' })).not.toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('reads the list and the counts through the cached reads when no coven is picked', async () => {
    viewerIfSignedIn.mockResolvedValue(shellOf(true, false));
    await renderPage();
    expect(readCompendium).toHaveBeenCalled();
    expect(readFacets).toHaveBeenCalled();
    expect(readCompendiumHeldIn).not.toHaveBeenCalled();
    expect(readFacetsHeldIn).not.toHaveBeenCalled();
  });

  it('reads both through the session when covens are picked, every id the address names', async () => {
    viewerIfSignedIn.mockResolvedValue(shellOf(true, false));
    await renderPage({ covens: ['w0', 'w1'] });
    expect(readCompendium).not.toHaveBeenCalled();
    expect(readFacets).not.toHaveBeenCalled();
    const [session, variables, , , size] = readCompendiumHeldIn.mock.lastCall!;
    expect(session).toBe(SESSION);
    expect(JSON.parse(variables as string)).toMatchObject({ covenIds: ['w0', 'w1'] });
    expect(size).toBe(CARD_PAGE_SIZE);
    expect(readFacetsHeldIn).toHaveBeenCalledWith(SESSION, variables);
  });

  it('reads both through the session under Not In with no coven picked, carrying covensNot', async () => {
    viewerIfSignedIn.mockResolvedValue(shellOf(true, false));
    await renderPage({ covensNot: '1' });
    expect(readCompendium).not.toHaveBeenCalled();
    expect(readFacets).not.toHaveBeenCalled();
    const [session, variables] = readCompendiumHeldIn.mock.lastCall!;
    expect(session).toBe(SESSION);
    expect(JSON.parse(variables as string)).toMatchObject({ covensNot: true });
    expect(readFacetsHeldIn).toHaveBeenCalledWith(SESSION, variables);
  });

  it('reads the cached list for a visitor under Not In', async () => {
    getSession.mockResolvedValue(null);
    await renderPage({ covensNot: '1' });
    expect(readCompendiumHeldIn).not.toHaveBeenCalled();
    expect(readFacetsHeldIn).not.toHaveBeenCalled();
    expect(readCompendium).toHaveBeenCalled();
  });

  it('reads the cached list for a visitor, whatever covens the address names', async () => {
    getSession.mockResolvedValue(null);
    await renderPage({ covens: 'w0' });
    expect(readCompendiumHeldIn).not.toHaveBeenCalled();
    expect(readFacetsHeldIn).not.toHaveBeenCalled();
    expect(readCompendium).toHaveBeenCalled();
  });
});

describe('the public compendium page, for a curator', () => {
  const curator = (canCurate = true) => ({ ...shellOf(), viewer: { name: 'Fixture', canCurate } });
  const dialog = () => screen.queryByRole('dialog', { name: /Edit Compendium Entry/ });
  const editLinks = () => screen.queryAllByRole('link', { name: /^Edit / });
  const SEARCH = { query: 'Test', after: encodeCursor({ key: ['Mockwort'], id: NODE.id }) };

  it('offers Edit on each card at the search with ?edit=<slug>, reading nothing more until asked', async () => {
    viewerIfSignedIn.mockResolvedValue(curator());
    await renderPage(SEARCH);

    const [edit] = editLinks();
    const href = new URL(edit.getAttribute('href')!, 'https://fixture.test');
    expect(href.pathname).toBe('/compendium');
    expect(Object.fromEntries(href.searchParams)).toEqual({ ...SEARCH, edit: NODE.slug });
    expect(dialog()).toBeNull();
    expect(resolveCompendiumSlug).not.toHaveBeenCalled();
  });

  it("opens the edit dialog over the search on a curator's ?edit=<slug>, its form on the entry's values", async () => {
    viewerIfSignedIn.mockResolvedValue(curator());
    await renderPage({ ...SEARCH, edit: NODE.slug });

    expect(resolveCompendiumSlug).toHaveBeenCalledWith(NODE.slug, expect.anything());
    expect(entryValues).toHaveBeenCalledWith(expect.objectContaining({ id: NODE.id }), null);
    expect(within(dialog()!).getByRole('form', { name: 'Fixture Form' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Compendium' })).toBeInTheDocument();
  });

  it('opens an old slug at its new one, keeping the search', async () => {
    viewerIfSignedIn.mockResolvedValue(curator());
    resolveCompendiumSlug.mockResolvedValue({ kind: 'moved', slug: 'mockwort-fixtura-testalis' });

    await expect(renderPage({ ...SEARCH, edit: 'old-slug' })).rejects.toThrow('redirected');
    const to = new URL(redirect.mock.lastCall![0], 'https://fixture.test');
    expect(to.pathname).toBe('/compendium');
    expect(Object.fromEntries(to.searchParams)).toEqual({
      ...SEARCH,
      edit: 'mockwort-fixtura-testalis',
    });
  });

  it('says so over the search when ?edit= names no entry, and opens nothing', async () => {
    viewerIfSignedIn.mockResolvedValue(curator());
    resolveCompendiumSlug.mockRejectedValue(new NotFound('IngredientNotFound'));

    await renderPage({ ...SEARCH, edit: 'gone' });

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(dialog()).toBeNull();
  });

  // The authorization test: the same address that opens the dialog for a curator (asserted
  // first, so the refusal below is the guard's and not a fixture that could never open)
  // opens nothing and reads nothing for anyone else, and offers them no Edit.
  it.each([
    ['a visitor with no account', null],
    ['a signed-in account that cannot curate', curator(false)],
  ] as const)(
    'refuses %s an Edit and ignores their ?edit=, which opens for a curator',
    async (_who, shell) => {
      const address = { ...SEARCH, edit: NODE.slug };
      viewerIfSignedIn.mockResolvedValue(curator());
      await renderPage(address);
      expect(dialog()).not.toBeNull();
      expect(editLinks()).toHaveLength(1);
      document.body.innerHTML = '';
      resolveCompendiumSlug.mockClear();
      entryValues.mockClear();

      viewerIfSignedIn.mockResolvedValue(shell);
      await renderPage(address);

      expect(screen.getByRole('list', { name: 'Compendium' })).toBeInTheDocument();
      expect(dialog()).toBeNull();
      expect(editLinks()).toHaveLength(0);
      expect(resolveCompendiumSlug).not.toHaveBeenCalled();
      expect(entryValues).not.toHaveBeenCalled();
    },
  );

  // Rule 6: the list is the one cached read whoever asks, keyed by the address alone.
  it('reads the list with the same arguments for a curator as for a visitor', async () => {
    await renderPage(SEARCH);
    const visitor = readCompendium.mock.lastCall;
    document.body.innerHTML = '';
    viewerIfSignedIn.mockResolvedValue(curator());
    await renderPage({ ...SEARCH, edit: NODE.slug });
    expect(readCompendium.mock.lastCall).toEqual(visitor);
  });
});

describe("the public compendium page, with an entry's details open", () => {
  const SEARCH = { query: 'Test' };
  const DETAIL = {
    ...entryDetail({ id: NODE.id, slug: NODE.slug, name: NODE.name }),
    folkNames: ['Fixture Bane'],
  };
  const details = () => screen.queryByRole('dialog', { name: 'Testwort' });
  const curator = () => ({ ...shellOf(), viewer: { name: 'Fixture', canCurate: true } });
  const paramsOf = (link: HTMLElement) =>
    Object.fromEntries(new URL(link.getAttribute('href')!, 'https://fixture.test').searchParams);
  const cardLinks = () =>
    within(screen.getByRole('list', { name: 'Compendium' }))
      .getAllByRole('link')
      .map((link) => [link.textContent, link.getAttribute('href')]);

  it('gives each card a Quick Look to the search with ?entry=<id>, reading no details until asked', async () => {
    await renderPage(SEARCH);

    const eye = screen.getByRole('link', { name: 'Quick Look Testwort, Fixtura testalis' });
    expect(new URL(eye.getAttribute('href')!, 'https://fixture.test').pathname).toBe('/compendium');
    expect(paramsOf(eye)).toEqual({ ...SEARCH, entry: NODE.id });
    expect(details()).toBeNull();
    expect(readCompendiumDetails).not.toHaveBeenCalled();
  });

  it('opens a visitor the details over the search on ?entry=<id>, read by the id alone, with See in Compendium and no Edit', async () => {
    getSession.mockResolvedValue(null);
    readCompendiumDetails.mockResolvedValue(DETAIL);
    await renderPage({ ...SEARCH, entry: NODE.id });

    expect(readCompendiumDetails.mock.lastCall).toEqual([NODE.id]);
    const dialog = details()!;
    expect(
      within(within(dialog).getByRole('list', { name: 'Folk Names' })).getByText('Fixture Bane'),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: 'See in Compendium' })).toHaveAttribute(
      'href',
      `/compendium/ingredients/${NODE.slug}`,
    );
    expect(within(dialog).queryByRole('link', { name: /^Edit\b/ })).toBeNull();
    expect(screen.getByRole('list', { name: 'Compendium' })).toBeInTheDocument();
    expect(covensHoldingEntry).not.toHaveBeenCalled();
    expect(within(dialog).queryByRole('list', { name: 'In Your Cupboards' })).toBeNull();
  });

  it("lists a signed-in viewer's own covens that hold the entry in the details, read with their session", async () => {
    covensHoldingEntry.mockResolvedValue([
      { id: 'w-fixture', slug: 'fixture-coven', name: 'Fixture Coven' },
    ]);
    readCompendiumDetails.mockResolvedValue(DETAIL);
    await renderPage({ ...SEARCH, entry: NODE.id });

    expect(covensHoldingEntry).toHaveBeenCalledExactlyOnceWith(SESSION, NODE.id);
    const covens = within(details()!).getByRole('list', { name: 'In Your Cupboards' });
    expect(within(covens).getByRole('link', { name: 'Fixture Coven' })).toHaveAttribute(
      'href',
      `/coven/fixture-coven/ingredients/${NODE.id}`,
    );
  });

  describe('the three dots in the details', () => {
    const member = () => ({
      ...shellOf(true),
      workspaces: [
        {
          id: 'w-1',
          slug: 'fixture-coven',
          name: 'Fixture Coven',
          canReadMembers: true,
          canWrite: true,
        },
      ],
    });

    it('gives a member of a holding coven More', async () => {
      viewerIfSignedIn.mockResolvedValue(member());
      covenRolesIfSignedIn.mockResolvedValue(new Map([['w-1', 'member']]));
      covensHoldingEntry.mockResolvedValue([
        { id: 'w-1', slug: 'fixture-coven', name: 'Fixture Coven' },
      ]);
      readCompendiumDetails.mockResolvedValue(DETAIL);
      await renderPage({ ...SEARCH, entry: NODE.id });

      expect(
        within(details()!).getByRole('button', { name: 'More for Testwort, Fixtura testalis' }),
      ).toBeInTheDocument();
    });

    it('offers Edit Stock where the page read stock for the holding coven, and asks for it once', async () => {
      viewerIfSignedIn.mockResolvedValue(member());
      covenRolesIfSignedIn.mockResolvedValue(new Map([['w-1', 'member']]));
      covensHoldingEntry.mockResolvedValue([
        { id: 'w-1', slug: 'fixture-coven', name: 'Fixture Coven' },
      ]);
      readEntryStock.mockResolvedValue(
        new Map([[`w-1:${NODE.id}`, { forms: [{ variantId: 'v1', label: 'Leaf' }], jars: [] }]]),
      );
      readCompendiumDetails.mockResolvedValue(DETAIL);
      await renderPage({ ...SEARCH, entry: NODE.id });

      fireEvent.click(
        within(details()!).getByRole('button', { name: 'More for Testwort, Fixtura testalis' }),
      );
      expect(
        within(screen.getByRole('menu')).getByRole('menuitem', { name: 'Edit Stock' }),
      ).toBeInTheDocument();
      expect(readEntryStock).toHaveBeenCalledExactlyOnceWith([
        { ingredientId: NODE.id, workspaceId: 'w-1' },
      ]);
    });

    it('gives a viewer of a coven that holds it no More', async () => {
      viewerIfSignedIn.mockResolvedValue(member());
      covenRolesIfSignedIn.mockResolvedValue(new Map([['w-1', 'viewer']]));
      covensHoldingEntry.mockResolvedValue([
        { id: 'w-1', slug: 'fixture-coven', name: 'Fixture Coven' },
      ]);
      readCompendiumDetails.mockResolvedValue(DETAIL);
      await renderPage({ ...SEARCH, entry: NODE.id });

      // Why it could show: the same window is open, with the entry read.
      expect(details()).not.toBeNull();
      expect(within(details()!).queryByRole('button', { name: /^More for / })).toBeNull();
    });
  });

  it('gives a curator Edit in the details, opening the edit dialog over them', async () => {
    viewerIfSignedIn.mockResolvedValue(curator());
    readCompendiumDetails.mockResolvedValue(DETAIL);
    await renderPage({ ...SEARCH, entry: NODE.id });

    const edit = within(details()!).getByRole('link', { name: /^Edit\b/ });
    expect(paramsOf(edit)).toEqual({ ...SEARCH, entry: NODE.id, edit: NODE.slug });
    const [cardEdit] = screen.getAllByRole('link', { name: /^Edit in Compendium Testwort/ });
    expect(paramsOf(cardEdit)).toEqual({ ...SEARCH, edit: NODE.slug });
  });

  // An unknown id and a coven's own entry's id both answer nothing from the read, since a
  // coven entry's existence is private: the page is then the page with no ?entry= at all.
  it.each([
    ['a visitor', null],
    ['a curator', 'curator'],
  ] as const)(
    'opens nothing for %s when ?entry= names no compendium entry, as if the address had none',
    async (_who, who) => {
      viewerIfSignedIn.mockResolvedValue(who ? curator() : null);
      await renderPage(SEARCH);
      const bare = cardLinks();
      cleanup();
      // Why it could open: the same address opens the details when the read finds the entry.
      readCompendiumDetails.mockResolvedValue(DETAIL);
      await renderPage({ ...SEARCH, entry: NODE.id });
      expect(details()).not.toBeNull();
      cleanup();

      readCompendiumDetails.mockResolvedValue(undefined);
      await renderPage({ ...SEARCH, entry: NODE.id });

      expect(readCompendiumDetails.mock.lastCall).toEqual([NODE.id]);
      expect(details()).toBeNull();
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(screen.queryByRole('alert')).toBeNull();
      expect(cardLinks()).toEqual(bare);
    },
  );
});

describe('the public compendium page structured data', () => {
  const scripts = () => document.querySelectorAll('script[type="application/ld+json"]');

  it('describes the unfiltered list as a collection', async () => {
    await renderPage();
    expect(scripts()).toHaveLength(1);
    expect(JSON.parse(scripts()[0].textContent ?? '{}')['@type']).toBe('CollectionPage');
  });

  it('describes a filtered view as nothing', async () => {
    await renderPage({ query: 'wort' });
    expect(scripts()).toHaveLength(0);
  });

  it.each<Record<string, string>>([{ entry: NODE.id }, { after: 'c' }, { before: 'c' }])(
    'describes %o as nothing, as a copy of the list',
    async (params) => {
      await renderPage(params);
      expect(screen.getByRole('list', { name: 'Compendium' })).toBeInTheDocument();
      expect(scripts()).toHaveLength(0);
    },
  );
});

describe('the public compendium page metadata', () => {
  const metadata = (params: Record<string, string | string[]>) =>
    generateMetadata({ searchParams: Promise.resolve(params) });

  it('keeps the unfiltered page indexable', async () => {
    const result = await metadata({});
    expect(result.robots).toBeUndefined();
  });

  it('names the bare address as canonical on the indexable view too, with a description', async () => {
    const result = await metadata({});
    expect(result.alternates?.canonical).toBe('https://sorrelandsalt.com/compendium');
    expect(result.description).toBeTruthy();
  });

  it('keeps ?withoutForms=1 indexable too, as it filters nothing', async () => {
    const result = await metadata({ withoutForms: '1' });
    expect(result.robots).toBeUndefined();
  });

  it('keeps ?withoutReferences=1 indexable too, as it filters nothing', async () => {
    const result = await metadata({ withoutReferences: '1' });
    expect(result.robots).toBeUndefined();
  });

  it.each<Record<string, string>>([{ query: 'wort' }, { covens: 'w0' }])(
    'keeps a filtered view (%o) out of search results, canonical to the unfiltered page',
    async (params) => {
      const result = await metadata(params);
      expect(result.robots).toMatchObject({ index: false });
      expect(result.alternates?.canonical).toBe('https://sorrelandsalt.com/compendium');
    },
  );

  // A later page of the list holds other entries than the first, so naming the first as its
  // canonical tells a crawler to drop it, and with it the only links to those entries.
  it.each(['after', 'before'])(
    'names a ?%s= page of the unfiltered list, cursor included, as its own canonical',
    async (key) => {
      const cursor = encodeCursor({ key: ['Testwort'], id: NODE.id });
      const result = await metadata({ [key]: cursor });
      expect(result.alternates?.canonical).toBe(
        `https://sorrelandsalt.com/compendium?${key}=${encodeURIComponent(cursor)}`,
      );
    },
  );

  it('keeps a filtered later page canonical to the unfiltered page', async () => {
    const cursor = encodeCursor({ key: ['Testwort'], id: NODE.id });
    const result = await metadata({ query: 'wort', after: cursor });
    expect(result.alternates?.canonical).toBe('https://sorrelandsalt.com/compendium');
  });

  it("names the entry's own page as the canonical of ?entry=<id>, read by the id alone", async () => {
    readCompendiumDetails.mockResolvedValue(
      entryDetail({ id: NODE.id, slug: NODE.slug, name: NODE.name }),
    );
    const result = await metadata({ entry: NODE.id, query: 'wort' });
    expect(readCompendiumDetails).toHaveBeenCalledExactlyOnceWith(NODE.id);
    expect(result.alternates?.canonical).toBe(
      `https://sorrelandsalt.com/compendium/ingredients/${NODE.slug}`,
    );
  });

  it('keeps ?entry= canonical to the list when it names no entry the public reads', async () => {
    readCompendiumDetails.mockResolvedValue(undefined);
    const result = await metadata({ entry: NODE.id });
    expect(result.alternates?.canonical).toBe('https://sorrelandsalt.com/compendium');
  });
});

describe('the public compendium page, with the review switch', () => {
  const DETAIL = entryDetail({ id: NODE.id, slug: NODE.slug, name: NODE.name });
  const viewerOf = (canCurate: boolean) => ({
    ...shellOf(),
    viewer: { name: 'Fixture', canCurate },
  });
  const switchIn = (dialog: HTMLElement) =>
    within(dialog).queryByRole('switch', { name: 'Reviewed' });
  const details = () => screen.getByRole('dialog', { name: 'Testwort' });
  const editor = () => screen.getByRole('dialog', { name: /Edit Compendium Entry/ });
  const REVIEWED = { reviewedAt: new Date('2026-10-01T09:30:00.000Z') };

  it("shows a curator the switch in the details' foot, read with their session", async () => {
    viewerIfSignedIn.mockResolvedValue(viewerOf(true));
    readCompendiumDetails.mockResolvedValue(DETAIL);
    readCompendiumReview.mockResolvedValue(REVIEWED);
    await renderPage({ entry: NODE.id });

    expect(readCompendiumReview).toHaveBeenCalledExactlyOnceWith(SESSION, NODE.id);
    expect(switchIn(details())).toBeChecked();
  });

  it('shows a curator the switch above the edit form on ?edit=', async () => {
    viewerIfSignedIn.mockResolvedValue(viewerOf(true));
    await renderPage({ edit: NODE.slug });

    expect(readCompendiumReview).toHaveBeenCalledExactlyOnceWith(SESSION, NODE.id);
    expect(switchIn(editor())).not.toBeChecked();
  });

  // The preconditions: the same address shows the switch to a curator (asserted first).
  it.each([
    ['a visitor with no account', null],
    ['a signed-in account that cannot curate', viewerOf(false)],
  ] as const)('draws %s no switch and reads no review', async (_who, shell) => {
    const address = { entry: NODE.id, edit: NODE.slug };
    readCompendiumDetails.mockResolvedValue(DETAIL);
    viewerIfSignedIn.mockResolvedValue(viewerOf(true));
    await renderPage(address);
    expect(switchIn(details())).not.toBeNull();
    expect(switchIn(editor())).not.toBeNull();
    document.body.innerHTML = '';
    readCompendiumReview.mockClear();

    viewerIfSignedIn.mockResolvedValue(shell);
    await renderPage(address);

    expect(screen.getByRole('dialog', { name: 'Testwort' })).toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: 'Reviewed' })).toBeNull();
    expect(readCompendiumReview).not.toHaveBeenCalled();
  });
});
