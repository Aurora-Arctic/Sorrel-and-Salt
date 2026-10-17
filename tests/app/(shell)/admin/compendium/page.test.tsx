import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FormIcon from '@/components/FormIcon';
import type { IngredientFormValues } from '@/components/IngredientForm/types';
import { EMPTY_VALUES, EMPTY_VARIANT } from '@/components/IngredientForm/values';
import { NotFound } from '@/lib/errors';
import { makeQueryClient } from '@/lib/graphql-client';
import { encodeCursor } from '@/lib/pagination';
import type { PageRequest } from '@/lib/types';
import { mockGraphQLQuery } from '../../../../support/msw/graphql';
import { offerCategories } from '../../../../support/msw/ingredient-lookups';
import { openSections } from '../../../../support/ingredient-sections';
import { sent } from '../../../../support/filter-form';

// The `/admin/compendium` page (M5.5): the guard, one page of the compendium
// under the address's filter, and the modal its address opens — `?new` empty,
// `?edit=` an entry by slug, an old slug sent on to the new one. The guard,
// the services and the entry's values are mocked: what they decide is
// tests/lib/request-session.test.ts's, the compendium services' tests', and
// tests/db/admin-compendium-entry-values.test.ts's.

const requireCuratorSession = vi.fn();
vi.mock('@/lib/request-session', () => ({ requireCuratorSession }));

// The editors' names are `editorStamps`'s, tested in tests/app/(shell)/admin/editors.test.ts.
const editorStamps = vi.fn(async (_session: unknown, rows: readonly unknown[]) =>
  rows.map(() => ({ updatedBy: 'Fixture Editor', updatedAt: new Date('2026-05-06T10:00:00Z') })),
);
vi.mock('@/app/(shell)/admin/editors', () => ({ editorStamps }));

const listCompendium = vi.fn();
const countCompendium = vi.fn();
const resolveCompendiumSlug = vi.fn();
const variantsOf = vi.fn();
vi.mock('@/modules/ingredients', () => ({
  listCompendium,
  countCompendium,
  resolveCompendiumSlug,
  variantsOf,
}));

// The curated forms the Form box offers, read through the vocabulary module,
// and the two batches that give each listed form its group's icon (M12.7).
const listIngredientFormValues = vi.fn();
const formChoicesOf = vi.fn();
const formGroupsOf = vi.fn();
// ...and the live categories with their groups, which the Categories box offers
// and the address's slugs are turned into ids against (M8.11).
const listCategories = vi.fn();
const categoryGroupsOf = vi.fn();
vi.mock('@/modules/vocabulary', () => ({
  listIngredientFormValues,
  formChoicesOf,
  formGroupsOf,
  listCategories,
  categoryGroupsOf,
}));

const entryValues = vi.fn();
vi.mock('@/app/(shell)/admin/compendium/entry-values', () => ({ entryValues }));

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
  form: 'Fixture Oil',
  nomenclature: 'unknown',
  withoutReferences: '1',
  // Read from the address alone, with no control for it (M8.13).
  elements: ['fire', 'earth'],
};
const FILTERED_HREF =
  '/admin/compendium?query=test&form=Fixture+Oil&nomenclature=unknown&withoutReferences=1&elements=fire&elements=earth';

/** A curated form as its service lists it, keyed by name as the finder pages it. */
const curatedForm = (name: string, index: number) =>
  entry({ id: `form-${index}`, name, slug: name.toLowerCase().replace(/ /g, '-') });

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
    const row = within(screen.getByRole('table')).getAllByRole('row')[1];
    expect(within(row).getByRole('cell', { name: 'Testwort' })).toBeInTheDocument();
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
      .getByRole('cell', { name: 'Fixture Shard, Herb' })
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
  it('reads ?query= and ?form= trimmed, the form as a one-item list, a ?nomenclature= kind and ?withoutReferences=1 into the list and its count', async () => {
    await renderPage({
      query: '  test wort ',
      form: ' Fixture Oil ',
      nomenclature: 'unknown',
      withoutReferences: '1',
    });

    expect(lastFilter()).toEqual({
      query: 'test wort',
      forms: ['Fixture Oil'],
      nomenclature: 'unknown',
      withoutReferences: true,
    });
    expect(screen.getByRole('combobox', { name: 'Name' })).toHaveValue('test wort');
    expect(screen.getByRole('combobox', { name: 'Form' })).toHaveValue('Fixture Oil');
    expect(filterSends('nomenclature')).toBe('unknown');
    expect(screen.getByRole('switch', { name: 'No Refs' })).toBeChecked();
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
  it('reads a blank ?query=, ?form= and ?nomenclature= as no filter', async () => {
    await renderPage({ query: '   ', form: '  ', nomenclature: '' });

    expect(lastFilter()).toEqual(NO_FILTER);
    expect(screen.getByRole('combobox', { name: 'Name' })).toHaveValue('');
    expect(screen.getByRole('combobox', { name: 'Form' })).toHaveValue('');
  });

  // As a hand-edited cursor gets the first page.
  it('ignores a ?nomenclature= no kind is called, and drops it from every link', async () => {
    await renderPage({ query: 'test', nomenclature: 'herbal' });

    expect(lastFilter()).toEqual({ ...NO_FILTER, query: 'test' });
    expect(filterSends('nomenclature')).toBe('');
    expect(screen.getByRole('link', { name: 'Add Ingredient' })).toHaveAttribute(
      'href',
      '/admin/compendium?query=test&new',
    );
  });

  // The switch submits 1; any other value is every entry.
  it('reads ?withoutReferences= other than 1 as every entry', async () => {
    await renderPage({ withoutReferences: 'true' });

    expect(lastFilter()).toEqual(NO_FILTER);
    expect(screen.getByRole('switch', { name: 'No Refs' })).not.toBeChecked();
  });

  it('turns ?categories= slugs into the ids of the live categories, for the list and its count', async () => {
    await renderPage({ categories: ['testward', 'testcraft'] });

    expect(lastFilter()).toEqual({ categoryIds: ['c-tw', 'c-tc'] });
    expect(screen.getByRole('button', { name: 'Remove Testward' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove Testcraft' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Add Ingredient' })).toHaveAttribute(
      'href',
      '/admin/compendium?categories=testward&categories=testcraft&new',
    );
  });

  it('drops a ?categories= slug no live category holds, and the known one still filters', async () => {
    await renderPage({ categories: ['renamed-away', 'testcraft'] });

    expect(lastFilter()).toEqual({ categoryIds: ['c-tc'] });
    expect(screen.getAllByRole('button', { name: /^Remove / })).toHaveLength(1);
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

  it('offers every curated form in the Form box, read once for the request', async () => {
    await renderPage();

    expect(listIngredientFormValues).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('combobox', { name: 'Form' }));
    const choices = screen.getByRole('listbox', { name: 'Form choices' });
    expect(within(choices).getByRole('option', { name: 'Fixture Oil' })).toBeInTheDocument();
    expect(within(choices).getByRole('option', { name: 'Fixture Powder' })).toBeInTheDocument();
  });

  // 84 forms are seeded against a page of at most 100, so one page is not a
  // safe assumption: the read walks on while there are more.
  it('reads the forms past their first page', async () => {
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
    fireEvent.click(screen.getByRole('combobox', { name: 'Form' }));
    const choices = screen.getByRole('listbox', { name: 'Form choices' });
    expect(within(choices).getAllByRole('option')).toHaveLength(forms.length);
  });

  // Two live forms may share a name in different groups; the filter matches
  // the text, so one choice filters by both.
  it('offers a form name two groups share once', async () => {
    listIngredientFormValues.mockResolvedValue(
      ['Fixture Oil', 'Fixture Wax', 'Fixture Wax'].map(curatedForm),
    );

    await renderPage();

    fireEvent.click(screen.getByRole('combobox', { name: 'Form' }));
    const choices = screen.getByRole('listbox', { name: 'Form choices' });
    expect(within(choices).getAllByRole('option', { name: 'Fixture Wax' })).toHaveLength(1);
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
      /^\/admin\/compendium\?query=test&form=Fixture\+Oil&nomenclature=unknown&withoutReferences=1&elements=fire&elements=earth&before=[^&]+$/,
    );
    expect(within(pages).getByRole('link', { name: 'Next' }).getAttribute('href')).toMatch(
      /^\/admin\/compendium\?query=test&form=Fixture\+Oil&nomenclature=unknown&withoutReferences=1&elements=fire&elements=earth&after=[^&]+$/,
    );
  });
});

describe('the /admin/compendium modal', () => {
  it('opens the empty form on ?new, with Save & Add Another and nothing to delete', async () => {
    await renderPage({ new: '' });

    const dialog = screen.getByRole('dialog', { name: 'Add Ingredient' });
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

    expect(screen.getByRole('dialog', { name: 'Add Ingredient' })).toBeInTheDocument();
    expect(resolveCompendiumSlug).not.toHaveBeenCalled();
    expect(entryValues).not.toHaveBeenCalled();
  });

  it("opens an entry's form on ?edit=, filled from its values, with Delete Ingredient", async () => {
    await renderPage({ edit: TESTWORT.slug });

    expect(resolveCompendiumSlug).toHaveBeenCalledWith(TESTWORT.slug);
    expect(entryValues).toHaveBeenCalledWith(TESTWORT);
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

/** What the filter form sends for `name`: once hydrated, a select-only box's hidden input. */
function filterSends(name: string): string | null {
  return new URLSearchParams(sent(screen.getByRole('form', { name: 'Filter the Compendium' }))).get(
    name,
  );
}
