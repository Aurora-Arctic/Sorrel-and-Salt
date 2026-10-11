import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CompendiumList from '@/components/CompendiumList';
import { compendiumHref } from '@/components/CompendiumList/href';
import type { CompendiumListEntry, CompendiumListProps } from '@/components/CompendiumList/types';
import { Navigating } from '../../support/navigating';

// The filter navigates through the App Router; Vitest hoists the mock above the imports.
const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// `/admin/compendium`'s filter, table and pager (M5.5): each entry with its
// formal name and form, an Edit link opening it in the page's modal, the
// filter that narrows them to the admin's to-do lists, and the pager
// (claude-docs/components/compendium-list.md).

const ENTRIES: CompendiumListEntry[] = [
  {
    id: 'i1',
    name: 'Testwort',
    slug: 'testwort',
    nomenclature: 'botanical',
    canonicalName: 'Fixtura testalis',
    form: 'dried',
    editHref: compendiumHref({}, { edit: 'testwort' }),
  },
  {
    id: 'i2',
    name: 'Fixture Salt',
    slug: 'fixture-salt',
    nomenclature: 'unknown',
    canonicalName: null,
    form: null,
    editHref: compendiumHref({}, { edit: 'fixture-salt' }),
  },
];

const NO_FILTER = { query: '', nomenclature: '', withoutReferences: false } as const;

const props = (overrides: Partial<CompendiumListProps> = {}): CompendiumListProps => ({
  entries: ENTRIES,
  filter: NO_FILTER,
  ...overrides,
});

describe('CompendiumList', () => {
  it('lists each entry with its formal name and form', () => {
    render(<CompendiumList {...props()} />);

    const rows = within(screen.getByRole('table')).getAllByRole('row');
    expect(rows).toHaveLength(3);
    expect(within(rows[1]).getByRole('cell', { name: 'Testwort' })).toBeInTheDocument();
    expect(within(rows[1]).getByRole('cell', { name: 'Fixtura testalis' })).toBeInTheDocument();
    expect(within(rows[1]).getByRole('cell', { name: 'dried' })).toBeInTheDocument();
    expect(within(rows[2]).getByRole('cell', { name: 'Fixture Salt' })).toBeInTheDocument();
  });

  it('links each row to its edit modal, named for the entry and its form', () => {
    render(<CompendiumList {...props()} />);

    expect(screen.getByRole('link', { name: 'Edit Testwort, dried' })).toHaveAttribute(
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
        { query: 'test wort', nomenclature: 'unknown', withoutReferences: true, after: 'a' },
        { edit: 'x' },
      ),
    ).toBe(
      '/admin/compendium?query=test+wort&nomenclature=unknown&withoutReferences=1&after=a&edit=x',
    );
    expect(compendiumHref({ query: 'test', before: 'b' }, 'new')).toBe(
      '/admin/compendium?query=test&before=b&new',
    );
    expect(compendiumHref({ withoutReferences: true })).toBe(
      '/admin/compendium?withoutReferences=1',
    );
  });

  it('writes no blank filter', () => {
    expect(compendiumHref({ query: '', nomenclature: '', withoutReferences: false })).toBe(
      '/admin/compendium',
    );
  });
});

// MB.178's GET form to the page itself, as the category list's, with Filter
// offered only when there is a new filter to apply.
describe('CompendiumList filter', () => {
  beforeEach(() => {
    router.push.mockReset();
  });

  const filterButton = () => screen.getByRole('button', { name: 'Filter' });

  it('filters by a GET search to the page itself, keeping what was asked', () => {
    render(
      <CompendiumList
        {...props({ filter: { query: 'test', nomenclature: 'unknown', withoutReferences: true } })}
      />,
    );

    // The <search> landmark around it is the e2e spec's to find, as the
    // category list's is: jsdom's role table predates the element.
    const search = screen.getByRole('form', { name: 'Filter the compendium' });
    expect(search).toHaveAttribute('action', '/admin/compendium');
    expect(search).toHaveAttribute('method', 'get');
    const name = within(search).getByRole('searchbox', { name: 'Name' });
    expect(name).toHaveValue('test');
    expect(name).toHaveAttribute('name', 'query');
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

  it('is disabled while the form matches the filter shown', () => {
    render(
      <CompendiumList
        {...props({ filter: { query: 'test', nomenclature: 'unknown', withoutReferences: true } })}
      />,
    );

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
    fireEvent.change(screen.getByRole('combobox', { name: 'Classification' }), {
      target: { value: 'unknown' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Without References' }));
    fireEvent.click(filterButton());

    expect(router.push).toHaveBeenCalledWith(
      '/admin/compendium?query=Test+wort&nomenclature=unknown&withoutReferences=1',
    );
  });

  it('opens the unfiltered list when the filter is cleared', () => {
    render(
      <CompendiumList
        {...props({ filter: { query: 'test', nomenclature: 'unknown', withoutReferences: true } })}
      />,
    );

    fireEvent.change(screen.getByRole('searchbox', { name: 'Name' }), { target: { value: '' } });
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
    rerender(
      <CompendiumList
        {...props({ filter: { query: 'test', nomenclature: 'unknown', withoutReferences: true } })}
      />,
    );

    expect(screen.getByRole('searchbox', { name: 'Name' })).toHaveValue('test');
    expect(screen.getByRole('combobox', { name: 'Classification' })).toHaveValue('unknown');
    expect(screen.getByRole('checkbox', { name: 'Without References' })).toBeChecked();
    expect(filterButton()).toBeDisabled();
  });
});
