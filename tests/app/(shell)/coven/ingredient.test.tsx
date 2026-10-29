import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Forbidden, NotFound } from '@/lib/errors';
import { EMPTY_VALUES } from '@/components/IngredientForm/values';
import { makeQueryClient } from '@/lib/graphql-client';
import {
  CovenSwitchProvider,
  useCovenSwitchRegistration,
} from '@/components/CovenSwitchTargets/context';
import { entryDetail } from '../../../support/entry-detail';

// A coven's ingredient page. The guard and the services are mocked,
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
// Which of the viewer's covens an entry opens in is the service's to say; none unless a test says so.
const covensOpeningEntry = vi.fn();
// Which rows are retired is the service's to say; live unless a test says otherwise.
const isRetired = vi.fn((_row: unknown) => false);
const stockOf = vi.fn();
const lastEditsOf = vi.fn();
vi.mock('@/modules/ingredients', () => ({
  getIngredient,
  ingredientDetailOf,
  compendiumMatchesOf,
  getCupboardEntry,
  covensOpeningEntry,
  isRetired,
  // The permission Make It Ours is offered on, as the service asserts it.
  MAKE_IT_OURS_PERMISSION: { ingredient: ['create', 'delete'], inventory: ['update'] },
  // The pure merge: no cupboard entry, nothing laid over.
  applyCupboardEntry: (entry: unknown) => entry,
  isAnnotated: () => false,
  // The jars are the stock service's to scope; here only what the page asks it for.
  stockOf,
  // Who last changed the stock; the service asserts the membership.
  lastEditsOf,
}));

// The form is its own tests'; here only that the dialog holds one.
vi.mock('@/components/IngredientForm', () => ({
  default: () => <form aria-label="Fixture Form" />,
}));

const entryValues = vi.fn();
vi.mock('@/app/entry-values', () => ({ entryValues }));

// The plus's covens are plus-covens.ts's to read; here only which entries ask for them,
// and that what comes back reaches the pair beside the pencil. None unless a test says so.
const covensHolding = vi.fn();
const plusCovensOf = vi.fn();
vi.mock('@/app/plus-covens', () => ({ covensHolding, plusCovensOf }));

// The cupboard buttons are client parts that send mutations, so the page
// renders under a query client.
// The coven layout holds the provider the switcher reads; a probe stands in for the switcher.
function Registration() {
  const registration = useCovenSwitchRegistration();
  return (
    <p data-testid="switch-registration">{registration ? JSON.stringify(registration) : 'none'}</p>
  );
}
const registered = () =>
  JSON.parse(screen.getByTestId('switch-registration').textContent ?? 'null');
const renderPage = (ui: ReactElement) =>
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <CovenSwitchProvider>
        {ui}
        <Registration />
      </CovenSwitchProvider>
    </QueryClientProvider>,
  );

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
// beside the cupboard's choices, opened here.
// Edit is the compendium's edit; Edit Stock is a different choice and is asserted by its own tests.
const edits = () => {
  const menu = screen.queryByRole('button', { name: /^Edit\b/, expanded: false });
  if (menu) fireEvent.click(menu);
  return [
    ...screen.queryAllByRole('link', { name: /edit(?! stock)/i }),
    ...screen.queryAllByRole('menuitem', { name: /edit(?! stock)/i }),
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
const ownDialog = () => screen.queryByRole('dialog', { name: /Edit Ingredient/ });
const asRole = (role: string) =>
  requireCovenMembership.mockResolvedValue({
    workspace: WORKSPACE,
    membership: { workspaceId: WORKSPACE.id, userId: SESSION.userId, role },
  });

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
  compendiumMatchesOf.mockResolvedValue({ kind: 'none', entries: [], total: 0 });
  covensHolding.mockResolvedValue([]);
  covensOpeningEntry.mockResolvedValue([]);
  plusCovensOf.mockResolvedValue(undefined);
  stockOf.mockResolvedValue([[]]);
  lastEditsOf.mockResolvedValue([null]);
});

describe('the coven ingredient page', () => {
  it('reads the entry\u2019s last edit through the service and offers its full sentence', async () => {
    const row = covenRow();
    lastEditsOf.mockResolvedValue([{ by: 'Fixture Member', at: '2026-10-21T10:00:00.000Z' }]);
    await open(row);

    expect(lastEditsOf).toHaveBeenCalledWith(SESSION, WORKSPACE.id, [row]);
    expect(screen.getByRole('button', { name: /^Edited/ })).toHaveAccessibleDescription(
      /Fixture Member/,
    );
  });

  it('draws no last-edit line for an entry nobody has changed', async () => {
    await open(covenRow());

    expect(lastEditsOf).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /^Edited/ })).toBeNull();
  });

  it('looks the ingredient up inside the coven the address names', async () => {
    await open(covenRow());

    expect(requireCovenMembership).toHaveBeenCalledWith(WORKSPACE.slug);
    expect(getIngredient).toHaveBeenCalledWith(SESSION, ID, WORKSPACE.id);
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

  it("gives the coven's own entry no public link, and a member Edit on this very page with no dialog until asked", async () => {
    await open(covenRow());

    expect(screen.getByText('Local')).toBeVisible();
    expect(screen.queryByRole('list', { name: 'In the Compendium' })).toBeNull();
    const [edit] = edits();
    const target = new URL(edit!.getAttribute('href')!, 'http://fixture.test');
    expect(target.pathname).toBe(`/coven/${WORKSPACE.slug}/ingredients/${ID}`);
    expect(target.searchParams.has('edit')).toBe(true);
    expect(ownDialog()).not.toBeInTheDocument();
    expect(entryValues).not.toHaveBeenCalled();
  });

  it("gives a viewer no Edit on the coven's own entry", async () => {
    asRole('viewer');
    await open(covenRow());

    expect(screen.getByText('Local')).toBeVisible();
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
    // The coven keeps annotating its row and may take the entry as its own or remove it. The
    // live-only cupboard read finds nothing; the retired-entry read carries the row in the detail.
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

    // Annotate is the main icon and the three dots hold the rest.
    expect(screen.getByRole('link', { name: /^Annotate\b/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^More for\b/ }));
    const items = screen.getAllByRole('menuitem').map((item) => item.textContent);
    expect(items).toEqual(['Edit Stock', 'Make It Ours', 'Remove']);
    expect(edits()).toHaveLength(0);
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

  it("opens the coven's edit dialog on its own entry for a member who asks with ?edit, reading the values as that member", async () => {
    await open(covenRow(), false, { edit: '' });

    expect(ownDialog()).toBeInTheDocument();
    expect(dialog()).not.toBeInTheDocument();
    expect(entryValues).toHaveBeenCalledWith(expect.objectContaining({ id: ID }), SESSION);
  });

  it("opens no dialog on the coven's own entry, and reads nothing for it, for a viewer who asks for one", async () => {
    // Why it could have opened: the same ask from a member opens it (above).
    asRole('viewer');
    await open(covenRow(), false, { edit: '' });

    expect(ownDialog()).not.toBeInTheDocument();
    expect(entryValues).not.toHaveBeenCalled();
  });
});

describe('the coven ingredient page’s plus', () => {
  // The plus stands left of the pencil on a coven's page too.
  const OTHER = { id: 'w-other', name: 'Other Coven' };
  const HOLDING = [{ id: WORKSPACE.id, slug: WORKSPACE.slug, name: WORKSPACE.name }];

  it('asks for the covens holding a compendium entry, this coven the default, and draws the plus', async () => {
    covensHolding.mockResolvedValue(HOLDING);
    plusCovensOf.mockResolvedValue({
      workspaceId: WORKSPACE.id,
      covens: [{ id: WORKSPACE.id, name: WORKSPACE.name }, OTHER],
      heldIn: [WORKSPACE.id],
    });
    await open(compendiumRow());

    expect(covensHolding).toHaveBeenCalledWith(ID);
    expect(plusCovensOf).toHaveBeenCalledWith(HOLDING, WORKSPACE.id);
    expect(screen.getByRole('button', { name: /^Add to My Ingredients: / })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^In Every Cupboard: / })).toBeNull();
  });

  it('draws the check in its place once every coven that may add holds the entry', async () => {
    plusCovensOf.mockResolvedValue({
      workspaceId: WORKSPACE.id,
      covens: [{ id: WORKSPACE.id, name: WORKSPACE.name }],
      heldIn: [WORKSPACE.id],
    });
    await open(compendiumRow());

    expect(screen.getByRole('button', { name: /^In Every Cupboard: / })).toBeInTheDocument();
  });

  it("asks nothing for the coven's own entry, which takes neither plus nor check", async () => {
    // Why it could have drawn one: a compendium entry given the same covens does (above).
    plusCovensOf.mockResolvedValue({
      workspaceId: WORKSPACE.id,
      covens: [{ id: WORKSPACE.id, name: WORKSPACE.name }, OTHER],
      heldIn: [],
    });
    await open(covenRow());

    expect(plusCovensOf).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /^In Every Cupboard: / })).toBeNull();
  });

  it('asks nothing for a retired entry, which the compendium no longer offers', async () => {
    getIngredient.mockResolvedValue(compendiumRow());
    ingredientDetailOf.mockResolvedValue({ ...entryDetail(), retired: true });
    viewerOf.mockResolvedValue({
      viewer: { name: 'Fixture Member', canCurate: false },
      workspaces: [],
    });
    renderPage(await Page(params()));

    expect(plusCovensOf).not.toHaveBeenCalled();
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
  // Annotate is the card's main icon, a link, where one coven may annotate.
  const annotateLink = () => screen.getByRole('link', { name: /^Annotate\b/ });

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
// name for one the cupboard holds.
describe('the coven ingredient page’s marks', () => {
  const compendiumMark = () =>
    screen.queryAllByRole('status').find((s) => !/Review/.test(s.textContent ?? '')) ?? null;
  const shelf = () => screen.queryByRole('button', { name: 'In Your Cupboard' });

  it('marks a compendium entry the coven does not hold as from the Compendium, with no shelf', async () => {
    await open(compendiumRow());

    expect(compendiumMark()).toBeInTheDocument();
    expect(shelf()).not.toBeInTheDocument();
  });

  it('draws the shelf once the coven holds the entry', async () => {
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
  });

  it("draws the shelf on the coven's own entry, which the cupboard always holds, and no Compendium", async () => {
    await open(covenRow());

    expect(compendiumMark()).not.toBeInTheDocument();
    expect(shelf()).toBeInTheDocument();
  });
});

describe('the coven ingredient page’s compendium matches', () => {
  const replaced = (count: number, total: number, kind = 'same') => ({
    kind,
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

  // Linking goes one way in v1, so the Similar list only shows. The
  // precondition is that an owner is the role that once could convert.
  it.each(['owner', 'viewer'])(
    'lists an unnamed own entry’s matches as Similar to a %s and offers no action on them',
    async (role) => {
      requireCovenMembership.mockResolvedValue({
        workspace: WORKSPACE,
        membership: { workspaceId: WORKSPACE.id, userId: SESSION.userId, role },
      });
      compendiumMatchesOf.mockResolvedValue(replaced(2, 2, 'similar'));

      await open(covenRow());

      expect(screen.queryByRole('list', { name: 'In the Compendium' })).toBeNull();
      const similar = screen.getByRole('list', { name: 'Similar in the Compendium' });
      expect(
        within(similar)
          .getAllByRole('link')
          .map((link) => link.getAttribute('href')),
      ).toEqual([
        '/compendium/ingredients/fixture-replaced-0',
        '/compendium/ingredients/fixture-replaced-1',
      ]);
      expect(screen.queryByRole('radio')).toBeNull();
      expect(within(similar).queryByRole('button')).toBeNull();
      expect(screen.queryByRole('button', { name: /link to|this is it/i })).toBeNull();
    },
  );

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

describe('the coven ingredient page’s stock (M12.29)', () => {
  const VARIANT_ID = '00000000-0000-4000-8000-0000000000c1';
  const STAMPS = {
    createdAt: new Date('2026-01-01T00:00:00Z'),
    createdBy: null,
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    updatedBy: null,
    deletedAt: null,
    deletedBy: null,
  };
  // One form, Testroot, and one jar of it holding 5 g.
  const withRoot = async (row: ReturnType<typeof compendiumRow>, detail: object = {}) => {
    const variant = {
      id: VARIANT_ID,
      ingredientId: row.id,
      workspaceId: null,
      form: 'testroot',
      formId: null,
      description: null,
      safetyNotes: null,
      toxic: false,
      elements: null,
      celestialBodies: null,
      zodiacSigns: null,
      colors: null,
      ...STAMPS,
    };
    stockOf.mockResolvedValue([
      [
        {
          id: 'fixture-stock',
          variantId: VARIANT_ID,
          quantityOnHand: '5',
          unit: 'g',
          lowStockThreshold: null,
        },
      ],
    ]);
    getIngredient.mockResolvedValue(row);
    ingredientDetailOf.mockResolvedValue({
      ...entryDetail(),
      entry: row,
      ...detail,
      variants: [{ variant, icon: null, categories: [], substitutes: [], references: [] }],
    });
    viewerOf.mockResolvedValue({
      viewer: { name: 'Fixture Member', canCurate: false },
      workspaces: [],
    });
    renderPage(await Page(params()));
  };
  const stock = () => screen.queryByRole('region', { name: 'Stock' });
  // The heading's button and the one jar's, each named for the ingredient; none for a viewer.
  const editStock = () => screen.queryAllByRole('button', { name: /^Edit Stock\b/ });

  it('asks for this coven’s jars of the entry alone, and lists them under Stock for a held entry', async () => {
    getCupboardEntry.mockResolvedValue(HELD_ROW);
    await withRoot(compendiumRow());

    expect(stockOf).toHaveBeenCalledWith(SESSION, [
      { ingredientId: compendiumRow().id, workspaceId: WORKSPACE.id },
    ]);
    expect(within(stock()!).getByRole('listitem')).toHaveTextContent('5 g');
    expect(editStock()).toHaveLength(2);
  });

  it('draws no Stock for a compendium entry the coven does not hold, though the jars were read', async () => {
    await withRoot(compendiumRow());

    // Precondition: there was a jar to show, so the section is absent by the guard alone.
    expect(stockOf).toHaveBeenCalled();
    expect(stock()).not.toBeInTheDocument();
  });

  it('shows a viewer the coven’s own entry’s jars and no Edit Stock', async () => {
    asRole('viewer');
    await withRoot(covenRow());

    expect(within(stock()!).getByRole('listitem')).toHaveTextContent('5 g');
    expect(editStock()).toHaveLength(0);
  });
});

// Edit Stock in the three dots is offered from the same jars and forms the Stock section
// draws, so a held entry's page reads them once.
describe('the coven ingredient page’s Edit Stock', () => {
  const VARIANT_ID = '00000000-0000-4000-8000-0000000000c1';
  // One form, Testroot, and no jar yet: the dots are offered from the forms alone.
  const withForm = async (row: ReturnType<typeof compendiumRow>, detail: object = {}) => {
    const variant = { id: VARIANT_ID, ingredientId: row.id, workspaceId: null, form: 'testroot' };
    getIngredient.mockResolvedValue(row);
    ingredientDetailOf.mockResolvedValue({
      ...entryDetail(),
      entry: row,
      ...detail,
      variants: [{ variant, icon: null, categories: [], substitutes: [], references: [] }],
    });
    viewerOf.mockResolvedValue({
      viewer: { name: 'Fixture Member', canCurate: false },
      workspaces: [],
    });
    renderPage(await Page(params()));
  };
  const held = () => getCupboardEntry.mockResolvedValue(HELD_ROW);
  // The dots on the heading are the cupboard's menu; Edit Stock is among their choices.
  const stockItem = () => {
    const dots = screen.queryByRole('button', { name: /^More for\b/ });
    if (dots) fireEvent.click(dots);
    return screen.queryByRole('menuitem', { name: 'Edit Stock' });
  };

  it('offers Edit Stock for a compendium entry the coven holds', async () => {
    held();
    await withForm(compendiumRow());

    expect(stockItem()).toBeInTheDocument();
  });

  it("offers Edit Stock for the coven's own entry", async () => {
    await withForm(covenRow());

    expect(stockItem()).toBeInTheDocument();
  });

  it('offers no Edit Stock for a compendium entry the coven does not hold', async () => {
    await withForm(compendiumRow());

    // Why it could have been offered: the jars were read and the role may update stock.
    expect(stockOf).toHaveBeenCalled();
    expect(stockItem()).toBeNull();
  });

  // A retired entry reads its forms through the coven's cupboard entry, so the detail
  // carries them for the coven that holds it and none for one that does not.
  const retired = (cupboardEntry: typeof HELD_ROW | null) => {
    getCupboardEntry.mockResolvedValue(cupboardEntry);
    return withForm(compendiumRow(), { retired: true, cupboardEntry });
  };

  it('offers Edit Stock for a retired entry the coven still holds', async () => {
    await retired({ ...HELD_ROW });

    expect(stockItem()).toBeInTheDocument();
  });

  it('offers no Edit Stock for a retired entry the coven does not hold', async () => {
    await retired(null);

    // Why it could have been offered: the jars were read, the role may update stock, and the
    // detail carries a form.
    expect(stockOf).toHaveBeenCalled();
    expect(stockItem()).toBeNull();
  });

  it('offers no Edit Stock to a viewer, who may not update stock', async () => {
    asRole('viewer');
    held();
    await withForm(compendiumRow());

    expect(stockOf).toHaveBeenCalled();
    expect(stockItem()).toBeNull();
  });
});

// The coven switcher stays on this page when the next coven opens it. Which covens do is the
// service's, per viewer; the page asks it once and passes the slugs up to the switcher.
describe('the coven ingredient page’s coven switch', () => {
  const ADDRESS = `/coven/${WORKSPACE.slug}/ingredients/${ID}`;

  it('tells the switcher the covens the service says the entry opens in, at its own address', async () => {
    const row = compendiumRow();
    covensOpeningEntry.mockResolvedValue([
      { id: WORKSPACE.id, slug: WORKSPACE.slug, name: WORKSPACE.name },
      { id: 'w-testwort', slug: 'testwort-circle', name: 'Testwort Circle' },
    ]);

    await open(row);

    expect(covensOpeningEntry).toHaveBeenCalledExactlyOnceWith(SESSION, row);
    expect(registered()).toEqual({ path: ADDRESS, slugs: [WORKSPACE.slug, 'testwort-circle'] });
  });

  it("names only this coven for the coven's own entry, as the service answers it", async () => {
    covensOpeningEntry.mockResolvedValue([
      { id: WORKSPACE.id, slug: WORKSPACE.slug, name: WORKSPACE.name },
    ]);

    await open(covenRow());

    expect(registered()).toEqual({ path: ADDRESS, slugs: [WORKSPACE.slug] });
  });

  it('asks nothing and registers nothing when the entry is refused', async () => {
    getIngredient.mockRejectedValue(new NotFound('ingredient'));

    await expect(Page(params())).rejects.toThrow('not-found');

    expect(covensOpeningEntry).not.toHaveBeenCalled();
  });
});
