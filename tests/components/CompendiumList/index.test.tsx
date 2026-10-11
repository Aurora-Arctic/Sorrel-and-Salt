import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import CompendiumList from '@/components/CompendiumList';
import { compendiumHref } from '@/components/CompendiumList/href';
import type {
  CompendiumListEntry,
  CompendiumListFilter,
  CompendiumListProps,
} from '@/components/CompendiumList/types';
import { Navigating } from '../../support/navigating';

// The filter navigates through the App Router; Vitest hoists the mock above the imports.
const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// `/admin/compendium`'s filter, table and pager (M5.5): each entry with its
// formal name and live forms, an Edit link opening it in the page's modal, the
// filter that narrows them to the admin's to-do lists, and the pager
// (claude-docs/components/compendium-list.md).

const ENTRIES: CompendiumListEntry[] = [
  {
    id: 'i1',
    name: 'Testwort',
    slug: 'testwort',
    nomenclature: 'botanical',
    canonicalName: 'Fixtura testalis',
    forms: ['Fixture Herb', 'Fixture Oil'],
    editHref: compendiumHref({}, { edit: 'testwort' }),
  },
  {
    id: 'i2',
    name: 'Fixture Salt',
    slug: 'fixture-salt',
    nomenclature: 'unknown',
    canonicalName: null,
    forms: [],
    editHref: compendiumHref({}, { edit: 'fixture-salt' }),
  },
];

const NO_FILTER = { query: '', form: '', nomenclature: '', withoutReferences: false } as const;

/** Every filter in use, as a page shows it. */
const SHOWN: CompendiumListFilter = {
  query: 'test',
  form: 'Fixture Oil',
  nomenclature: 'unknown',
  withoutReferences: true,
};

/** The curated forms the Form box offers. */
const FORMS = [{ name: 'Fixture Oil' }, { name: 'Fixture Powder' }, { name: 'Fixture Resin' }];

const props = (overrides: Partial<CompendiumListProps> = {}): CompendiumListProps => ({
  entries: ENTRIES,
  filter: NO_FILTER,
  forms: FORMS,
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

// MB.178's GET form to the page itself, as the category list's, with Filter
// offered only when there is a new filter to apply.
describe('CompendiumList filter', () => {
  beforeEach(() => {
    router.push.mockReset();
  });

  const filterButton = () => screen.getByRole('button', { name: 'Filter' });
  const formBox = () => screen.getByRole('combobox', { name: 'Form' });

  it('filters by a GET search to the page itself, keeping what was asked', () => {
    render(<CompendiumList {...props({ filter: SHOWN })} />);

    // The <search> landmark around it is the e2e spec's to find, as the
    // category list's is: jsdom's role table predates the element.
    const search = screen.getByRole('form', { name: 'Filter the Compendium' });
    expect(search).toHaveAttribute('action', '/admin/compendium');
    expect(search).toHaveAttribute('method', 'get');
    const name = within(search).getByRole('searchbox', { name: 'Name' });
    expect(name).toHaveValue('test');
    expect(name).toHaveAttribute('name', 'query');
    expect(within(search).getByRole('combobox', { name: 'Form' })).toHaveValue('Fixture Oil');
    // The form goes under its own parameter, by its text, as the select sends it.
    expect(new FormData(search as HTMLFormElement).get('form')).toBe('Fixture Oil');
    const kind = within(search).getByRole('combobox', { name: 'Classification' });
    expect(kind).toHaveValue('unknown');
    expect(kind).toHaveAttribute('name', 'nomenclature');
    const unsourced = within(search).getByRole('checkbox', { name: 'Without References' });
    expect(unsourced).toBeChecked();
    expect(unsourced).toHaveAttribute('name', 'withoutReferences');
    expect(unsourced).toHaveAttribute('value', '1');
  });

  it('offers every classification, after the option for any', () => {
    render(<CompendiumList {...props()} />);

    const kind = screen.getByRole('combobox', { name: 'Classification' });
    expect(
      within(kind)
        .getAllByRole('option')
        .map((option) => option.getAttribute('value')),
    ).toEqual(['', 'botanical', 'fungal', 'zoological', 'mineral', 'chemical', 'unknown', 'none']);
    expect(kind).toHaveValue('');
  });

  // The owner's call (MB.115), as the curated lists' group filter: typed
  // into once hydrated, but drawn as a native select by the server, so the
  // filter works before JavaScript.
  it('draws the form as a native select on the server, and as a type-ahead once hydrated', async () => {
    const page = <CompendiumList {...props({ filter: SHOWN })} />;
    const container = document.createElement('div');
    container.innerHTML = renderToString(page);
    document.body.append(container);
    onTestFinished(() => container.remove());

    const served = within(container).getByRole('combobox', { name: 'Form' });
    expect(served).toHaveValue('Fixture Oil');
    expect(served).toHaveAttribute('name', 'form');
    expect(
      within(served)
        .getAllByRole('option')
        .map((option) => option.getAttribute('value')),
    ).toEqual(['', ...FORMS.map((form) => form.name)]);
    expect(served).not.toHaveAttribute('aria-autocomplete');

    const root = await act(async () => hydrateRoot(container, page));
    onTestFinished(() => act(() => root.unmount()));
    const hydrated = within(container).getByRole('combobox', { name: 'Form' });
    expect(hydrated).toHaveAttribute('aria-autocomplete', 'list');
    expect(hydrated).toHaveValue('Fixture Oil');
  });

  it('narrows the forms as their name is typed', () => {
    render(<CompendiumList {...props()} />);

    fireEvent.click(formBox());
    expect(
      within(screen.getByRole('listbox', { name: 'Form choices' })).getAllByRole('option'),
    ).toHaveLength(FORMS.length);
    fireEvent.change(formBox(), { target: { value: 'POWD' } });
    expect(
      within(screen.getByRole('listbox', { name: 'Form choices' })).getAllByRole('option'),
    ).toHaveLength(1);
    expect(filterButton()).toBeDisabled();
  });

  it('enables once a form is picked, and disables again when it is cleared', () => {
    render(<CompendiumList {...props()} />);

    fireEvent.click(formBox());
    fireEvent.click(screen.getByRole('option', { name: 'Fixture Powder' }));
    expect(formBox()).toHaveValue('Fixture Powder');
    expect(filterButton()).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Clear Form' }));
    expect(formBox()).toHaveValue('');
    expect(filterButton()).toBeDisabled();
  });

  it('is disabled while the form matches the filter shown', () => {
    render(<CompendiumList {...props({ filter: SHOWN })} />);

    expect(filterButton()).toBeDisabled();
  });

  it('enables once the query differs, and disables again when it is put back', () => {
    render(<CompendiumList {...props({ filter: { ...NO_FILTER, query: 'test' } })} />);
    const box = screen.getByRole('searchbox', { name: 'Name' });

    fireEvent.change(box, { target: { value: 'testw' } });
    expect(filterButton()).toBeEnabled();

    fireEvent.change(box, { target: { value: 'test ' } });
    expect(filterButton()).toBeDisabled();
  });

  it('enables once the classification differs, and disables again when it is put back', () => {
    render(<CompendiumList {...props()} />);
    const kind = screen.getByRole('combobox', { name: 'Classification' });

    fireEvent.change(kind, { target: { value: 'mineral' } });
    expect(filterButton()).toBeEnabled();

    fireEvent.change(kind, { target: { value: '' } });
    expect(filterButton()).toBeDisabled();
  });

  it('enables once Without References differs, and disables again when it is put back', () => {
    render(<CompendiumList {...props()} />);
    const unsourced = screen.getByRole('checkbox', { name: 'Without References' });

    fireEvent.click(unsourced);
    expect(filterButton()).toBeEnabled();

    fireEvent.click(unsourced);
    expect(filterButton()).toBeDisabled();
  });

  it('opens the filtered list from its first page', () => {
    render(<CompendiumList {...props({ previousHref: compendiumHref({ before: 'b' }) })} />);

    fireEvent.change(screen.getByRole('searchbox', { name: 'Name' }), {
      target: { value: ' Test wort ' },
    });
    fireEvent.change(formBox(), { target: { value: 'oil' } });
    fireEvent.click(screen.getByRole('option', { name: 'Fixture Oil' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Classification' }), {
      target: { value: 'unknown' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Without References' }));
    fireEvent.click(filterButton());

    expect(router.push).toHaveBeenCalledWith(
      '/admin/compendium?query=Test+wort&form=Fixture+Oil&nomenclature=unknown&withoutReferences=1',
    );
  });

  it('opens the unfiltered list when the filter is cleared', () => {
    render(<CompendiumList {...props({ filter: SHOWN })} />);

    fireEvent.change(screen.getByRole('searchbox', { name: 'Name' }), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Clear Form' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Classification' }), {
      target: { value: '' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Without References' }));
    fireEvent.click(filterButton());

    expect(router.push).toHaveBeenCalledWith('/admin/compendium');
  });

  it('shows it is filtering until the filtered list arrives', async () => {
    render(
      <Navigating push={router.push}>
        <CompendiumList {...props()} />
      </Navigating>,
    );

    fireEvent.click(screen.getByRole('checkbox', { name: 'Without References' }));
    const busy = filterButton();
    await act(async () => {
      fireEvent.click(busy);
    });

    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute('aria-busy', 'true');
    expect(router.push).toHaveBeenCalledWith('/admin/compendium?withoutReferences=1');
  });

  it('starts again from the filter shown when the page shows another', () => {
    const { rerender } = render(<CompendiumList {...props()} />);
    fireEvent.change(screen.getByRole('searchbox', { name: 'Name' }), {
      target: { value: 'draft' },
    });

    // Back to an older filter is a soft navigation: the page renders again with it.
    rerender(<CompendiumList {...props({ filter: SHOWN })} />);

    expect(screen.getByRole('searchbox', { name: 'Name' })).toHaveValue('test');
    expect(formBox()).toHaveValue('Fixture Oil');
    expect(screen.getByRole('combobox', { name: 'Classification' })).toHaveValue('unknown');
    expect(screen.getByRole('checkbox', { name: 'Without References' })).toBeChecked();
    expect(filterButton()).toBeDisabled();
  });

  it('starts again from the form shown when the page shows another form alone', () => {
    const { rerender } = render(<CompendiumList {...props()} />);
    fireEvent.click(formBox());
    fireEvent.click(screen.getByRole('option', { name: 'Fixture Powder' }));

    rerender(<CompendiumList {...props({ filter: { ...NO_FILTER, form: 'Fixture Oil' } })} />);

    expect(formBox()).toHaveValue('Fixture Oil');
    expect(filterButton()).toBeDisabled();
  });
});

// Clear Filters (MB.115, the owner's call): a link to the unfiltered first
// page, offered while the page shows a filter and off, not gone, while it
// shows none. Tested here once for every list, as the filter's spinner is;
// each other list asserts only which of its values count as a filter.
describe('CompendiumList Clear Filters', () => {
  beforeEach(() => {
    router.push.mockReset();
  });

  const clearLink = () => screen.getByRole('link', { name: 'Clear Filters' });
  const filterButton = () => screen.getByRole('button', { name: 'Filter' });

  it('links to the unfiltered first page while the page shows any filter', () => {
    for (const filter of [
      { ...NO_FILTER, query: 'test' },
      { ...NO_FILTER, form: 'Fixture Oil' },
      { ...NO_FILTER, nomenclature: 'unknown' as const },
      { ...NO_FILTER, withoutReferences: true },
    ]) {
      const { unmount } = render(
        <CompendiumList
          {...props({ filter, previousHref: compendiumHref({ ...filter, before: 'b' }) })}
        />,
      );

      expect(clearLink()).toHaveAttribute('href', '/admin/compendium');
      expect(clearLink()).not.toHaveAttribute('aria-disabled');
      unmount();
    }
  });

  it('is off while neither the page nor the fields hold a filter', () => {
    render(<CompendiumList {...props()} />);

    expect(clearLink()).toHaveAttribute('aria-disabled', 'true');
    expect(clearLink()).not.toHaveAttribute('href');
  });

  // The owner's call at MB.115's review: values not yet applied are cleared
  // too, where they are, with nothing to navigate to.
  it('empties every field in place when only the fields hold values, without navigating', () => {
    render(<CompendiumList {...props()} />);
    const name = screen.getByRole('searchbox', { name: 'Name' });
    const formBox = screen.getByRole('combobox', { name: 'Form' });

    fireEvent.change(name, { target: { value: 'draft' } });
    expect(clearLink()).toHaveAttribute('href', '/admin/compendium');
    fireEvent.change(formBox, { target: { value: 'oil' } });
    fireEvent.click(screen.getByRole('option', { name: 'Fixture Oil' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Classification' }), {
      target: { value: 'mineral' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Without References' }));
    fireEvent.click(clearLink());

    expect(router.push).not.toHaveBeenCalled();
    const search = screen.getByRole('form', { name: 'Filter the Compendium' });
    expect(Object.fromEntries(new FormData(search as HTMLFormElement))).toEqual({
      query: '',
      form: '',
      nomenclature: '',
    });
    expect(screen.getByRole('combobox', { name: 'Form' })).toHaveValue('');
    expect(screen.getByRole('checkbox', { name: 'Without References' })).not.toBeChecked();
    expect(screen.getByRole('searchbox', { name: 'Name' })).toHaveFocus();
    expect(filterButton()).toBeDisabled();
    expect(clearLink()).toHaveAttribute('aria-disabled', 'true');
  });

  it('empties a type-ahead holding text that names no choice', () => {
    render(<CompendiumList {...props()} />);

    fireEvent.change(screen.getByRole('searchbox', { name: 'Name' }), {
      target: { value: 'draft' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'Form' }), { target: { value: 'zz' } });
    fireEvent.click(clearLink());

    expect(screen.getByRole('combobox', { name: 'Form' })).toHaveValue('');
  });

  it('opens the unfiltered list, not the fields emptied in place, while the page shows a filter', () => {
    render(<CompendiumList {...props({ filter: { ...NO_FILTER, query: 'test' } })} />);

    fireEvent.change(screen.getByRole('searchbox', { name: 'Name' }), {
      target: { value: 'other' },
    });
    fireEvent.click(clearLink());

    expect(router.push).toHaveBeenCalledWith('/admin/compendium');
  });

  it('opens the unfiltered list, busy until it arrives', async () => {
    render(
      <Navigating push={router.push}>
        <CompendiumList {...props({ filter: { ...NO_FILTER, query: 'test' } })} />
      </Navigating>,
    );

    const busy = clearLink();
    await act(async () => {
      fireEvent.click(busy);
    });

    expect(router.push).toHaveBeenCalledWith('/admin/compendium');
    expect(busy).toHaveAttribute('aria-busy', 'true');
    expect(filterButton()).not.toHaveAttribute('aria-busy');
    expect(filterButton()).toBeDisabled();
  });
});
