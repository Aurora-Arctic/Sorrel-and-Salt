import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadCompendiumEntryForm } from '@/components/CompendiumEntryForm/lazy';
import type { IngredientFormValues } from '@/components/IngredientForm/types';
import { EMPTY_VALUES, EMPTY_VARIANT } from '@/components/IngredientForm/values';
import { NotFound } from '@/lib/errors';
import { encodeCursor } from '@/lib/pagination';
import type { PageRequest } from '@/lib/types';
import { entryDetail } from '../../../../support/entry-detail';
import { router } from '../../../../support/next-navigation';
import { renderWithQuery } from '../../../../support/render-with-query';
import { getSession, requireCuratorSession } from '../../../../support/request-session';

// The form loads on first use; loading it once up front keeps each test off a cold import.
beforeAll(async () => {
  await loadCompendiumEntryForm();
});

vi.mock('@/lib/request-session', () => import('../../../../support/request-session'));

vi.mock('@/lib/viewer', () => ({
  viewerIfSignedIn: async () => undefined,
  covenRolesIfSignedIn: async () => undefined,
}));

const editorStamps = vi.fn(async (_session: unknown, rows: readonly unknown[]) =>
  rows.map(() => ({ updatedBy: 'Fixture Editor', updatedAt: new Date('2026-05-06T10:00:00Z') })),
);
vi.mock('@/app/(shell)/curator/editors', () => ({ editorStamps }));

const readCardCategories = vi.fn(async (ids: readonly string[]) =>
  ids.map((id) => [
    {
      category: { id: `${id}-c`, name: 'Testward' },
      group: { colorDark: '#000', colorLight: '#fff' },
    },
  ]),
);
vi.mock('@/app/compendium-reads', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/app/compendium-reads')>()),
  readCardCategories,
}));

const listCompendium = vi.fn();
const countCompendium = vi.fn();
const resolveCompendiumSlug = vi.fn();
const readSourcingScore = vi.fn(async () => null);
const variantsOf = vi.fn();
const ingredientDetailOf = vi.fn();
const compendiumFacets = vi.fn();
const covensHoldingEntry = vi.fn();
const readCompendiumReview = vi.fn();
const getIngredient = vi.fn();
vi.mock('@/modules/ingredients', () => ({
  MAKE_IT_OURS_PERMISSION: { ingredient: ['create', 'delete'], inventory: ['update'] },
  readSourcingScore,
  readCompendiumReview,
  getIngredient,
  listCompendium,
  countCompendium,
  compendiumFacets,
  resolveCompendiumSlug,
  variantsOf,
  ingredientDetailOf,
  covensHoldingEntry,
}));

const listIngredientFormValues = vi.fn();
const formChoicesOf = vi.fn();
const formGroupsOf = vi.fn();
const listCategories = vi.fn();
const categoryGroupsOf = vi.fn();
const listDeities = vi.fn();
const listDeityTraditions = vi.fn();
vi.mock('@/modules/vocabulary', () => ({
  listIngredientFormValues,
  formChoicesOf,
  formGroupsOf,
  listCategories,
  categoryGroupsOf,
  listDeities,
  listDeityTraditions,
}));

const entryValues = vi.fn();
vi.mock('@/app/entry-values', () => ({ entryValues }));

const formProps = vi.fn();
vi.mock('@/components/IngredientForm', () => ({
  default: (props: { onDeleted: () => void; review?: { reviewed: boolean } }) => {
    formProps(props);
    return (
      <form aria-label="Fixture Form">
        {props.review && (
          <input
            type="checkbox"
            role="switch"
            aria-label="Reviewed"
            defaultChecked={props.review.reviewed}
          />
        )}
        <button type="button" onClick={props.onDeleted}>
          Fixture Delete
        </button>
      </form>
    );
  },
}));
const formEntry = (): unknown => (formProps.mock.lastCall?.[0] as { entry?: unknown })?.entry;

// `redirect` throws in Next, ending the render; so does this one, recognisably.
const REDIRECTED = 'NEXT_REDIRECT';
const redirect = vi.fn((href: string) => {
  throw new Error(`${REDIRECTED} ${href}`);
});
vi.mock('next/navigation', async () => ({
  ...(await import('../../../../support/next-navigation')),
  redirect,
}));

const { default: AdminCompendiumPage } = await import('@/app/(shell)/curator/compendium/page');

const EDITING_TESTWORT = 'Edit Ingredient, Testwort, Fixtura testalis';

const ADMIN = { userId: '6f1c2d4e-9b8a-4c3d-8e7f-0a1b2c3d4e5f', role: 'admin' } as const;

const TESTWORT = {
  id: '3f0d6a52-8c1e-4b7a-9e25-6d4c2b1a0f93',
  workspaceId: null,
  name: 'Testwort',
  slug: 'testwort-fixtura-testalis',
  canonicalName: 'Fixtura testalis',
  nomenclature: 'botanical',
  revision: 1,
  updatedAt: new Date('2026-03-04T05:06:07.000Z'),
};

const TESTWORT_VALUES: IngredientFormValues = {
  ...EMPTY_VALUES,
  name: 'Testwort',
  nomenclature: 'botanical',
  canonicalName: 'Fixtura testalis',
  variants: [{ ...EMPTY_VARIANT, form: 'Herb' }],
};

const entry = <T extends { id: string; name: string }>(node: T) => ({
  node,
  cursor: { key: [node.name], id: node.id },
});

const fullPage = () =>
  Array.from({ length: 26 }, (_, index) =>
    entry({
      ...TESTWORT,
      id: `${TESTWORT.id.slice(0, -2)}${String(index).padStart(2, '0')}`,
      name: `Testwort ${index}`,
      slug: `testwort-${index}`,
    }),
  );

async function renderPage(params: Record<string, string | string[]> = {}) {
  const page = await AdminCompendiumPage({ searchParams: Promise.resolve(params) });
  renderWithQuery(page);
}

async function readPage(params: Record<string, string | string[]> = {}) {
  await AdminCompendiumPage({ searchParams: Promise.resolve(params) });
}

const lastRequest = (): PageRequest => listCompendium.mock.lastCall?.[1] as PageRequest;

function lastFilter(): unknown {
  const listed = (listCompendium.mock.lastCall?.[0] ?? {}) as {
    listing?: string;
    withSourcingScore?: boolean;
  };
  expect(countCompendium.mock.lastCall?.[0]).toEqual(listed);
  expect(listed.withSourcingScore).toBe(true);
  const { listing: _listing, withSourcingScore: _score, ...rest } = listed;
  return rest;
}

function facetFilter(): unknown {
  const { withSourcingScore: _score, ...rest } = (listCompendium.mock.lastCall?.[0] ?? {}) as {
    withSourcingScore?: boolean;
  };
  return rest;
}

const lastListing = () =>
  ((listCompendium.mock.lastCall?.[0] ?? {}) as { listing?: string }).listing;

// A blank is left out of the variables, so no filter is no variables.
const NO_FILTER = {};

const FILTERED = {
  query: 'test',
  forms: ['Fixture Oil', 'Fixture Powder'],
  withoutReferences: '1',
  withoutForms: '1',
  elements: ['fire', 'earth'],
};
const FILTERED_HREF =
  '/curator/compendium?query=test&forms=Fixture+Oil&forms=Fixture+Powder&withoutReferences=1&withoutForms=1&elements=fire&elements=earth';

const curatedForm = (name: string, index: number) =>
  entry({ id: `form-${index}`, name, slug: name.toLowerCase().replace(/ /g, '-') });

const NO_FACETS = {
  forms: [],
  deities: [],
  categories: [],
  zodiacSigns: [],
  celestialBodies: [],
  elements: [],
  toxic: [],
  withoutReferences: 0,
  withoutForms: 0,
};
const FORM_COUNTS = [
  { value: 'Fixture Oil', count: 2 },
  { value: 'Fixture Powder', count: 1 },
];

const WARDS = {
  id: 'g-ward',
  name: 'Fixture Wards',
  colorDark: '#4e8bc2',
  colorLight: '#0c5393',
};
const CATEGORY_ROWS = [
  { id: 'c-tw', slug: 'testward', name: 'Testward', description: null, groupId: WARDS.id },
  { id: 'c-tc', slug: 'testcraft', name: 'Testcraft', description: null, groupId: WARDS.id },
];

beforeEach(() => {
  requireCuratorSession.mockReset();
  requireCuratorSession.mockResolvedValue(ADMIN);
  getSession.mockResolvedValue(ADMIN);
  listCompendium.mockReset();
  listCompendium.mockResolvedValue([entry(TESTWORT)]);
  countCompendium.mockReset();
  countCompendium.mockResolvedValue({ totalCount: 1, countBefore: 0 });
  resolveCompendiumSlug.mockReset();
  resolveCompendiumSlug.mockResolvedValue({ kind: 'entry', entry: TESTWORT, movedAway: null });
  readCompendiumReview.mockReset();
  readCompendiumReview.mockResolvedValue(null);
  getIngredient.mockReset();
  getIngredient.mockResolvedValue({ ...TESTWORT, shown: true });
  ingredientDetailOf.mockReset();
  ingredientDetailOf.mockResolvedValue({
    ...entryDetail({ safetyNotes: 'Fixture admin caution.' }),
    folkNames: ['Fixture Adminbane'],
  });
  variantsOf.mockReset();
  variantsOf.mockImplementation(async (_session: unknown, refs: unknown[]) =>
    refs.map(() => [{ form: 'Herb' }]),
  );
  formChoicesOf.mockReset();
  formChoicesOf.mockImplementation(async (ids: string[]) => ids.map(() => null));
  formGroupsOf.mockReset();
  formGroupsOf.mockImplementation(async (ids: string[]) => ids.map(() => new Error('none')));
  listIngredientFormValues.mockReset();
  listIngredientFormValues.mockResolvedValue(['Fixture Oil', 'Fixture Powder'].map(curatedForm));
  compendiumFacets.mockReset();
  compendiumFacets.mockResolvedValue({ ...NO_FACETS, forms: FORM_COUNTS });
  listDeities.mockReset();
  listDeities.mockResolvedValue([]);
  listDeityTraditions.mockReset();
  listDeityTraditions.mockResolvedValue([]);
  listCategories.mockReset();
  listCategories.mockResolvedValue(CATEGORY_ROWS.map(entry));
  categoryGroupsOf.mockReset();
  categoryGroupsOf.mockImplementation(async (ids: string[]) => ids.map(() => WARDS));
  entryValues.mockReset();
  entryValues.mockResolvedValue(TESTWORT_VALUES);
  covensHoldingEntry.mockResolvedValue([]);
  formProps.mockClear();
  redirect.mockClear();
  router.replace.mockClear();
});

describe('the /curator/compendium page', () => {
  it('asks the admin guard, and reads nothing when it refuses', async () => {
    requireCuratorSession.mockRejectedValue(new Error('forbidden'));

    await expect(renderPage()).rejects.toThrow('forbidden');
    expect(requireCuratorSession).toHaveBeenCalledOnce();
    expect(listCompendium).not.toHaveBeenCalled();
    expect(countCompendium).not.toHaveBeenCalled();
  });

  it('lists the first page of 25, each entry with its formal name and its forms, and no modal', async () => {
    await renderPage();

    expect(requireCuratorSession).toHaveBeenCalledOnce();
    expect(lastRequest()).toEqual({ limit: 26, inverted: false });
    expect(lastFilter()).toEqual(NO_FILTER);
    expect(lastListing()).toBe('all');
    expect(variantsOf).toHaveBeenCalledExactlyOnceWith(null, [
      { id: TESTWORT.id, workspaceId: null },
    ]);
    expect(readCardCategories).toHaveBeenCalledExactlyOnceWith([TESTWORT.id]);
    const row = within(screen.getByRole('table')).getAllByRole('row')[1];
    expect(within(row).getByRole('list', { name: 'Categories' })).toBeInTheDocument();
    expect(within(row).getByRole('link', { name: 'Testwort' })).toBeInTheDocument();
    expect(within(row).getByRole('cell', { name: 'Fixtura testalis' })).toBeInTheDocument();
    expect(within(row).getByRole('cell', { name: 'Herb' })).toBeInTheDocument();
    expect(
      within(row).getByRole('link', { name: 'Edit Testwort, Fixtura testalis' }),
    ).toHaveAttribute('href', `/curator/compendium?edit=${TESTWORT.slug}`);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(resolveCompendiumSlug).not.toHaveBeenCalled();
  });
});

describe('the /curator/compendium filter', () => {
  it('reads ?query= trimmed, a repeated ?forms= as a list and ?withoutReferences=1 into the list and its count', async () => {
    await readPage({
      query: '  test wort ',
      forms: [' Fixture Oil ', 'Fixture Powder', 'fixture oil'],
      withoutReferences: '1',
    });

    expect(lastFilter()).toEqual({
      query: 'test wort',
      forms: ['Fixture Oil', 'Fixture Powder'],
      withoutReferences: true,
    });
  });

  // The facets are the choices' counts, so they are read under the filter the
  // list is: a count under another filter would count rows the list does not hold.
  it('counts the facets under the same filter as the list and its count', async () => {
    await readPage({ query: 'test', forms: 'Fixture Oil', toxic: 'toxic' });

    expect(compendiumFacets).toHaveBeenCalledExactlyOnceWith(facetFilter(), ADMIN);
    expect(lastFilter()).toEqual({ query: 'test', forms: ['Fixture Oil'], toxic: 'toxic' });
  });

  it('reads ?reviewed= into the filter, passed with the session to the list, its count and the facets', async () => {
    await readPage({ reviewed: '1' });
    expect(lastFilter()).toEqual({ reviewed: true });
    expect(listCompendium.mock.lastCall?.[listCompendium.mock.lastCall.length - 1]).toEqual(ADMIN);
    expect(compendiumFacets).toHaveBeenCalledExactlyOnceWith(
      { reviewed: true, listing: 'all' },
      ADMIN,
    );
  });

  it('turns ?categories= slugs into the ids of the live categories, for the list and its count', async () => {
    await renderPage({ categories: ['testward', 'testcraft'] });

    expect(lastFilter()).toEqual({ categoryIds: ['c-tw', 'c-tc'] });
    expect(screen.getByRole('link', { name: 'Add Ingredient' })).toHaveAttribute(
      'href',
      '/curator/compendium?categories=testward&categories=testcraft&new=ingredient-compendium',
    );
  });

  it('reads the categories past their first page, with each one group read once for all', async () => {
    const many = Array.from({ length: 101 }, (_, index) => ({
      id: `c-${index}`,
      slug: `testcat-${index}`,
      name: `Testcat ${index}`,
      description: null,
      groupId: WARDS.id,
    }));
    listCategories.mockImplementation(async (_filter: unknown, request: PageRequest) => {
      const start = request.after
        ? many.findIndex((row) => row.id === (request.after as { id: string }).id) + 1
        : 0;
      return many.slice(start, start + request.limit).map(entry);
    });

    await readPage({ categories: 'testcat-100' });

    expect(lastFilter()).toEqual({ categoryIds: ['c-100'] });
    expect(categoryGroupsOf).toHaveBeenCalledOnce();
  });

  // 84 forms are seeded against a page of at most 100, so one page is not a
  // safe assumption for the icons the choices wear: the read walks on while
  // there are more.
  it('reads the curated forms past their first page, for their icons', async () => {
    const forms = Array.from({ length: 101 }, (_, index) =>
      curatedForm(`Fixture Form ${String(index).padStart(3, '0')}`, index),
    );
    listIngredientFormValues.mockImplementation(async (_filter: unknown, request: PageRequest) => {
      const start = request.after
        ? forms.findIndex(({ node }) => node.id === request.after?.id) + 1
        : 0;
      return forms.slice(start, start + request.limit);
    });

    await renderPage();

    expect(listIngredientFormValues).toHaveBeenCalledTimes(2);
    expect(listIngredientFormValues.mock.lastCall?.[1]).toMatchObject({ after: forms[99].cursor });
  });

  it('keeps the filter on each Edit, the pager and Add Ingredient', async () => {
    const after = encodeCursor({ key: ['Testwort'], id: TESTWORT.id });
    listCompendium.mockResolvedValue(fullPage());
    countCompendium.mockResolvedValue({ totalCount: 63, countBefore: 25 });

    await renderPage({ ...FILTERED, after });

    const here = `${FILTERED_HREF}&after=${encodeURIComponent(after)}`;
    expect(screen.getByRole('link', { name: 'Add Ingredient' })).toHaveAttribute(
      'href',
      `${here}&new=ingredient-compendium`,
    );
    expect(screen.getByRole('link', { name: 'Edit Testwort 0, Fixtura testalis' })).toHaveAttribute(
      'href',
      `${here}&edit=testwort-0`,
    );
    const pages = screen.getByRole('navigation', { name: 'Pages' });
    expect(within(pages).getByRole('link', { name: 'Prev' }).getAttribute('href')).toMatch(
      /^\/curator\/compendium\?query=test&forms=Fixture\+Oil&forms=Fixture\+Powder&withoutReferences=1&withoutForms=1&elements=fire&elements=earth&before=[^&]+$/,
    );
    expect(within(pages).getByRole('link', { name: 'Next' }).getAttribute('href')).toMatch(
      /^\/curator\/compendium\?query=test&forms=Fixture\+Oil&forms=Fixture\+Powder&withoutReferences=1&withoutForms=1&elements=fire&elements=earth&after=[^&]+$/,
    );
  });
});

describe('the /curator/compendium modal', () => {
  // A bare `?new` is an older link's, read as `ingredient-compendium` so it still opens.
  it.each(['ingredient-compendium', ''])(
    'opens the form on ?new=%s with no entry',
    async (value) => {
      await renderPage({ new: value });

      const dialog = screen.getByRole('dialog', { name: 'Add Ingredient to Compendium' });
      expect(within(dialog).getByRole('form', { name: 'Fixture Form' })).toBeInTheDocument();
      expect(formEntry()).toBeUndefined();
      expect(resolveCompendiumSlug).not.toHaveBeenCalled();
    },
  );

  // The shell's Add Ingredient opens over any page by `?new`, so its values are not
  // this page's: the list draws, with no dialog of its own and no edit beneath.
  it.each(['ingredient-coven-fixture-coven', 'ingredient'])(
    'opens no dialog of its own on ?new=%s, the shell’s Add Ingredient, holding an ?edit= back',
    async (value) => {
      await renderPage({ new: value, edit: TESTWORT.slug });

      expect(screen.getByRole('link', { name: 'Add Ingredient' })).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(entryValues).not.toHaveBeenCalled();
    },
  );

  it('opens the empty form on ?new beside an ?edit=, reading no entry', async () => {
    await renderPage({ new: 'ingredient-compendium', edit: TESTWORT.slug });

    expect(
      screen.getByRole('dialog', { name: 'Add Ingredient to Compendium' }),
    ).toBeInTheDocument();
    expect(resolveCompendiumSlug).not.toHaveBeenCalled();
    expect(entryValues).not.toHaveBeenCalled();
  });

  // The dialog is named by the entry as saved, which the page computes from the
  // values it read, so a change in the form cannot reach it.
  it("opens an entry's form on ?edit=, handed its values, in a dialog named by the entry", async () => {
    await renderPage({ edit: TESTWORT.slug });

    expect(resolveCompendiumSlug).toHaveBeenCalledWith(TESTWORT.slug, expect.anything());
    expect(entryValues).toHaveBeenCalledWith(TESTWORT, null);
    const dialog = screen.getByRole('dialog', { name: EDITING_TESTWORT });
    expect(within(dialog).getByRole('form', { name: 'Fixture Form' })).toBeInTheDocument();
    expect(formEntry()).toEqual({
      id: TESTWORT.id,
      values: TESTWORT_VALUES,
      revision: TESTWORT.revision,
      updatedAt: TESTWORT.updatedAt.toISOString(),
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('sends an old slug on to the entry at its new one, keeping the filter', async () => {
    resolveCompendiumSlug.mockResolvedValue({ kind: 'moved', slug: 'testwort-root' });

    await expect(renderPage({ ...FILTERED, edit: 'testwort-herb' })).rejects.toThrow(REDIRECTED);

    expect(resolveCompendiumSlug).toHaveBeenCalledWith('testwort-herb', expect.anything());
    expect(redirect).toHaveBeenCalledExactlyOnceWith(`${FILTERED_HREF}&edit=testwort-root`);
    expect(entryValues).not.toHaveBeenCalled();
  });

  it('says so, and opens nothing, when ?edit= names no entry', async () => {
    resolveCompendiumSlug.mockRejectedValue(new NotFound('No such compendium entry'));

    await renderPage({ edit: 'gone' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(redirect).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeVisible();
  });

  it('lets any other failure of the read through, rather than calling it no entry', async () => {
    resolveCompendiumSlug.mockRejectedValue(new Error('connection lost'));

    await expect(renderPage({ edit: TESTWORT.slug })).rejects.toThrow('connection lost');
  });

  it('closes the modal back to the filtered page it opened over', async () => {
    await renderPage({ ...FILTERED, edit: TESTWORT.slug });

    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Close' }));

    expect(router.replace).toHaveBeenCalledWith(FILTERED_HREF, { scroll: false });
  });
});

describe('the /curator/compendium details modal', () => {
  const DETAILS_TESTWORT = 'Testwort';
  const ON_DETAILS = `${FILTERED_HREF}&entry=${TESTWORT.slug}`;
  const details = () => screen.getByRole('dialog', { name: DETAILS_TESTWORT });
  // The details body loads on first use, so each test waits for its head before looking inside.
  const loaded = async () => {
    await screen.findByRole('link', { name: 'See in Compendium' });
    return details();
  };

  it("opens an entry's details on ?entry=, with its full page and an Edit over them", async () => {
    await renderPage({ ...FILTERED, entry: TESTWORT.slug });

    expect(resolveCompendiumSlug).toHaveBeenCalledWith(TESTWORT.slug, expect.anything());
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(within(await loaded()).getByRole('link', { name: 'See in Compendium' })).toHaveAttribute(
      'href',
      `/compendium/ingredients/${TESTWORT.slug}`,
    );
    expect(within(await loaded()).getByRole('link', { name: /^Edit\b/ })).toHaveAttribute(
      'href',
      `${ON_DETAILS}&edit=${TESTWORT.slug}`,
    );
    expect(entryValues).not.toHaveBeenCalled();
  });

  it("shows the entry's sections in the details, read with the curator's session", async () => {
    await renderPage({ ...FILTERED, entry: TESTWORT.slug });

    expect(ingredientDetailOf).toHaveBeenCalledExactlyOnceWith(ADMIN, TESTWORT);
    expect(
      within(within(await loaded()).getByRole('region', { name: 'Caution' })).getByText(
        'Fixture admin caution.',
      ),
    ).toBeInTheDocument();
    expect(
      within(within(await loaded()).getByRole('list', { name: 'Folk Names' })).getByText(
        'Fixture Adminbane',
      ),
    ).toBeInTheDocument();
  });

  it("shows the entry's review mark in the details, read with the curator's session", async () => {
    readCompendiumReview.mockResolvedValue({ reviewedAt: new Date('2026-10-01T09:30:00.000Z') });
    await renderPage({ ...FILTERED, entry: TESTWORT.slug });

    expect(readCompendiumReview).toHaveBeenCalledExactlyOnceWith(ADMIN, TESTWORT.id);
    expect(within(await loaded()).getByRole('switch', { name: 'Reviewed' })).toBeChecked();
  });

  it("shows the switch above the edit form's buttons, for the entry it edits", async () => {
    readCompendiumReview.mockResolvedValue({ reviewedAt: new Date('2026-10-01T09:30:00.000Z') });
    await renderPage({ ...FILTERED, edit: TESTWORT.slug });

    expect(readCompendiumReview).toHaveBeenCalledExactlyOnceWith(ADMIN, TESTWORT.id);
    const dialog = screen.getByRole('dialog', { name: EDITING_TESTWORT });
    expect(within(dialog).getByRole('switch', { name: 'Reviewed' })).toBeChecked();
  });

  it('offers the switch on an add form, unreviewed, with no review read', async () => {
    await renderPage({ ...FILTERED, new: 'ingredient-compendium' });

    expect(screen.getByRole('switch', { name: 'Reviewed' })).not.toBeChecked();
    expect(readCompendiumReview).not.toHaveBeenCalled();
  });

  it('shows an entry with no mark as needing review', async () => {
    await renderPage({ ...FILTERED, entry: TESTWORT.slug });

    expect(within(await loaded()).getByRole('switch', { name: 'Reviewed' })).not.toBeChecked();
  });

  it("reads no entry's sections when no details are open", async () => {
    await renderPage(FILTERED);

    // Why it could read: the list holds the entry.
    expect(screen.getAllByRole('row')).toHaveLength(2);
    expect(ingredientDetailOf).not.toHaveBeenCalled();
    expect(covensHoldingEntry).not.toHaveBeenCalled();
    expect(readCompendiumReview).not.toHaveBeenCalled();
  });

  it("lists the curator's own covens that hold the entry in the details, read with the curator's session", async () => {
    covensHoldingEntry.mockResolvedValue([
      { id: 'w-fixture', slug: 'fixture-coven', name: 'Fixture Coven' },
    ]);
    await renderPage({ ...FILTERED, entry: TESTWORT.slug });

    expect(covensHoldingEntry).toHaveBeenCalledExactlyOnceWith(ADMIN, TESTWORT.id);
    const covens = within(await loaded()).getByRole('list', { name: 'In Your Cupboards' });
    expect(within(covens).getByRole('link', { name: 'Fixture Coven' })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/coven\/fixture-coven\/ingredients\//),
    );
  });

  it("links each name to its details, keeping the filter, and each row's Edit to no details", async () => {
    await renderPage({ ...FILTERED, entry: TESTWORT.slug });

    const row = screen.getAllByRole('row')[1];
    expect(within(row).getByRole('link', { name: 'Testwort' })).toHaveAttribute(
      'href',
      `/compendium/ingredients/${TESTWORT.slug}`,
    );
    expect(
      within(row).getByRole('link', { name: EDITING_TESTWORT.replace(' Ingredient,', '') }),
    ).toHaveAttribute('href', `${FILTERED_HREF}&edit=${TESTWORT.slug}`);
    await loaded();
  });

  it('closes the details back to the filtered page they opened over', async () => {
    await renderPage({ ...FILTERED, entry: TESTWORT.slug });

    fireEvent.click(within(await loaded()).getByRole('button', { name: 'Close' }));

    expect(router.replace).toHaveBeenCalledWith(FILTERED_HREF, { scroll: false });
  });

  it('opens the edit modal over the details on ?entry= with ?edit=, and its Close goes back to them', async () => {
    await renderPage({ ...FILTERED, entry: TESTWORT.slug, edit: TESTWORT.slug });

    expect(screen.getAllByRole('dialog')).toHaveLength(2);
    expect(details()).toBeInTheDocument();
    await loaded();
    const editing = screen.getByRole('dialog', { name: EDITING_TESTWORT });

    fireEvent.click(within(editing).getByRole('button', { name: 'Close' }));

    expect(router.replace).toHaveBeenCalledWith(ON_DETAILS, { scroll: false });
  });

  it('opens the details over an add form on ?entry= with ?new, closing back to the form, with no Edit', async () => {
    await renderPage({ ...FILTERED, new: 'ingredient-compendium', entry: TESTWORT.slug });

    // Why it could have an Edit: the details alone carry one.
    expect(screen.getAllByRole('dialog')).toHaveLength(2);
    expect(within(await loaded()).queryByRole('link', { name: /^Edit\b/ })).not.toBeInTheDocument();

    fireEvent.click(within(await loaded()).getByRole('button', { name: 'Close' }));

    expect(router.replace).toHaveBeenCalledWith(`${FILTERED_HREF}&new=ingredient-compendium`, {
      scroll: false,
    });
  });

  it("opens the details over another entry's edit form with no Edit, closing back to that form", async () => {
    await renderPage({ ...FILTERED, entry: TESTWORT.slug, edit: 'fixture-other' });

    expect(within(await loaded()).queryByRole('link', { name: /^Edit\b/ })).not.toBeInTheDocument();

    fireEvent.click(within(await loaded()).getByRole('button', { name: 'Close' }));

    expect(router.replace).toHaveBeenCalledWith(`${FILTERED_HREF}&edit=fixture-other`, {
      scroll: false,
    });
  });

  it('closes a stacked edit back to the list, not the details, once it has deleted the entry', async () => {
    await renderPage({ ...FILTERED, entry: TESTWORT.slug, edit: TESTWORT.slug });
    const editing = screen.getByRole('dialog', { name: EDITING_TESTWORT });

    fireEvent.click(within(editing).getByRole('button', { name: 'Fixture Delete' }));

    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith(FILTERED_HREF, { scroll: false }),
    );
    expect(router.replace).not.toHaveBeenCalledWith(ON_DETAILS);
  });

  it('sends an old ?entry= slug on to the entry at its new one, keeping the filter and the edit', async () => {
    resolveCompendiumSlug.mockImplementation(async (slug: string) =>
      slug === 'testwort-herb'
        ? { kind: 'moved', slug: TESTWORT.slug }
        : { kind: 'entry', entry: TESTWORT, movedAway: null },
    );

    await expect(
      renderPage({ ...FILTERED, entry: 'testwort-herb', edit: TESTWORT.slug }),
    ).rejects.toThrow(REDIRECTED);

    expect(redirect).toHaveBeenCalledExactlyOnceWith(`${ON_DETAILS}&edit=${TESTWORT.slug}`);
  });

  it('says so, and opens nothing, when ?entry= names no entry', async () => {
    resolveCompendiumSlug.mockRejectedValue(new NotFound('No such compendium entry'));

    await renderPage({ entry: 'gone' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeVisible();
  });
});
