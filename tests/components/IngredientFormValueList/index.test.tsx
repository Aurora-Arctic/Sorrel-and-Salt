import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import IngredientFormValueList from '@/components/IngredientFormValueList';
import { formsHref } from '@/components/IngredientFormValueList/href';
import type {
  IngredientFormValueListEntry,
  IngredientFormValueListProps,
} from '@/components/IngredientFormValueList/types';
import { Navigating } from '../../support/navigating';

// The soft pager and the filter navigate through the App Router; Vitest hoists the mock above the imports.
const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// `/admin/forms`' filter, table and pager (M5.6a): each form with its group,
// an Edit link opening it in the page's modal, the filter that narrows them,
// and the pager (claude-docs/components/ingredient-form-value-list.md).

const ENTRIES: IngredientFormValueListEntry[] = [
  {
    id: 'f1',
    name: 'Testwort Shard',
    slug: 'testwort-shard-fixture-mineral',
    description: 'An invented form',
    groupName: 'Fixture Mineral',
    editHref: formsHref({}, { edit: 'testwort-shard-fixture-mineral' }),
  },
  {
    id: 'f2',
    name: 'Testwort Sliver',
    slug: 'testwort-sliver-fixture-substance',
    description: 'Another',
    groupName: 'Fixture Substance',
    editHref: formsHref({}, { edit: 'testwort-sliver-fixture-substance' }),
  },
];

const GROUPS = [
  { slug: 'fixture-mineral', name: 'Fixture Mineral' },
  { slug: 'fixture-substance', name: 'Fixture Substance' },
];

const props = (
  overrides: Partial<IngredientFormValueListProps> = {},
): IngredientFormValueListProps => ({
  forms: ENTRIES,
  filter: { query: '', group: '' },
  groups: GROUPS,
  ...overrides,
});

describe('IngredientFormValueList', () => {
  it('lists each form with its group and description', () => {
    render(<IngredientFormValueList {...props()} />);

    const rows = within(screen.getByRole('table')).getAllByRole('row');
    expect(rows).toHaveLength(3);
    expect(within(rows[1]).getByRole('cell', { name: 'Testwort Shard' })).toBeInTheDocument();
    expect(within(rows[1]).getByRole('cell', { name: 'Fixture Mineral' })).toBeInTheDocument();
    expect(within(rows[1]).getByRole('cell', { name: 'An invented form' })).toBeInTheDocument();
  });

  it('links each row to its edit modal, named for the form', () => {
    render(<IngredientFormValueList {...props()} />);

    expect(screen.getByRole('link', { name: 'Edit Testwort Shard' })).toHaveAttribute(
      'href',
      '/admin/forms?edit=testwort-shard-fixture-mineral',
    );
  });

  it('pages when there is another page either way, saying where it stands', () => {
    render(
      <IngredientFormValueList
        {...props()}
        previousHref={formsHref({ before: 'b' })}
        nextHref={formsHref({ after: 'a' })}
        position={{ page: 2, pages: 3 }}
      />,
    );

    const pages = screen.getByRole('navigation', { name: 'Pages' });
    expect(within(pages).getByRole('link', { name: 'Prev' })).toHaveAttribute(
      'href',
      '/admin/forms?before=b',
    );
    expect(within(pages).getByRole('link', { name: 'Next' })).toHaveAttribute(
      'href',
      '/admin/forms?after=a',
    );
    expect(pages).toHaveTextContent('Page 2 of 3');
  });

  it('disables the end that has no page, rather than hiding it', () => {
    render(<IngredientFormValueList {...props()} nextHref={formsHref({ after: 'a' })} />);

    const pages = screen.getByRole('navigation', { name: 'Pages' });
    expect(within(pages).getByRole('link', { name: 'Prev' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(within(pages).getByRole('link', { name: 'Prev' })).not.toHaveAttribute('href');
  });

  it('has no pager on a lone page', () => {
    render(<IngredientFormValueList {...props()} />);

    expect(screen.queryByRole('navigation', { name: 'Pages' })).not.toBeInTheDocument();
  });

  it('says so when there are none', () => {
    render(<IngredientFormValueList {...props({ forms: [] })} />);

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText('No forms yet.')).toBeInTheDocument();
  });

  it.each([
    ['a query', { query: 'nothing', group: '' }],
    ['a group', { query: '', group: 'fixture-mineral' }],
  ])('says no form matches when %s finds none', (_, filter) => {
    render(<IngredientFormValueList {...props({ forms: [], filter })} />);

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText('No form matches.')).toBeInTheDocument();
    expect(screen.queryByText('No forms yet.')).not.toBeInTheDocument();
  });
});

describe('formsHref', () => {
  it('keeps the page a modal opens over, the modal last', () => {
    expect(formsHref({ after: 'x/y' }, { edit: 'testwort-shard' })).toBe(
      '/admin/forms?after=x%2Fy&edit=testwort-shard',
    );
    expect(formsHref({ before: 'b' }, 'new')).toBe('/admin/forms?before=b&new');
    expect(formsHref({}, 'new')).toBe('/admin/forms?new');
    expect(formsHref({})).toBe('/admin/forms');
  });
});

describe('formsHref under a filter', () => {
  it('keeps the filter ahead of the cursor and the modal', () => {
    expect(
      formsHref({ query: 'testwort sh', group: 'fixture-mineral', after: 'a' }, { edit: 'x' }),
    ).toBe('/admin/forms?query=testwort+sh&group=fixture-mineral&after=a&edit=x');
    expect(formsHref({ query: 'shard', before: 'b' }, 'new')).toBe(
      '/admin/forms?query=shard&before=b&new',
    );
    expect(formsHref({ group: 'fixture-mineral' })).toBe('/admin/forms?group=fixture-mineral');
  });

  it('writes no blank filter', () => {
    expect(formsHref({ query: '', group: '' })).toBe('/admin/forms');
  });
});

// A GET form to the page itself, as the categories' (MB.178), with Filter
// offered only when there is a new filter to apply.
describe('IngredientFormValueList filter', () => {
  beforeEach(() => {
    router.push.mockReset();
  });

  const filterButton = () => screen.getByRole('button', { name: 'Filter' });

  it('filters by a GET search to the page itself, keeping what was asked', () => {
    render(
      <IngredientFormValueList
        {...props({ filter: { query: 'shard', group: 'fixture-mineral' } })}
      />,
    );

    // The <search> landmark around it is the e2e spec's to find, as the
    // categories' is: jsdom's role table predates the element.
    const search = screen.getByRole('form', { name: 'Filter forms' });
    expect(search).toHaveAttribute('action', '/admin/forms');
    expect(search).toHaveAttribute('method', 'get');
    const name = within(search).getByRole('searchbox', { name: 'Name' });
    expect(name).toHaveValue('shard');
    expect(name).toHaveAttribute('name', 'query');
    const group = within(search).getByRole('combobox', { name: 'Group' });
    expect(group).toHaveValue('fixture-mineral');
    expect(group).toHaveAttribute('name', 'group');
  });

  it('offers every group by slug, alphabetical as given, after All groups', () => {
    render(<IngredientFormValueList {...props()} />);

    const options = within(screen.getByRole('combobox', { name: 'Group' })).getAllByRole('option');
    expect(options.map((option) => [option.textContent, option.getAttribute('value')])).toEqual([
      ['All groups', ''],
      ['Fixture Mineral', 'fixture-mineral'],
      ['Fixture Substance', 'fixture-substance'],
    ]);
    expect(screen.getByRole('combobox', { name: 'Group' })).toHaveValue('');
  });

  it('is disabled while the form matches the filter shown', () => {
    render(
      <IngredientFormValueList
        {...props({ filter: { query: 'shard', group: 'fixture-mineral' } })}
      />,
    );

    expect(filterButton()).toBeDisabled();
  });

  it('enables once the query differs, and disables again when it is put back', () => {
    render(<IngredientFormValueList {...props({ filter: { query: 'shard', group: '' } })} />);
    const box = screen.getByRole('searchbox', { name: 'Name' });

    fireEvent.change(box, { target: { value: 'shards' } });
    expect(filterButton()).toBeEnabled();

    fireEvent.change(box, { target: { value: 'shard ' } });
    expect(filterButton()).toBeDisabled();
  });

  it('enables once the group differs, and disables again when it is put back', () => {
    render(<IngredientFormValueList {...props()} />);
    const group = screen.getByRole('combobox', { name: 'Group' });

    fireEvent.change(group, { target: { value: 'fixture-substance' } });
    expect(filterButton()).toBeEnabled();

    fireEvent.change(group, { target: { value: '' } });
    expect(filterButton()).toBeDisabled();
  });

  it('opens the filtered list from its first page', () => {
    render(<IngredientFormValueList {...props({ previousHref: formsHref({ before: 'b' }) })} />);

    fireEvent.change(screen.getByRole('searchbox', { name: 'Name' }), {
      target: { value: ' Testwort sh ' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'Group' }), {
      target: { value: 'fixture-substance' },
    });
    fireEvent.click(filterButton());

    expect(router.push).toHaveBeenCalledWith(
      '/admin/forms?query=Testwort+sh&group=fixture-substance',
    );
  });

  it('opens the unfiltered list when the filter is cleared', () => {
    render(
      <IngredientFormValueList
        {...props({ filter: { query: 'shard', group: 'fixture-mineral' } })}
      />,
    );

    fireEvent.change(screen.getByRole('searchbox', { name: 'Name' }), { target: { value: '' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Group' }), { target: { value: '' } });
    fireEvent.click(filterButton());

    expect(router.push).toHaveBeenCalledWith('/admin/forms');
  });

  it('shows it is filtering until the filtered list arrives', async () => {
    render(
      <Navigating push={router.push}>
        <IngredientFormValueList {...props()} />
      </Navigating>,
    );

    fireEvent.change(screen.getByRole('searchbox', { name: 'Name' }), {
      target: { value: 'shard' },
    });
    await act(async () => {
      fireEvent.click(filterButton());
    });

    const busy = screen.getByRole('button', { name: 'Filtering' });
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute('aria-busy', 'true');
    expect(router.push).toHaveBeenCalledWith('/admin/forms?query=shard');
  });

  it('starts again from the filter shown when the page shows another', () => {
    const { rerender } = render(<IngredientFormValueList {...props()} />);
    fireEvent.change(screen.getByRole('searchbox', { name: 'Name' }), {
      target: { value: 'draft' },
    });

    // Back to an older filter is a soft navigation: the page renders again with it.
    rerender(
      <IngredientFormValueList
        {...props({ filter: { query: 'shard', group: 'fixture-mineral' } })}
      />,
    );

    expect(screen.getByRole('searchbox', { name: 'Name' })).toHaveValue('shard');
    expect(screen.getByRole('combobox', { name: 'Group' })).toHaveValue('fixture-mineral');
    expect(filterButton()).toBeDisabled();
  });
});
