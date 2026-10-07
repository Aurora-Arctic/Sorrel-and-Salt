import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CategoryList from '@/components/CategoryList';
import { categoriesHref } from '@/components/CategoryList/href';
import type { CategoryListEntry, CategoryListProps } from '@/components/CategoryList/types';

// `/admin/categories`' filter, table and pager (M5.6, MB.178): each category
// with its group, an Edit link opening it in the page's modal, the filter
// that narrows them, and the pager (claude-docs/components/category-list.md).

const ENTRIES: CategoryListEntry[] = [
  {
    id: 'c1',
    name: 'Testcraft',
    slug: 'testcraft',
    description: 'An invented category',
    groupName: 'Fixture Protection',
    editHref: categoriesHref({}, { edit: 'testcraft' }),
  },
  {
    id: 'c2',
    name: 'Testward',
    slug: 'testward',
    description: 'Another',
    groupName: 'Fixture Healing',
    editHref: categoriesHref({}, { edit: 'testward' }),
  },
];

const GROUPS = [
  { slug: 'fixture-healing', name: 'Fixture Healing' },
  { slug: 'fixture-protection', name: 'Fixture Protection' },
];

const props = (overrides: Partial<CategoryListProps> = {}): CategoryListProps => ({
  categories: ENTRIES,
  filter: { query: '', group: '' },
  groups: GROUPS,
  ...overrides,
});

describe('CategoryList', () => {
  it('lists each category with its group and description', () => {
    render(<CategoryList {...props()} />);

    const rows = within(screen.getByRole('table')).getAllByRole('row');
    expect(rows).toHaveLength(3);
    expect(within(rows[1]).getByRole('cell', { name: 'Testcraft' })).toBeInTheDocument();
    expect(within(rows[1]).getByRole('cell', { name: 'Fixture Protection' })).toBeInTheDocument();
    expect(within(rows[1]).getByRole('cell', { name: 'An invented category' })).toBeInTheDocument();
  });

  it('links each row to its edit modal, named for the category', () => {
    render(<CategoryList {...props()} />);

    expect(screen.getByRole('link', { name: 'Edit Testcraft' })).toHaveAttribute(
      'href',
      '/admin/categories?edit=testcraft',
    );
  });

  it('pages when there is another page either way', () => {
    render(
      <CategoryList
        {...props()}
        previousHref={categoriesHref({ before: 'b' })}
        nextHref={categoriesHref({ after: 'a' })}
      />,
    );

    const pages = screen.getByRole('navigation', { name: 'Pages' });
    expect(within(pages).getByRole('link', { name: 'Prev' })).toHaveAttribute(
      'href',
      '/admin/categories?before=b',
    );
    expect(within(pages).getByRole('link', { name: 'Next' })).toHaveAttribute(
      'href',
      '/admin/categories?after=a',
    );
  });

  it('disables the end that has no page, rather than hiding it', () => {
    render(<CategoryList {...props()} nextHref={categoriesHref({ after: 'a' })} />);

    const pages = screen.getByRole('navigation', { name: 'Pages' });
    expect(within(pages).getByRole('link', { name: 'Prev' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(within(pages).getByRole('link', { name: 'Prev' })).not.toHaveAttribute('href');
    expect(within(pages).getByRole('link', { name: 'Next' })).toHaveAttribute(
      'href',
      '/admin/categories?after=a',
    );
  });

  it('has no pager on a lone page', () => {
    render(<CategoryList {...props()} />);

    expect(screen.queryByRole('navigation', { name: 'Pages' })).not.toBeInTheDocument();
  });

  it('says so when there are none', () => {
    render(<CategoryList {...props({ categories: [] })} />);

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText('No categories yet.')).toBeInTheDocument();
  });

  it.each([
    ['a query', { query: 'nothing', group: '' }],
    ['a group', { query: '', group: 'fixture-healing' }],
  ])('says no category matches when %s finds none', (_, filter) => {
    render(<CategoryList {...props({ categories: [], filter })} />);

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText('No category matches.')).toBeInTheDocument();
    expect(screen.queryByText('No categories yet.')).not.toBeInTheDocument();
  });
});

describe('categoriesHref', () => {
  it('keeps the page a modal opens over, the modal last', () => {
    expect(categoriesHref({ after: 'x/y' }, { edit: 'testcraft' })).toBe(
      '/admin/categories?after=x%2Fy&edit=testcraft',
    );
    expect(categoriesHref({ before: 'b' }, 'new')).toBe('/admin/categories?before=b&new');
    expect(categoriesHref({})).toBe('/admin/categories');
  });

  it('keeps the filter ahead of the cursor and the modal', () => {
    expect(
      categoriesHref({ query: 'test craft', group: 'fixture-healing', after: 'a' }, { edit: 'x' }),
    ).toBe('/admin/categories?query=test+craft&group=fixture-healing&after=a&edit=x');
    expect(categoriesHref({ query: 'test', before: 'b' }, 'new')).toBe(
      '/admin/categories?query=test&before=b&new',
    );
    expect(categoriesHref({ group: 'fixture-healing' })).toBe(
      '/admin/categories?group=fixture-healing',
    );
  });

  it('writes no blank filter', () => {
    expect(categoriesHref({ query: '', group: '' })).toBe('/admin/categories');
  });
});

// MB.178: a GET form to the page itself, as the user list's (MB.52), with
// Filter offered only when there is a new filter to apply.
describe('CategoryList filter', () => {
  const assignMock = vi.fn();

  afterEach(() => {
    assignMock.mockReset();
    vi.unstubAllGlobals();
  });

  const filterButton = () => screen.getByRole('button', { name: 'Filter' });

  it('filters by a GET search to the page itself, keeping what was asked', () => {
    render(<CategoryList {...props({ filter: { query: 'test', group: 'fixture-healing' } })} />);

    // The <search> landmark around it is the e2e spec's to find, as the user
    // list's is: jsdom's role table predates the element.
    const search = screen.getByRole('form', { name: 'Filter categories' });
    expect(search).toHaveAttribute('action', '/admin/categories');
    expect(search).toHaveAttribute('method', 'get');
    const name = within(search).getByRole('searchbox', { name: 'Name' });
    expect(name).toHaveValue('test');
    expect(name).toHaveAttribute('name', 'query');
    const group = within(search).getByRole('combobox', { name: 'Group' });
    expect(group).toHaveValue('fixture-healing');
    expect(group).toHaveAttribute('name', 'group');
  });

  it('offers every group by slug, alphabetical as given, after All groups', () => {
    render(<CategoryList {...props()} />);

    const options = within(screen.getByRole('combobox', { name: 'Group' })).getAllByRole('option');
    expect(options.map((option) => [option.textContent, option.getAttribute('value')])).toEqual([
      ['All groups', ''],
      ['Fixture Healing', 'fixture-healing'],
      ['Fixture Protection', 'fixture-protection'],
    ]);
    expect(screen.getByRole('combobox', { name: 'Group' })).toHaveValue('');
  });

  it('is disabled while the form matches the filter shown', () => {
    render(<CategoryList {...props({ filter: { query: 'test', group: 'fixture-healing' } })} />);

    expect(filterButton()).toBeDisabled();
  });

  it('enables once the query differs, and disables again when it is put back', () => {
    render(<CategoryList {...props({ filter: { query: 'test', group: '' } })} />);
    const box = screen.getByRole('searchbox', { name: 'Name' });

    fireEvent.change(box, { target: { value: 'testc' } });
    expect(filterButton()).toBeEnabled();

    fireEvent.change(box, { target: { value: 'test ' } });
    expect(filterButton()).toBeDisabled();
  });

  it('enables once the group differs, and disables again when it is put back', () => {
    render(<CategoryList {...props()} />);
    const group = screen.getByRole('combobox', { name: 'Group' });

    fireEvent.change(group, { target: { value: 'fixture-protection' } });
    expect(filterButton()).toBeEnabled();

    fireEvent.change(group, { target: { value: '' } });
    expect(filterButton()).toBeDisabled();
  });

  it('opens the filtered list from its first page', () => {
    vi.stubGlobal('location', { ...window.location, assign: assignMock });
    render(<CategoryList {...props({ previousHref: categoriesHref({ before: 'b' }) })} />);

    fireEvent.change(screen.getByRole('searchbox', { name: 'Name' }), {
      target: { value: ' Test craft ' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'Group' }), {
      target: { value: 'fixture-protection' },
    });
    fireEvent.click(filterButton());

    expect(assignMock).toHaveBeenCalledWith(
      '/admin/categories?query=Test+craft&group=fixture-protection',
    );
  });

  it('opens the unfiltered list when the filter is cleared', () => {
    vi.stubGlobal('location', { ...window.location, assign: assignMock });
    render(<CategoryList {...props({ filter: { query: 'test', group: 'fixture-healing' } })} />);

    fireEvent.change(screen.getByRole('searchbox', { name: 'Name' }), { target: { value: '' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Group' }), { target: { value: '' } });
    fireEvent.click(filterButton());

    expect(assignMock).toHaveBeenCalledWith('/admin/categories');
  });
});
