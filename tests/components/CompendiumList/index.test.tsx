import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { type ReactElement, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClientProvider } from '@tanstack/react-query';
import CompendiumListBase from '@/components/CompendiumList';
import FormIcon from '@/components/FormIcon';
import { compendiumHref } from '@/components/CompendiumList/href';
import type {
  CompendiumListEntry,
  CompendiumListFilter,
  CompendiumListProps,
} from '@/components/CompendiumList/types';
import { DEBOUNCE_MS } from '@/lib/debounce';
import { someOf } from '@/lib/search-params';
import { INGREDIENT_ELEMENTS } from '@/modules/ingredients/schema/ingredient-enums';
import { makeQueryClient } from '@/lib/graphql-client';
import { FILTER_ROWS, drawnOnServer, sent } from '../../support/filter-form';
import { waitFor } from '../../support/ingredient-form';
import { choose, typeIn } from '../../support/interact';
import { mockGraphQLQuery } from '../../support/msw/graphql';
import { Navigating } from '../../support/navigating';
import type { FilterFormSubject } from '../../support/types';

// The filter navigates through the App Router; Vitest hoists the mock above the imports.
const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// `/admin/compendium`'s filter, table and pager (M5.5): each entry with its
// formal name and live forms, an Edit link opening it in the page's modal, the
// filter that narrows them to the admin's to-do lists, and the pager
// (claude-docs/components/compendium-list.md).

// The Name box is IngredientSearch's type-ahead, which asks the server through
// TanStack Query, so every render sits under a client, as the app's providers give it.
const client = makeQueryClient();
const CompendiumList = (listProps: CompendiumListProps): ReactElement => (
  <QueryClientProvider client={client}>
    <CompendiumListBase {...listProps} />
  </QueryClientProvider>
);

const ENTRIES: CompendiumListEntry[] = [
  {
    id: 'i1',
    updatedBy: 'Fixture Editor',
    updatedAt: new Date('2026-05-06T10:00:00Z'),
    name: 'Testwort',
    slug: 'testwort',
    nomenclature: 'botanical',
    canonicalName: 'Fixtura testalis',
    forms: [
      { name: 'Fixture Herb', icon: 'botanical' },
      { name: 'Fixture Oil', icon: null },
    ],
    editHref: compendiumHref({}, { edit: 'testwort' }),
    editHeading: { eyebrow: 'Edit Ingredient', title: 'Testwort' },
  },
  {
    id: 'i2',
    updatedBy: 'Fixture Editor',
    updatedAt: new Date('2026-05-06T10:00:00Z'),
    name: 'Fixture Salt',
    slug: 'fixture-salt',
    nomenclature: 'unknown',
    canonicalName: null,
    forms: [],
    editHref: compendiumHref({}, { edit: 'fixture-salt' }),
    editHeading: { eyebrow: 'Edit Ingredient', title: 'Fixture Salt' },
  },
];

/**
 * The list's loading status, the skeleton's: the Form type-ahead holds a
 * status of its own, inside the filter's search landmark.
 */
const listStatus = () =>
  screen.queryAllByRole('status').filter((status) => !status.closest('search'));

const NO_FILTER: CompendiumListFilter = {
  query: '',
  form: '',
  nomenclature: '',
  withoutReferences: false,
  elements: [],
  categories: [],
};

/** Every filter in use, as a page shows it. */
const SHOWN: CompendiumListFilter = {
  query: 'test',
  form: 'Fixture Oil',
  nomenclature: 'unknown',
  withoutReferences: true,
  elements: [],
  categories: [],
};

/** The categories the Categories box offers, each with the slug the address carries. */
const WARDS = {
  id: 'g-ward',
  name: 'Fixture Wards',
  colorDark: '#4e8bc2',
  colorLight: '#0c5393',
};
const CATEGORIES = [
  { id: 'c-tw', slug: 'testward', name: 'Testward', group: WARDS },
  { id: 'c-tc', slug: 'testcraft', name: 'Testcraft', group: WARDS },
  { id: 'c-tb', slug: 'testbane', name: 'Testbane', group: WARDS },
];

/** The curated forms the Form box offers. */
const FORMS = [{ name: 'Fixture Oil' }, { name: 'Fixture Powder' }, { name: 'Fixture Resin' }];

const props = (overrides: Partial<CompendiumListProps> = {}): CompendiumListProps => ({
  entries: ENTRIES,
  filter: NO_FILTER,
  forms: FORMS,
  categories: CATEGORIES,
  ...overrides,
});

describe('CompendiumList', () => {
  it('lists each entry with its formal name and every live form', () => {
    render(<CompendiumList {...props()} />);

    const rows = within(screen.getByRole('table')).getAllByRole('row');
    expect(rows).toHaveLength(3);
    expect(within(rows[1]).getByRole('cell', { name: 'Testwort' })).toBeInTheDocument();
    expect(within(rows[1]).getByRole('cell', { name: 'Fixtura testalis' })).toBeInTheDocument();
    expect(
      within(rows[1]).getByRole('cell', { name: 'Fixture Herb, Fixture Oil' }),
    ).toBeInTheDocument();
    expect(within(rows[2]).getByRole('cell', { name: 'Fixture Salt' })).toBeInTheDocument();
  });

  // M12.7: each form wears its group's icon; a form with none wears the spoon.
  it('draws each form with its group icon in the Form column', () => {
    const { container: botanical } = render(<FormIcon name="botanical" />);
    const { container: spoon } = render(<FormIcon name={null} />);
    render(<CompendiumList {...props()} />);

    const rows = within(screen.getByRole('table')).getAllByRole('row');
    const cell = within(rows[1]).getByRole('cell', { name: 'Fixture Herb, Fixture Oil' });
    const glyphs = [...cell.querySelectorAll('svg')].map((svg) => svg.innerHTML);
    expect(glyphs).toEqual([
      botanical.querySelector('svg')!.innerHTML,
      spoon.querySelector('svg')!.innerHTML,
    ]);
  });

  // MB.260: who last edited each row, and when, as the coven's member list has it.
  it('shows who last edited each row and when in an Updated column', () => {
    render(<CompendiumList {...props()} />);

    expect(screen.getByRole('columnheader', { name: 'Updated' })).toBeInTheDocument();
    const row = screen.getByRole('row', { name: /Testwort/ });
    expect(within(row).getByText('Fixture Editor')).toBeInTheDocument();
    expect(within(row).getByText('2026-05-06')).toHaveAttribute(
      'datetime',
      '2026-05-06T10:00:00.000Z',
    );
  });

  it('links each row to its edit modal, named for the entry and its formal name', () => {
    render(<CompendiumList {...props()} />);

    expect(screen.getByRole('link', { name: 'Edit Testwort, Fixtura testalis' })).toHaveAttribute(
      'href',
      '/admin/compendium?edit=testwort',
    );
    expect(screen.getByRole('link', { name: 'Edit Fixture Salt' })).toHaveAttribute(
      'href',
      '/admin/compendium?edit=fixture-salt',
    );
  });

  it('draws no table when there are none, filtered or not', () => {
    const { rerender } = render(<CompendiumList {...props({ entries: [] })} />);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    rerender(
      <CompendiumList {...props({ entries: [], filter: { ...NO_FILTER, query: 'nothing' } })} />,
    );
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});

describe('compendiumHref', () => {
  it('keeps the page a modal opens over, the modal last', () => {
    expect(compendiumHref({ after: 'x/y' }, { edit: 'testwort' })).toBe(
      '/admin/compendium?after=x%2Fy&edit=testwort',
    );
    expect(compendiumHref({ before: 'b' }, 'new')).toBe('/admin/compendium?before=b&new');
    expect(compendiumHref({})).toBe('/admin/compendium');
  });

  it('keeps the filter ahead of the cursor and the modal', () => {
    expect(
      compendiumHref(
        {
          query: 'test wort',
          form: 'Fixture Oil',
          nomenclature: 'unknown',
          withoutReferences: true,
          after: 'a',
        },
        { edit: 'x' },
      ),
    ).toBe(
      '/admin/compendium?query=test+wort&form=Fixture+Oil&nomenclature=unknown&withoutReferences=1&after=a&edit=x',
    );
    expect(compendiumHref({ elements: ['fire', 'water'], after: 'a' })).toBe(
      '/admin/compendium?elements=fire&elements=water&after=a',
    );
    expect(compendiumHref({ query: 'test', before: 'b' }, 'new')).toBe(
      '/admin/compendium?query=test&before=b&new',
    );
    expect(compendiumHref({ withoutReferences: true })).toBe(
      '/admin/compendium?withoutReferences=1',
    );
  });

  it('writes no blank filter', () => {
    expect(compendiumHref(NO_FILTER)).toBe('/admin/compendium');
  });
});

/**
 * The compendium's page as the App Router draws it: the list under the
 * filter its address shows, which a push changes inside the list's
 * transition, as Next renders the new page, so the old filter row goes and
 * the new one mounts.
 */
function RoutedCompendium(): ReactElement {
  const [filter, setFilter] = useState<CompendiumListFilter>(NO_FILTER);
  router.push.mockImplementation((href: string) => {
    const params = new URL(href, 'http://localhost').searchParams;
    setFilter({
      query: params.get('query') ?? '',
      form: params.get('form') ?? '',
      nomenclature: (params.get('nomenclature') ?? '') as CompendiumListFilter['nomenclature'],
      withoutReferences: params.has('withoutReferences'),
      elements: someOf(INGREDIENT_ELEMENTS, params.getAll('elements')),
      categories: params.getAll('categories'),
    });
  });
  return <CompendiumList {...props({ filter })} />;
}

// MB.178's GET form to the page itself, as the category list's, applying as
// each field changes (MB.115, the owner's call): a select or a switch on its
// change, the form once a choice settles, the name on its Search submit.
describe('CompendiumList filter', () => {
  beforeEach(() => {
    router.push.mockReset();
  });

  const searchButton = () => screen.getByRole('button', { name: 'Search' });
  const nameBox = () => screen.getByRole('combobox', { name: 'Name' });
  const formBox = () => screen.getByRole('combobox', { name: 'Form' });
  const kindSelect = () => screen.getByRole('combobox', { name: 'Classification' });
  /** The classification the form sends: once hydrated, the select-only box's hidden input. */
  const kindSent = () =>
    new URLSearchParams(sent(screen.getByRole('form', { name: 'Filter the Compendium' }))).get(
      'nomenclature',
    );
  const unsourcedSwitch = () => screen.getByRole('switch', { name: 'No Refs' });

  // The form goes under its own parameter by its text, from the type-ahead's
  // hidden input, and No Refs as `1`, as the server's select and checkbox send them.
  const SUBJECT: FilterFormSubject = {
    label: 'Filter the Compendium',
    path: '/admin/compendium',
    searchLabel: 'Name',
    searchRole: 'combobox',
    push: router.push,
    none: {
      list: <CompendiumList {...props()} />,
      sends: 'query=&form=&nomenclature=',
    },
    shown: {
      list: (
        <CompendiumList
          {...props({ filter: SHOWN, previousHref: compendiumHref({ ...SHOWN, before: 'b' }) })}
        />
      ),
      sends: 'query=test&form=Fixture+Oil&nomenclature=unknown&withoutReferences=1',
    },
    alone: [
      {
        list: <CompendiumList {...props({ filter: { ...NO_FILTER, query: 'test' } })} />,
        sends: 'query=test&form=&nomenclature=',
      },
      {
        list: <CompendiumList {...props({ filter: { ...NO_FILTER, form: 'Fixture Oil' } })} />,
        sends: 'query=&form=Fixture+Oil&nomenclature=',
      },
      {
        list: <CompendiumList {...props({ filter: { ...NO_FILTER, nomenclature: 'unknown' } })} />,
        sends: 'query=&form=&nomenclature=unknown',
      },
      {
        list: <CompendiumList {...props({ filter: { ...NO_FILTER, withoutReferences: true } })} />,
        sends: 'query=&form=&nomenclature=&withoutReferences=1',
      },
    ],
    searched:
      '/admin/compendium?query=Two+words&form=Fixture+Oil&nomenclature=unknown&withoutReferences=1',
  };

  it.each(FILTER_ROWS)('%s', (_title, run) => run(SUBJECT));

  // The owner's call (MB.115): every closed set in the row takes one
  // dropdown look once hydrated, the select-only box, but the server draws a
  // native select, so the filter works before JavaScript.
  it('offers every classification, after the option for any, as a native select on the server and a select-only box once hydrated', async () => {
    const { container, hydrate } = drawnOnServer(<CompendiumList {...props()} />);

    const served = within(container).getByRole('combobox', { name: 'Classification' });
    expect(
      within(served)
        .getAllByRole('option')
        .map((option) => option.getAttribute('value')),
    ).toEqual(['', 'botanical', 'fungal', 'zoological', 'mineral', 'chemical', 'unknown', 'none']);
    expect(served).toHaveValue('');
    expect(served).toHaveAttribute('name', 'nomenclature');

    await hydrate();
    fireEvent.click(kindSelect());
    expect(
      within(screen.getByRole('listbox', { name: 'Classification choices' })).getAllByRole(
        'option',
      ),
    ).toHaveLength(8);
    expect(kindSent()).toBe('');
  });

  // The owner's call (MB.115), as the curated lists' group filter: typed
  // into once hydrated, but drawn as a native select by the server, beside
  // the search's own submit, so the filter works before JavaScript.
  it('draws the form as a native select on the server, and as a type-ahead once hydrated', async () => {
    const { container, hydrate } = drawnOnServer(<CompendiumList {...props({ filter: SHOWN })} />);

    const search = within(container).getByRole('form', { name: 'Filter the Compendium' });
    expect(within(search).getByRole('button', { name: 'Search' })).toHaveAttribute(
      'type',
      'submit',
    );
    const served = within(search).getByRole('combobox', { name: 'Form' });
    expect(served).toHaveValue('Fixture Oil');
    expect(served).toHaveAttribute('name', 'form');
    expect(
      within(served)
        .getAllByRole('option')
        .map((option) => option.getAttribute('value')),
    ).toEqual(['', ...FORMS.map((form) => form.name)]);
    expect(served).not.toHaveAttribute('aria-autocomplete');

    await hydrate();
    const hydrated = within(container).getByRole('combobox', { name: 'Form' });
    expect(hydrated).toHaveAttribute('aria-autocomplete', 'list');
    expect(hydrated).toHaveValue('Fixture Oil');
  });

  // The owner's call (MB.115): a slide toggle rather than a checkbox, but a
  // native checkbox beneath it, so the server's form sends it and a press
  // turns it before any JavaScript runs.
  it('draws No Refs as a switch the server-drawn form sends, turned by a press before hydration', () => {
    const { container } = drawnOnServer(<CompendiumList {...props({ filter: SHOWN })} />);
    const search = within(container).getByRole('form', { name: 'Filter the Compendium' });

    const served = within(search).getByRole('switch', { name: 'No Refs' });
    expect(served).toBeChecked();
    expect(new FormData(search as HTMLFormElement).get('withoutReferences')).toBe('1');

    fireEvent.click(served);

    expect(within(search).getByRole('switch', { name: 'No Refs' })).not.toBeChecked();
    expect(new FormData(search as HTMLFormElement).has('withoutReferences')).toBe(false);
  });

  it('applies a classification on its change, carrying the name typed and the filter shown', () => {
    render(
      <CompendiumList
        {...props({
          filter: { ...SHOWN, nomenclature: '' },
          previousHref: compendiumHref({ ...SHOWN, before: 'b' }),
        })}
      />,
    );

    fireEvent.change(nameBox(), { target: { value: ' Test wort ' } });
    choose('Classification', 'Unknown');

    expect(router.push.mock.calls).toEqual([
      [
        '/admin/compendium?query=Test+wort&form=Fixture+Oil&nomenclature=unknown&withoutReferences=1',
      ],
    ]);
  });

  it('keeps the elements the address holds when another control applies, from the first page', () => {
    render(
      <CompendiumList
        {...props({
          filter: { ...SHOWN, elements: ['fire', 'earth'] },
          nextHref: compendiumHref({ ...SHOWN, after: 'a' }),
        })}
      />,
    );

    fireEvent.change(nameBox(), { target: { value: ' Test wort ' } });
    fireEvent.click(unsourcedSwitch());

    expect(router.push).toHaveBeenCalledTimes(1);
    const sent = new URL(router.push.mock.calls[0][0], 'http://localhost').searchParams;
    expect(sent.getAll('elements')).toEqual(['fire', 'earth']);
    expect(sent.get('query')).toBe('Test wort');
    expect(sent.has('after')).toBe(false);
  });

  it('applies No Refs on its press carrying the name typed, trimmed', () => {
    render(<CompendiumList {...props()} />);

    fireEvent.change(nameBox(), { target: { value: ' Test wort ' } });
    fireEvent.click(unsourcedSwitch());

    expect(router.push.mock.calls).toEqual([
      ['/admin/compendium?query=Test+wort&withoutReferences=1'],
    ]);
  });

  // The owner's call (M8.10): a pick opens the entry over the list as it
  // stands, so the text typed and not searched is not applied.
  describe('picking a name from the dropdown', () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('opens that entry\x27s modal over the filter shown, not the text typed', async () => {
      mockGraphQLQuery('IngredientSearchMatches', () => ({
        compendium: {
          pageInfo: { hasNextPage: false },
          edges: [
            {
              node: {
                id: 'i1',
                slug: 'testwort',
                name: 'Testwort',
                canonicalName: 'Fixtura testalis',
                nomenclature: 'botanical',
              },
            },
          ],
        },
      }));
      render(<CompendiumList {...props({ filter: SHOWN })} />);

      act(() => nameBox().focus());
      typeIn(nameBox(), 'fixt');
      await act(async () => {
        await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
      });
      fireEvent.click(await screen.findByRole('option', { name: /Testwort/ }));

      await waitFor(() => expect(router.push).toHaveBeenCalled());
      expect(router.push.mock.calls).toEqual([[compendiumHref(SHOWN, { edit: 'testwort' })]]);
    });
  });

  it('applies No Refs on its press, on or off, keeping the rest of the filter shown', () => {
    const { unmount } = render(<CompendiumList {...props()} />);
    fireEvent.click(unsourcedSwitch());
    expect(router.push).toHaveBeenLastCalledWith('/admin/compendium?withoutReferences=1');
    unmount();

    render(<CompendiumList {...props({ filter: SHOWN })} />);
    fireEvent.click(unsourcedSwitch());
    expect(router.push).toHaveBeenLastCalledWith(
      '/admin/compendium?query=test&form=Fixture+Oil&nomenclature=unknown',
    );
    expect(router.push).toHaveBeenCalledTimes(2);
  });

  // The owner's call (MB.115): typing alone applies nothing, since a half
  // typed name would read a list the admin never asked for.
  it('a type-ahead applies on pick, on its clear and on leaving the box, not while typed', () => {
    const { unmount } = render(<CompendiumList {...props()} />);
    fireEvent.change(nameBox(), { target: { value: 'wort' } });
    act(() => formBox().focus());
    fireEvent.change(formBox(), { target: { value: 'fixture powd' } });
    fireEvent.change(formBox(), { target: { value: 'fixture powder' } });
    expect(router.push).not.toHaveBeenCalled();

    // Left naming a choice in full, it applies that choice.
    act(() => nameBox().focus());
    expect(router.push.mock.calls).toEqual([['/admin/compendium?query=wort&form=Fixture+Powder']]);

    // A pick applies at once.
    fireEvent.click(formBox());
    fireEvent.click(screen.getByRole('option', { name: 'Fixture Oil' }));
    expect(router.push).toHaveBeenLastCalledWith('/admin/compendium?query=wort&form=Fixture+Oil');
    unmount();
    router.push.mockReset();

    // Left on the form shown, nothing; its clear applies every form.
    render(<CompendiumList {...props({ filter: { ...NO_FILTER, form: 'Fixture Oil' } })} />);
    act(() => formBox().focus());
    act(() => nameBox().focus());
    expect(router.push).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Clear Form' }));
    expect(router.push.mock.calls).toEqual([['/admin/compendium']]);
  });

  // The owner's call (MB.115): while the filtered list reads, the list
  // beneath the filter gives way to the tabs' skeleton, its one status, and
  // the row is off, every control in it `aria-disabled` and the form
  // `aria-busy`, until the new list renders.
  it('puts a status in place of the list and turns the filter row off until the filtered list arrives', async () => {
    let arrive = () => {};
    const arrives = new Promise<void>((resolve) => {
      arrive = resolve;
    });
    render(
      <Navigating push={router.push} arrives={arrives}>
        <CompendiumList {...props()} />
      </Navigating>,
    );
    const row = screen.getByRole('form', { name: 'Filter the Compendium' });
    const controls = () => [nameBox(), searchButton(), formBox(), kindSelect(), unsourcedSwitch()];
    // Before the press: the list shows, and every control can be used.
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(listStatus()).toEqual([]);
    expect(row).not.toHaveAttribute('aria-busy');
    expect(controls().filter((control) => control.hasAttribute('aria-disabled'))).toEqual([]);

    await act(async () => {
      fireEvent.click(unsourcedSwitch());
    });

    expect(router.push).toHaveBeenCalledWith('/admin/compendium?withoutReferences=1');
    expect(listStatus()).toHaveLength(1);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(row).toHaveAttribute('aria-busy', 'true');
    for (const control of controls()) expect(control).toHaveAttribute('aria-disabled', 'true');

    // A second change, or a submit, while the first is on its way goes nowhere.
    fireEvent.click(kindSelect());
    fireEvent.keyDown(kindSelect(), { key: 'ArrowDown' });
    fireEvent.submit(row);
    expect(router.push).toHaveBeenCalledTimes(1);

    await act(async () => {
      arrive();
    });

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(listStatus()).toEqual([]);
    expect(row).not.toHaveAttribute('aria-busy');
    expect(controls().filter((control) => control.hasAttribute('aria-disabled'))).toEqual([]);
  });

  it('leaves the list in place while a field is typed in', () => {
    render(
      <Navigating push={router.push}>
        <CompendiumList {...props()} />
      </Navigating>,
    );

    fireEvent.change(nameBox(), { target: { value: 'test' } });
    fireEvent.change(formBox(), { target: { value: 'Fixture Oil' } });

    expect(router.push).not.toHaveBeenCalled();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(listStatus()).toEqual([]);
    expect(screen.getByRole('form', { name: 'Filter the Compendium' })).not.toHaveAttribute(
      'aria-busy',
    );
  });

  // The owner's call (MB.115): the row is drawn afresh for the new filter,
  // and the control that applied it has the focus again in the new row.
  it('keeps the focus on the field changed once the list arrives', async () => {
    render(<RoutedCompendium />);

    act(() => unsourcedSwitch().focus());
    await act(async () => {
      fireEvent.click(unsourcedSwitch());
    });
    expect(unsourcedSwitch()).toBeChecked();
    expect(unsourcedSwitch()).toHaveFocus();

    act(() => kindSelect().focus());
    fireEvent.click(kindSelect());
    await act(async () => {
      fireEvent.click(screen.getByRole('option', { name: 'Mineral' }));
    });
    expect(kindSent()).toBe('mineral');
    expect(kindSelect()).toHaveFocus();

    fireEvent.change(nameBox(), { target: { value: 'test' } });
    act(() => searchButton().focus());
    await act(async () => {
      fireEvent.click(searchButton());
    });
    expect(nameBox()).toHaveValue('test');
    expect(searchButton()).toHaveFocus();
    expect(router.push).toHaveBeenLastCalledWith(
      '/admin/compendium?query=test&nomenclature=mineral&withoutReferences=1',
    );
  });

  describe('the Categories picker', () => {
    const categoryBox = () => screen.getByRole('combobox', { name: 'Category' });
    // Opened, then picked from, as two steps, so the rows are drawn between them.
    const pick = async (name: string) => {
      fireEvent.click(screen.getByRole('button', { name: 'Show Category suggestions' }));
      const row = screen.getByRole('option', { name: new RegExp(`^${name}`) });
      await act(async () => {
        fireEvent.click(row);
      });
    };
    const remove = (name: string) =>
      fireEvent.click(screen.getByRole('button', { name: `Remove ${name}` }));
    const sentCategories = () =>
      new URLSearchParams(sent(screen.getByRole('form', { name: 'Filter the Compendium' }))).getAll(
        'categories',
      );
    const pushed = () => new URL(router.push.mock.lastCall![0], 'http://localhost').searchParams;

    it('shows the categories the filter holds as entries in the picker, and not one the page does not know', () => {
      render(
        <CompendiumList
          {...props({ filter: { ...NO_FILTER, categories: ['testcraft', 'gone', 'testward'] } })}
        />,
      );

      expect(screen.getByRole('group', { name: 'Categories' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Remove Testcraft' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Remove Testward' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Remove Testbane' })).not.toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: /^Remove / })).toHaveLength(2);
    });

    it('sends the slugs it shows from the form itself, so a submit before hydration keeps them', () => {
      render(
        <CompendiumList
          {...props({ filter: { ...NO_FILTER, categories: ['testcraft', 'gone', 'testward'] } })}
        />,
      );

      expect(sentCategories()).toEqual(['testcraft', 'testward']);
    });

    it('applies a pick as repeated slugs, carrying the name typed, from the first page', async () => {
      render(
        <CompendiumList
          {...props({
            filter: { ...NO_FILTER, categories: ['testward'] },
            nextHref: compendiumHref({ after: 'a' }),
          })}
        />,
      );

      fireEvent.change(nameBox(), { target: { value: ' Test wort ' } });
      await pick('Testcraft');

      expect(router.push).toHaveBeenCalledTimes(1);
      const address = pushed();
      expect(address.getAll('categories')).toEqual(['testward', 'testcraft']);
      expect(address.get('query')).toBe('Test wort');
      expect(address.has('after')).toBe(false);
    });

    it('applies a removal without the category, and without the parameter once none is left', () => {
      render(
        <CompendiumList
          {...props({ filter: { ...NO_FILTER, categories: ['testward', 'testcraft'] } })}
        />,
      );

      remove('Testward');
      expect(pushed().getAll('categories')).toEqual(['testcraft']);
    });

    it('applies the last removal with no categories parameter', () => {
      render(<CompendiumList {...props({ filter: { ...NO_FILTER, categories: ['testward'] } })} />);

      remove('Testward');
      expect(router.push).toHaveBeenLastCalledWith('/admin/compendium');
    });

    it('keeps the categories it shows when another control applies, and drops one it does not know', () => {
      render(
        <CompendiumList
          {...props({ filter: { ...NO_FILTER, categories: ['testward', 'gone'] } })}
        />,
      );

      fireEvent.click(unsourcedSwitch());

      expect(pushed().getAll('categories')).toEqual(['testward']);
    });

    it('offers the pick to the box until it is picked, and announces it once, in its own status', async () => {
      render(<RoutedCompendium />);
      const before = listStatus();

      await pick('Testward');

      expect(screen.getByRole('button', { name: 'Remove Testward' })).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Show Category suggestions' }));
      expect(screen.queryByRole('option', { name: /^Testward/ })).not.toBeInTheDocument();
      expect(screen.getByRole('status', { name: 'Categories changes' })).not.toBeEmptyDOMElement();
      // The list's own status is the loading skeleton's, gone again with the list.
      expect(listStatus()).toEqual(before);
    });

    // The name typed is applied with the pick, so the list draws the form afresh.
    it('keeps the focus on the Category box when the pick also applies a name typed, and one category stands before it', async () => {
      render(<RoutedCompendium />);
      await pick('Testbane');

      fireEvent.change(nameBox(), { target: { value: 'wort' } });
      await pick('Testward');

      expect(nameBox()).toHaveValue('wort');
      expect(screen.getByRole('button', { name: 'Remove Testward' })).toBeInTheDocument();
      expect(categoryBox()).toHaveFocus();
    });

    it('keeps the focus on the Category box after a pick and after a removal', async () => {
      render(<RoutedCompendium />);

      await pick('Testward');
      expect(categoryBox()).toHaveFocus();

      await act(async () => remove('Testward'));
      expect(categoryBox()).toHaveFocus();
    });
  });

  it('starts again from the form shown when the page shows another form alone', () => {
    const { rerender } = render(<CompendiumList {...props()} />);
    fireEvent.change(formBox(), { target: { value: 'Fixture Powder' } });

    rerender(<CompendiumList {...props({ filter: { ...NO_FILTER, form: 'Fixture Oil' } })} />);

    expect(formBox()).toHaveValue('Fixture Oil');
  });
});

// Clear (MB.115, the owner's call): a link to the unfiltered first page,
// drawn only while the page shows a filter. Tested here once for every list,
// as the filter's loading state is; each other list asserts only which of
// its values count as a filter.
describe('CompendiumList Clear', () => {
  beforeEach(() => {
    router.push.mockReset();
  });

  const clearLink = () => screen.getByRole('link', { name: 'Clear' });

  it('is not drawn while the page shows no filter, text typed or not', () => {
    render(<CompendiumList {...props()} />);
    expect(screen.queryByRole('link', { name: 'Clear' })).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox', { name: 'Name' }), {
      target: { value: 'draft' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'Form' }), { target: { value: 'zz' } });

    expect(screen.queryByRole('link', { name: 'Clear' })).not.toBeInTheDocument();
  });

  it('opens the unfiltered list, whatever the fields hold, while the page shows a filter', () => {
    render(<CompendiumList {...props({ filter: { ...NO_FILTER, query: 'test' } })} />);

    fireEvent.change(screen.getByRole('combobox', { name: 'Name' }), {
      target: { value: 'other' },
    });
    fireEvent.click(clearLink());

    expect(router.push.mock.calls).toEqual([['/admin/compendium']]);
  });

  it('opens the unfiltered list, a status in place of the list and the row off until it arrives', async () => {
    render(
      <Navigating push={router.push}>
        <CompendiumList {...props({ filter: { ...NO_FILTER, query: 'test' } })} />
      </Navigating>,
    );

    const clear = clearLink();
    await act(async () => {
      fireEvent.click(clear);
    });

    expect(router.push).toHaveBeenCalledWith('/admin/compendium');
    expect(listStatus()).toHaveLength(1);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(clear).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('button', { name: 'Search' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('form', { name: 'Filter the Compendium' })).toHaveAttribute(
      'aria-busy',
      'true',
    );

    fireEvent.click(clear);
    expect(router.push).toHaveBeenCalledTimes(1);
  });
});
