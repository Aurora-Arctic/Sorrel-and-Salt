import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IngredientFormValues } from '@/components/IngredientForm/types';
import { EMPTY_VALUES, EMPTY_VARIANT } from '@/components/IngredientForm/values';
import { NotFound } from '@/lib/errors';
import { makeQueryClient } from '@/lib/graphql-client';
import { encodeCursor } from '@/lib/pagination';
import type { PageRequest } from '@/lib/types';
import { mockGraphQLQuery } from '../../../support/msw/graphql';
import { openSections } from '../../../support/ingredient-sections';

// The `/admin/compendium` page (M5.5): the guard, one page of the compendium
// under the address's filter, and the modal its address opens — `?new` empty,
// `?edit=` an entry by slug, an old slug sent on to the new one. The guard,
// the services and the entry's values are mocked: what they decide is
// tests/lib/request-session.test.ts's, the compendium services' tests', and
// tests/db/admin-compendium-entry-values.test.ts's.

const requireAdminSession = vi.fn();
vi.mock('@/lib/request-session', () => ({ requireAdminSession }));

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

// The curated forms the Form box offers, read through the vocabulary module.
const listIngredientFormValues = vi.fn();
vi.mock('@/modules/vocabulary', () => ({ listIngredientFormValues }));

const entryValues = vi.fn();
vi.mock('@/app/admin/compendium/entry-values', () => ({ entryValues }));

// `redirect` throws in Next, ending the render; so does this one, recognisably.
const REDIRECTED = 'NEXT_REDIRECT';
const redirect = vi.fn((href: string) => {
  throw new Error(`${REDIRECTED} ${href}`);
});
const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router, redirect }));

// jsdom implements no modal dialog; stood in for as a browser behaves.
HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
  this.setAttribute('open', '');
};
HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
  this.removeAttribute('open');
};

const { default: AdminCompendiumPage } = await import('@/app/admin/compendium/page');

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

async function renderPage(params: Record<string, string> = {}) {
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

const NO_FILTER = {
  query: undefined,
  form: undefined,
  nomenclature: undefined,
  withoutReferences: false,
};

/** The filter every link below keeps, as the address spells it. */
const FILTERED = {
  query: 'test',
  form: 'Fixture Oil',
  nomenclature: 'unknown',
  withoutReferences: '1',
};
const FILTERED_HREF =
  '/admin/compendium?query=test&form=Fixture+Oil&nomenclature=unknown&withoutReferences=1';

/** A curated form as its service lists it, keyed by name as the finder pages it. */
const curatedForm = (name: string, index: number) =>
  entry({ id: `form-${index}`, name, slug: name.toLowerCase().replace(/ /g, '-') });

beforeEach(() => {
  requireAdminSession.mockReset();
  requireAdminSession.mockResolvedValue(ADMIN);
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
  // Two curated forms, on one page.
  listIngredientFormValues.mockReset();
  listIngredientFormValues.mockResolvedValue(['Fixture Oil', 'Fixture Powder'].map(curatedForm));
  entryValues.mockReset();
  entryValues.mockResolvedValue(TESTWORT_VALUES);
  redirect.mockClear();
  router.replace.mockClear();
  // An entry's form asks after near matches of the name it opens with.
  mockGraphQLQuery('PossibleDuplicates', () => ({ possibleDuplicates: { edges: [] } }));
});

describe('the /admin/compendium page', () => {
  it('asks the admin guard, and reads nothing when it refuses', async () => {
    requireAdminSession.mockRejectedValue(new Error('forbidden'));

    await expect(renderPage()).rejects.toThrow('forbidden');
    expect(requireAdminSession).toHaveBeenCalledOnce();
    expect(listCompendium).not.toHaveBeenCalled();
    expect(countCompendium).not.toHaveBeenCalled();
  });

  it('lists the first page of 25, each entry with its formal name and its forms, and no modal', async () => {
    await renderPage();

    expect(requireAdminSession).toHaveBeenCalledOnce();
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
  it('reads ?query= and ?form= trimmed, a ?nomenclature= kind and ?withoutReferences=1 into the list and its count', async () => {
    await renderPage({
      query: '  test wort ',
      form: ' Fixture Oil ',
      nomenclature: 'unknown',
      withoutReferences: '1',
    });

    expect(lastFilter()).toEqual({
      query: 'test wort',
      form: 'Fixture Oil',
      nomenclature: 'unknown',
      withoutReferences: true,
    });
    expect(screen.getByRole('searchbox', { name: 'Name' })).toHaveValue('test wort');
    expect(screen.getByRole('combobox', { name: 'Form' })).toHaveValue('Fixture Oil');
    expect(screen.getByRole('combobox', { name: 'Classification' })).toHaveValue('unknown');
    expect(screen.getByRole('switch', { name: 'No Refs' })).toBeChecked();
  });

  // A native submit sends every field, blank or not.
  it('reads a blank ?query=, ?form= and ?nomenclature= as no filter', async () => {
    await renderPage({ query: '   ', form: '  ', nomenclature: '' });

    expect(lastFilter()).toEqual(NO_FILTER);
    expect(screen.getByRole('searchbox', { name: 'Name' })).toHaveValue('');
    expect(screen.getByRole('combobox', { name: 'Form' })).toHaveValue('');
  });

  // As a hand-edited cursor gets the first page.
  it('ignores a ?nomenclature= no kind is called, and drops it from every link', async () => {
    await renderPage({ query: 'test', nomenclature: 'herbal' });

    expect(lastFilter()).toEqual({ ...NO_FILTER, query: 'test' });
    expect(screen.getByRole('combobox', { name: 'Classification' })).toHaveValue('');
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
      /^\/admin\/compendium\?query=test&form=Fixture\+Oil&nomenclature=unknown&withoutReferences=1&before=[^&]+$/,
    );
    expect(within(pages).getByRole('link', { name: 'Next' }).getAttribute('href')).toMatch(
      /^\/admin\/compendium\?query=test&form=Fixture\+Oil&nomenclature=unknown&withoutReferences=1&after=[^&]+$/,
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
    const dialog = screen.getByRole('dialog', { name: 'Edit Ingredient' });
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

    within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }).click();

    expect(router.replace).toHaveBeenCalledWith(FILTERED_HREF);
  });
});
