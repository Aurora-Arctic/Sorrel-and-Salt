import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FormIcon from '@/components/FormIcon';
import type { IngredientFormValues } from '@/components/IngredientForm/types';
import { EMPTY_VALUES, EMPTY_VARIANT } from '@/components/IngredientForm/values';
import { NotFound } from '@/lib/errors';
import { makeQueryClient } from '@/lib/graphql-client';
import { encodeCursor } from '@/lib/pagination';
import type { PageRequest } from '@/lib/types';
import { mockGraphQLMutation, mockGraphQLQuery } from '../../../../support/msw/graphql';
import { offerCategories } from '../../../../support/msw/ingredient-lookups';
import { openSections } from '../../../../support/ingredient-sections';
import { sent } from '../../../../support/filter-form';

// The `/admin/compendium` page (M5.5): the guard, one page of the compendium
// under the address's filter, and the modal its address opens — `?new` empty,
// `?edit=` an entry by slug, an old slug sent on to the new one. The guard,
// the services and the entry's values are mocked: what they decide is
// tests/lib/request-session.test.ts's, the compendium services' tests', and
// tests/db/entry-values.test.ts's.

const requireCuratorSession = vi.fn();
vi.mock('@/lib/request-session', () => ({ requireCuratorSession }));

// The editors' names are `editorStamps`'s, tested in tests/app/(shell)/admin/editors.test.ts.
const editorStamps = vi.fn(async (_session: unknown, rows: readonly unknown[]) =>
  rows.map(() => ({ updatedBy: 'Fixture Editor', updatedAt: new Date('2026-05-06T10:00:00Z') })),
);
vi.mock('@/app/(shell)/admin/editors', () => ({ editorStamps }));

// The categories are `readCardCategories`'s, tested with the public page; the page's part is
// asking once for the entries it lists and handing each its own.
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
const variantsOf = vi.fn();
// How many entries each filter's choices would list (M12.4), which also
// names the forms the Form box offers.
const compendiumFacets = vi.fn();
vi.mock('@/modules/ingredients', () => ({
  listCompendium,
  countCompendium,
  compendiumFacets,
  resolveCompendiumSlug,
  variantsOf,
}));

// The curated forms, read through the vocabulary module, and the two batches
// that give each listed form and each Form choice its group's icon (M12.7).
const listIngredientFormValues = vi.fn();
const formChoicesOf = vi.fn();
const formGroupsOf = vi.fn();
// ...and the live categories with their groups, which the Categories box offers
// and the address's slugs are turned into ids against (M8.11).
const listCategories = vi.fn();
const categoryGroupsOf = vi.fn();
// ...and the live deities with their traditions, which the address's deity
// slugs are turned into ids against (M12.4).
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

// `redirect` throws in Next, ending the render; so does this one, recognisably.
const REDIRECTED = 'NEXT_REDIRECT';
const redirect = vi.fn((href: string) => {
  throw new Error(`${REDIRECTED} ${href}`);
});
const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router, redirect }));

const { default: AdminCompendiumPage } = await import('@/app/(shell)/admin/compendium/page');

/** The edit dialog's name: its eyebrow, then the entry and its formal name (MB.115). */
const EDITING_TESTWORT = 'Edit Ingredient, Testwort, Fixtura testalis';

const ADMIN = { userId: '6f1c2d4e-9b8a-4c3d-8e7f-0a1b2c3d4e5f', role: 'admin' } as const;

const TESTWORT = {
  id: '3f0d6a52-8c1e-4b7a-9e25-6d4c2b1a0f93',
  workspaceId: null,
  name: 'Testwort',
  slug: 'testwort-fixtura-testalis',
  canonicalName: 'Fixtura testalis',
  nomenclature: 'botanical',
};

/** Testwort as the form edits it. */
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

/** A full page and one more, so the pager links both ways. */
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
  render(<QueryClientProvider client={makeQueryClient()}>{page}</QueryClientProvider>);
}

const lastRequest = (): PageRequest => listCompendium.mock.lastCall?.[1] as PageRequest;

/** The filter the list and its count were last read under, which must agree. */
function lastFilter(): unknown {
  const listed: unknown = listCompendium.mock.lastCall?.[0];
  expect(countCompendium.mock.lastCall?.[0]).toEqual(listed);
  return listed;
}

// A blank is left out of the variables, so no filter is no variables.
const NO_FILTER = {};

/** The filter every link below keeps, as the address spells it. */
const FILTERED = {
  query: 'test',
  forms: ['Fixture Oil', 'Fixture Powder'],
  withoutReferences: '1',
  withoutForms: '1',
  // Read from the address alone, with no control for it (M8.13).
  elements: ['fire', 'earth'],
};
const FILTERED_HREF =
  '/admin/compendium?query=test&forms=Fixture+Oil&forms=Fixture+Powder&withoutReferences=1&withoutForms=1&elements=fire&elements=earth';

/** A curated form as its service lists it, keyed by name as the finder pages it. */
const curatedForm = (name: string, index: number) =>
  entry({ id: `form-${index}`, name, slug: name.toLowerCase().replace(/ /g, '-') });

/** The service's counts when no entry carries anything. */
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
  listCompendium.mockReset();
  listCompendium.mockResolvedValue([entry(TESTWORT)]);
  countCompendium.mockReset();
  countCompendium.mockResolvedValue({ totalCount: 1, countBefore: 0 });
  resolveCompendiumSlug.mockReset();
  resolveCompendiumSlug.mockResolvedValue({ kind: 'entry', entry: TESTWORT, movedAway: null });
  // Every entry listed comes in one form, Herb.
  variantsOf.mockReset();
  variantsOf.mockImplementation(async (_session: unknown, refs: unknown[]) =>
    refs.map(() => [{ form: 'Herb' }]),
  );
  // A form that is only text has no curated row, so no icon.
  formChoicesOf.mockReset();
  formChoicesOf.mockImplementation(async (ids: string[]) => ids.map(() => null));
  formGroupsOf.mockReset();
  formGroupsOf.mockImplementation(async (ids: string[]) => ids.map(() => new Error('none')));
  // Two curated forms, on one page.
  listIngredientFormValues.mockReset();
  listIngredientFormValues.mockResolvedValue(['Fixture Oil', 'Fixture Powder'].map(curatedForm));
  // Two forms some entry carries, counted; nothing else is offered.
  compendiumFacets.mockReset();
  compendiumFacets.mockResolvedValue({ ...NO_FACETS, forms: FORM_COUNTS });
  // No deities until a test asks.
  listDeities.mockReset();
  listDeities.mockResolvedValue([]);
  listDeityTraditions.mockReset();
  listDeityTraditions.mockResolvedValue([]);
  // Two live categories, in one group.
  listCategories.mockReset();
  listCategories.mockResolvedValue(CATEGORY_ROWS.map(entry));
  categoryGroupsOf.mockReset();
  categoryGroupsOf.mockImplementation(async (ids: string[]) => ids.map(() => WARDS));
  entryValues.mockReset();
  entryValues.mockResolvedValue(TESTWORT_VALUES);
  redirect.mockClear();
  router.replace.mockClear();
  // An entry's form asks after near matches of the name it opens with.
  mockGraphQLQuery('PossibleDuplicates', () => ({ possibleDuplicates: { edges: [] } }));
  // ...and for the categories its Categories field suggests from.
  offerCategories([]);
});

describe('the /admin/compendium page', () => {
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
    // The page's forms, read in one batch for the entries it lists.
    expect(variantsOf).toHaveBeenCalledExactlyOnceWith(null, [
      { id: TESTWORT.id, workspaceId: null },
    ]);
    // The page's categories, read in one batch too, and the entry shows its own.
    expect(readCardCategories).toHaveBeenCalledExactlyOnceWith([TESTWORT.id]);
    const row = within(screen.getByRole('table')).getAllByRole('row')[1];
    expect(within(row).getByRole('list', { name: 'Categories' })).toBeInTheDocument();
    expect(within(row).getByRole('link', { name: 'Testwort' })).toBeInTheDocument();
    expect(within(row).getByRole('cell', { name: 'Fixtura testalis' })).toBeInTheDocument();
    expect(within(row).getByRole('cell', { name: 'Herb' })).toBeInTheDocument();
    expect(
      within(row).getByRole('link', { name: 'Edit Testwort, Fixtura testalis' }),
    ).toHaveAttribute('href', `/admin/compendium?edit=${TESTWORT.slug}`);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(resolveCompendiumSlug).not.toHaveBeenCalled();
  });

  it("draws each curated form's group icon in the Form column, and the generic for one that is only text", async () => {
    variantsOf.mockImplementation(async (_session: unknown, refs: unknown[]) =>
      refs.map(() => [
        { form: 'Fixture Shard', formId: 'form-1' },
        { form: 'Herb', formId: null },
      ]),
    );
    formChoicesOf.mockImplementation(async (ids: string[]) =>
      ids.map((id) => ({ id, groupId: 'group-1' })),
    );
    formGroupsOf.mockImplementation(async (ids: string[]) =>
      ids.map((id) => ({ id, icon: 'mineral' })),
    );

    await renderPage();

    expect(formChoicesOf).toHaveBeenCalledWith(['form-1']);
    expect(formGroupsOf).toHaveBeenCalledWith(['group-1']);
    const row = within(screen.getByRole('table')).getAllByRole('row')[1];
    const [curated, text] = within(row)
      .getByRole('cell', { name: /Fixture Shard.*Herb/ })
      .querySelectorAll('svg');
    const glyph = (name: 'mineral' | null) =>
      render(<FormIcon name={name} />).container.querySelector('svg')?.innerHTML;
    expect(curated?.innerHTML).toBe(glyph('mineral'));
    expect(text?.innerHTML).toBe(glyph(null));
  });

  it('says which page of how many, counted from the first row of the page', async () => {
    listCompendium.mockResolvedValue(fullPage());
    countCompendium.mockResolvedValue({ totalCount: 63, countBefore: 25 });

    await renderPage({ after: encodeCursor({ key: ['Testwort'], id: TESTWORT.id }) });

    expect(countCompendium).toHaveBeenCalledWith(NO_FILTER, {
      key: ['Testwort 0'],
      id: expect.any(String),
    });
    expect(screen.getByRole('navigation', { name: 'Pages' })).toHaveTextContent('Page 2 of 3');
  });
});

describe('the /admin/compendium filter', () => {
  // The panel of facets opens as it does from the tablet width up, over the results.
  beforeEach(() => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('min-width'),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });
  const openPanel = () => fireEvent.click(screen.getByRole('button', { name: /^Filters/ }));

  it('reads ?query= trimmed, a repeated ?forms= as a list and ?withoutReferences=1 into the list and its count', async () => {
    await renderPage({
      query: '  test wort ',
      forms: [' Fixture Oil ', 'Fixture Powder', 'fixture oil'],
      withoutReferences: '1',
    });

    expect(lastFilter()).toEqual({
      query: 'test wort',
      forms: ['Fixture Oil', 'Fixture Powder'],
      withoutReferences: true,
    });
    expect(screen.getByRole('combobox', { name: 'Name' })).toHaveValue('test wort');
    openPanel();
    expect(screen.getByRole('switch', { name: /^No Refs/ })).toBeChecked();
  });

  // The facets are the choices' counts, so they are read under the filter the
  // list is: a count under another filter would count rows the list does not hold.
  it('counts the facets under the same filter as the list and its count', async () => {
    await renderPage({ query: 'test', forms: 'Fixture Oil', toxic: 'toxic' });

    expect(compendiumFacets).toHaveBeenCalledExactlyOnceWith(lastFilter());
    expect(lastFilter()).toEqual({ query: 'test', forms: ['Fixture Oil'], toxic: 'toxic' });
  });

  it('turns ?deities= slugs into the ids of the live deities, for the list and the facets', async () => {
    listDeityTraditions.mockResolvedValue([
      entry({ id: 't-gr', name: 'Greek' }),
      entry({ id: 't-ro', name: 'Roman' }),
    ]);
    listDeities.mockResolvedValue([
      entry({ id: 'd-gr', name: 'Testa', slug: 'testa-greek', traditionId: 't-gr' }),
      entry({ id: 'd-ro', name: 'Testa', slug: 'testa-roman', traditionId: 't-ro' }),
    ]);

    await renderPage({ deities: ['testa-roman', 'gone-greek'] });

    expect(lastFilter()).toEqual({ deityIds: ['d-ro'] });
    expect(compendiumFacets).toHaveBeenCalledExactlyOnceWith({ deityIds: ['d-ro'] });
  });

  it('reads ?zodiac=, ?planets= and ?toxic= into the variables the query takes', async () => {
    await renderPage({ zodiac: ['Aries', 'Leo'], planets: 'Mars', toxic: 'not_toxic' });

    expect(lastFilter()).toEqual({
      zodiacSigns: ['Aries', 'Leo'],
      celestialBodies: ['Mars'],
      toxic: 'not_toxic',
    });
  });

  it('reads a ?toxic= that is neither setting as no filter', async () => {
    await renderPage({ toxic: 'any' });

    expect(lastFilter()).toEqual(NO_FILTER);
  });

  it('reads a repeated ?elements= into the list and its count, dropping any that is no element, with no control for it', async () => {
    await renderPage({ query: 'test', elements: ['fire', 'ether', 'earth'] });

    expect(lastFilter()).toEqual({ query: 'test', elements: ['fire', 'earth'] });
    // A hand-edited address lists the same, and the pager keeps it.
    expect(screen.getByRole('link', { name: 'Add Ingredient' })).toHaveAttribute(
      'href',
      '/admin/compendium?query=test&elements=fire&elements=earth&new',
    );
  });

  it('reads one ?elements= given once, as a string, as a list of one', async () => {
    await renderPage({ elements: 'water' });

    expect(lastFilter()).toEqual({ elements: ['water'] });
  });

  // A native submit sends every field, blank or not.
  it('reads a blank ?query= and ?forms= as no filter', async () => {
    await renderPage({ query: '   ', forms: ['  ', ''] });

    expect(lastFilter()).toEqual(NO_FILTER);
    expect(screen.getByRole('combobox', { name: 'Name' })).toHaveValue('');
    openPanel();
    expect(screen.getByRole('combobox', { name: 'Forms' })).toHaveValue('');
  });

  // The classification filter left the search: an address that still carries
  // one lists everything, as a hand-edited parameter does.
  it('ignores a ?nomenclature=, which is no longer a filter, and drops it from every link', async () => {
    await renderPage({ query: 'test', nomenclature: 'botanical' });

    expect(lastFilter()).toEqual({ query: 'test' });
    expect(screen.getByRole('link', { name: 'Add Ingredient' })).toHaveAttribute(
      'href',
      '/admin/compendium?query=test&new',
    );
  });

  // The switch submits 1; any other value is every entry.
  it('reads ?withoutReferences= other than 1 as every entry', async () => {
    await renderPage({ withoutReferences: 'true' });

    expect(lastFilter()).toEqual(NO_FILTER);
    openPanel();
    expect(screen.getByRole('switch', { name: /^No Refs/ })).not.toBeChecked();
  });

  it('reads ?withoutForms=1 into the list and its count, and nothing else as on', async () => {
    await renderPage({ withoutForms: '1' });
    expect(lastFilter()).toEqual({ ...NO_FILTER, withoutForms: true });
    openPanel();
    expect(screen.getByRole('switch', { name: /^No Form/ })).toBeChecked();
  });

  it('reads ?withoutForms= other than 1 as every entry', async () => {
    await renderPage({ withoutForms: 'true' });

    expect(lastFilter()).toEqual(NO_FILTER);
    openPanel();
    expect(screen.getByRole('switch', { name: /^No Form/ })).not.toBeChecked();
  });

  it('turns ?categories= slugs into the ids of the live categories, for the list and its count', async () => {
    await renderPage({ categories: ['testward', 'testcraft'] });

    expect(lastFilter()).toEqual({ categoryIds: ['c-tw', 'c-tc'] });
    openPanel();
    expect(screen.getByRole('button', { name: 'Remove Category: testward' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove Category: testcraft' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Add Ingredient' })).toHaveAttribute(
      'href',
      '/admin/compendium?categories=testward&categories=testcraft&new',
    );
  });

  it('reads ?categoryMode=any into the read, and checks Any', async () => {
    await renderPage({ categories: ['testward', 'testcraft'], categoryMode: 'any' });

    expect(lastFilter()).toEqual({ categoryIds: ['c-tw', 'c-tc'], categoryMode: 'any' });
    openPanel();
    expect(
      within(screen.getByRole('group', { name: 'Match' })).getByRole('radio', { name: 'Any' }),
    ).toBeChecked();
  });

  it('reads any other ?categoryMode= as all, which sends nothing', async () => {
    await renderPage({ categories: ['testward', 'testcraft'], categoryMode: 'both' });

    expect(lastFilter()).toEqual({ categoryIds: ['c-tw', 'c-tc'] });
    openPanel();
    expect(
      within(screen.getByRole('group', { name: 'Match' })).getByRole('radio', { name: 'All' }),
    ).toBeChecked();
  });

  it('drops a ?categories= slug no live category holds, and the known one still filters', async () => {
    await renderPage({ categories: ['renamed-away', 'testcraft'] });

    expect(lastFilter()).toEqual({ categoryIds: ['c-tc'] });
    openPanel();
    expect(screen.getByRole('button', { name: 'Remove Category: testcraft' })).toBeInTheDocument();
  });

  it('filters by no category when every slug is unknown', async () => {
    await renderPage({ categories: 'renamed-away' });

    expect(lastFilter()).toEqual(NO_FILTER);
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

    await renderPage({ categories: 'testcat-100' });

    expect(lastFilter()).toEqual({ categoryIds: ['c-100'] });
    expect(categoryGroupsOf).toHaveBeenCalledOnce();
  });

  it('offers the forms the facets count in the Form box, most entries first', async () => {
    compendiumFacets.mockResolvedValue({
      ...NO_FACETS,
      forms: [
        { value: 'Fixture Powder', count: 1 },
        { value: 'Fixture Oil', count: 2 },
      ],
    });

    await renderPage();

    openPanel();
    fireEvent.click(screen.getByRole('button', { name: /^Show Forms/ }));
    const choices = screen.getByRole('listbox', { name: /^Forms/ });
    expect(
      within(choices)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual([expect.stringContaining('Fixture Oil'), expect.stringContaining('Fixture Powder')]);
  });

  // 84 forms are seeded against a page of at most 100, so one page is not a
  // safe assumption for the icons the choices wear: the read walks on while
  // there are more.
  it('reads the curated forms past their first page, for their icons', async () => {
    const forms = Array.from({ length: 101 }, (_, index) =>
      curatedForm(`Fixture Form ${String(index).padStart(3, '0')}`, index),
    );
    // As the finder pages: the rows after the cursor, as many as asked for.
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
      `${here}&new`,
    );
    expect(screen.getByRole('link', { name: 'Edit Testwort 0, Fixtura testalis' })).toHaveAttribute(
      'href',
      `${here}&edit=testwort-0`,
    );
    const pages = screen.getByRole('navigation', { name: 'Pages' });
    expect(within(pages).getByRole('link', { name: 'Prev' }).getAttribute('href')).toMatch(
      /^\/admin\/compendium\?query=test&forms=Fixture\+Oil&forms=Fixture\+Powder&withoutReferences=1&withoutForms=1&elements=fire&elements=earth&before=[^&]+$/,
    );
    expect(within(pages).getByRole('link', { name: 'Next' }).getAttribute('href')).toMatch(
      /^\/admin\/compendium\?query=test&forms=Fixture\+Oil&forms=Fixture\+Powder&withoutReferences=1&withoutForms=1&elements=fire&elements=earth&after=[^&]+$/,
    );
  });
});

describe('the /admin/compendium modal', () => {
  it('opens the empty form on ?new, with Save & Add Another and nothing to delete', async () => {
    await renderPage({ new: '' });

    const dialog = screen.getByRole('dialog', { name: 'Add Ingredient to Compendium' });
    expect(within(dialog).getByRole('textbox', { name: 'Name' })).toHaveValue('');
    expect(within(dialog).getByRole('button', { name: 'Save & Add Another' })).toBeInTheDocument();
    expect(
      within(dialog).queryByRole('button', { name: 'Delete Ingredient' }),
    ).not.toBeInTheDocument();
    expect(resolveCompendiumSlug).not.toHaveBeenCalled();
  });

  // `?new` is a link from the list, so it wins over an `?edit=` left beside it.
  it('opens the empty form on ?new beside an ?edit=, reading no entry', async () => {
    await renderPage({ new: '', edit: TESTWORT.slug });

    expect(
      screen.getByRole('dialog', { name: 'Add Ingredient to Compendium' }),
    ).toBeInTheDocument();
    expect(resolveCompendiumSlug).not.toHaveBeenCalled();
    expect(entryValues).not.toHaveBeenCalled();
  });

  it("opens an entry's form on ?edit=, filled from its values, with Delete Ingredient", async () => {
    await renderPage({ edit: TESTWORT.slug });

    expect(resolveCompendiumSlug).toHaveBeenCalledWith(TESTWORT.slug);
    expect(entryValues).toHaveBeenCalledWith(TESTWORT, null);
    const dialog = screen.getByRole('dialog', { name: EDITING_TESTWORT });
    // An edit opens with its sections closed (MB.115).
    openSections('Identity', 'Variants');
    expect(within(dialog).getByRole('textbox', { name: 'Name' })).toHaveValue('Testwort');
    // Its forms too, each the variant's own fieldset (MB.221).
    expect(within(dialog).getByRole('group', { name: 'Herb' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Delete Ingredient' })).toBeInTheDocument();
    expect(
      within(dialog).queryByRole('button', { name: 'Save & Add Another' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  // The owner's call at MB.115: the head says what is being edited, by the
  // name it was saved under, so it holds still while the Name field changes.
  it('names the dialog by the entry as saved, however its Name field is changed', async () => {
    await renderPage({ edit: TESTWORT.slug });

    openSections('Identity');
    fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), {
      target: { value: 'Renamed Testwort' },
    });

    expect(screen.getByRole('dialog', { name: EDITING_TESTWORT })).toBeInTheDocument();
  });

  it('sends an old slug on to the entry at its new one, keeping the filter', async () => {
    resolveCompendiumSlug.mockResolvedValue({ kind: 'moved', slug: 'testwort-root' });

    await expect(renderPage({ ...FILTERED, edit: 'testwort-herb' })).rejects.toThrow(REDIRECTED);

    expect(resolveCompendiumSlug).toHaveBeenCalledWith('testwort-herb');
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

    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));

    expect(router.replace).toHaveBeenCalledWith(FILTERED_HREF);
  });
});

// A name's details modal over the list (M12.5): `?entry=<slug>`, which an Edit
// inside it opens the edit modal over, `?entry=<slug>&edit=<slug>`, so closing
// the edit goes back to the details.
describe('the /admin/compendium details modal', () => {
  const DETAILS_TESTWORT = 'Ingredient, Testwort, Fixtura testalis';
  const ON_DETAILS = `${FILTERED_HREF}&entry=${TESTWORT.slug}`;
  const details = () => screen.getByRole('dialog', { name: DETAILS_TESTWORT });

  it("opens an entry's details on ?entry=, with its full page and an Edit over them", async () => {
    await renderPage({ ...FILTERED, entry: TESTWORT.slug });

    expect(resolveCompendiumSlug).toHaveBeenCalledWith(TESTWORT.slug);
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(within(details()).getByRole('link', { name: 'Open Full Page' })).toHaveAttribute(
      'href',
      `/compendium/ingredients/${TESTWORT.slug}`,
    );
    expect(within(details()).getByRole('link', { name: 'Edit' })).toHaveAttribute(
      'href',
      `${ON_DETAILS}&edit=${TESTWORT.slug}`,
    );
    // The details read no form values: only an edit does.
    expect(entryValues).not.toHaveBeenCalled();
  });

  it("links each name to its details, keeping the filter, and each row's Edit to no details", async () => {
    await renderPage({ ...FILTERED, entry: TESTWORT.slug });

    const row = screen.getAllByRole('row')[1];
    // The name's href is the entry's page; the press's address is the details'.
    expect(within(row).getByRole('link', { name: 'Testwort' })).toHaveAttribute(
      'href',
      `/compendium/ingredients/${TESTWORT.slug}`,
    );
    expect(
      within(row).getByRole('link', { name: EDITING_TESTWORT.replace(' Ingredient,', '') }),
    ).toHaveAttribute('href', `${FILTERED_HREF}&edit=${TESTWORT.slug}`);
  });

  it('closes the details back to the filtered page they opened over', async () => {
    await renderPage({ ...FILTERED, entry: TESTWORT.slug });

    fireEvent.click(within(details()).getByRole('button', { name: 'Close' }));

    expect(router.replace).toHaveBeenCalledWith(FILTERED_HREF);
  });

  it('opens the edit modal over the details on ?entry= with ?edit=, and its Cancel goes back to them', async () => {
    await renderPage({ ...FILTERED, entry: TESTWORT.slug, edit: TESTWORT.slug });

    expect(screen.getAllByRole('dialog')).toHaveLength(2);
    expect(details()).toBeInTheDocument();
    const editing = screen.getByRole('dialog', { name: EDITING_TESTWORT });

    fireEvent.click(within(editing).getByRole('button', { name: 'Cancel' }));

    expect(router.replace).toHaveBeenCalledWith(ON_DETAILS);
  });

  it('closes a stacked edit back to the list, not the details, once it has deleted the entry', async () => {
    // A delete first asks how many covens hold the entry, to say so.
    mockGraphQLQuery('CompendiumEntryUsers', () => ({ compendiumEntryUsers: 0 }));
    mockGraphQLMutation('DeleteCompendiumIngredient', (variables: { id: string }) => ({
      deleteCompendiumIngredient: variables.id,
    }));
    await renderPage({ ...FILTERED, entry: TESTWORT.slug, edit: TESTWORT.slug });
    const editing = screen.getByRole('dialog', { name: EDITING_TESTWORT });

    fireEvent.click(within(editing).getByRole('button', { name: 'Delete Ingredient' }));
    fireEvent.click(await within(editing).findByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith(FILTERED_HREF));
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
