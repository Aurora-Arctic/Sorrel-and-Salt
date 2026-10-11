import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GroupedValueList from '@/components/GroupedValueList';
import { groupedValuesHref } from '@/components/GroupedValueList/href';
import type {
  GroupedValueListProps,
  GroupedValuesDialog,
  GroupedValuesPlace,
} from '@/components/GroupedValueList/types';
import type { GroupedValueListSubject } from '../../support/types';

// The soft pager and the filter navigate through the App Router; Vitest hoists the mock above the imports.
const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// A grouped vocabulary's filter, table and pager — `/admin/categories`' (M5.6,
// MB.178), `/admin/forms`' (M5.6a) and `/admin/deities`' (MB.132): each value
// with its group, an Edit link opening it in the page's modal, and the filter
// that narrows them (claude-docs/components/grouped-value-list.md). The kinds
// share every behaviour, so it runs on the deities, whose group goes by its
// own name; the other kinds get only what they change, their page and their
// group's parameter. Paging is Pager's, the filter's spinner and its reset to
// the filter shown CompendiumList's.

const DEITIES: GroupedValueListSubject = {
  kind: 'deity',
  path: '/admin/deities',
  filterName: 'Filter deities',
  groupLabel: 'Tradition',
  groupParam: 'tradition',
  entries: [
    {
      id: 'd1',
      name: 'Testra',
      slug: 'testra-fixtural',
      description: 'An invented god',
      groupName: 'Fixtural',
      editHref: groupedValuesHref('deity', {}, { edit: 'testra-fixtural' }),
    },
    {
      id: 'd2',
      name: 'Mockra',
      slug: 'mockra-mockish',
      description: 'Another',
      groupName: 'Mockish',
      editHref: groupedValuesHref('deity', {}, { edit: 'mockra-mockish' }),
    },
  ],
  groups: [
    { slug: 'fixtural', name: 'Fixtural' },
    { slug: 'mockish', name: 'Mockish' },
  ],
  query: 'tra',
};

const props = (overrides: Partial<GroupedValueListProps> = {}): GroupedValueListProps => ({
  kind: DEITIES.kind,
  values: DEITIES.entries,
  filter: { query: '', group: '' },
  groups: DEITIES.groups,
  ...overrides,
});

describe('GroupedValueList', () => {
  const { path, entries, groups } = DEITIES;

  it('lists each value with its group and description', () => {
    render(<GroupedValueList {...props()} />);

    const rows = within(screen.getByRole('table')).getAllByRole('row');
    expect(rows).toHaveLength(3);
    expect(within(rows[1]).getByRole('cell', { name: entries[0].name })).toBeInTheDocument();
    expect(within(rows[1]).getByRole('cell', { name: entries[0].groupName })).toBeInTheDocument();
    expect(within(rows[1]).getByRole('cell', { name: entries[0].description })).toBeInTheDocument();
  });

  it('links each row to its edit modal, named for the value', () => {
    render(<GroupedValueList {...props()} />);

    expect(screen.getByRole('link', { name: `Edit ${entries[0].name}` })).toHaveAttribute(
      'href',
      `${path}?edit=${entries[0].slug}`,
    );
  });

  it('draws no table when there are none, filtered or not', () => {
    const { rerender } = render(<GroupedValueList {...props({ values: [] })} />);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    rerender(
      <GroupedValueList {...props({ values: [], filter: { query: '', group: groups[0].slug } })} />,
    );
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  describe('groupedValuesHref', () => {
    const href = (place: GroupedValuesPlace, dialog?: GroupedValuesDialog) =>
      groupedValuesHref(DEITIES.kind, place, dialog);

    it('keeps the page a modal opens over, the modal last', () => {
      expect(href({ after: 'x/y' }, { edit: entries[0].slug })).toBe(
        `${path}?after=x%2Fy&edit=${entries[0].slug}`,
      );
      expect(href({ before: 'b' }, 'new')).toBe(`${path}?before=b&new`);
      expect(href({}, 'new')).toBe(`${path}?new`);
      expect(href({})).toBe(path);
    });

    it('keeps the filter ahead of the cursor and the modal, the group under its own name', () => {
      const group = `${DEITIES.groupParam}=${groups[0].slug}`;
      expect(href({ query: 'two words', group: groups[0].slug, after: 'a' }, { edit: 'x' })).toBe(
        `${path}?query=two+words&${group}&after=a&edit=x`,
      );
      expect(href({ query: DEITIES.query, before: 'b' }, 'new')).toBe(
        `${path}?query=${DEITIES.query}&before=b&new`,
      );
      expect(href({ group: groups[0].slug })).toBe(`${path}?${group}`);
    });

    it('writes no blank filter', () => {
      expect(href({ query: '', group: '' })).toBe(path);
    });

    it.each([
      { kind: 'category', path: '/admin/categories', groupParam: 'group' },
      { kind: 'form', path: '/admin/forms', groupParam: 'group' },
    ] as const)('addresses the $kind page, its group as $groupParam', (other) => {
      expect(groupedValuesHref(other.kind, { query: 'q', group: 'g', after: 'a' }, 'new')).toBe(
        `${other.path}?query=q&${other.groupParam}=g&after=a&new`,
      );
    });
  });

  // MB.178: a GET form to the page itself, as the user list's (MB.52), with
  // Filter offered only when there is a new filter to apply.
  describe('the filter', () => {
    beforeEach(() => {
      router.push.mockReset();
    });

    const shown = { query: DEITIES.query, group: groups[0].slug };
    const filterButton = () => screen.getByRole('button', { name: 'Filter' });
    const searchbox = () => screen.getByRole('searchbox', { name: 'Name' });
    const groupBox = () => screen.getByRole('combobox', { name: DEITIES.groupLabel });

    it('filters by a GET search to the page itself, keeping what was asked', () => {
      render(<GroupedValueList {...props({ filter: shown })} />);

      // The <search> landmark around it is the e2e spec's to find, as the user
      // list's is: jsdom's role table predates the element.
      const search = screen.getByRole('form', { name: DEITIES.filterName });
      expect(search).toHaveAttribute('action', path);
      expect(search).toHaveAttribute('method', 'get');
      const name = within(search).getByRole('searchbox', { name: 'Name' });
      expect(name).toHaveValue(DEITIES.query);
      expect(name).toHaveAttribute('name', 'query');
      const group = within(search).getByRole('combobox', { name: DEITIES.groupLabel });
      expect(group).toHaveValue(groups[0].slug);
      expect(group).toHaveAttribute('name', DEITIES.groupParam);
    });

    it('is disabled while the form matches the filter shown', () => {
      render(<GroupedValueList {...props({ filter: shown })} />);

      expect(filterButton()).toBeDisabled();
    });

    it('enables once the query differs, and disables again when it is put back', () => {
      render(<GroupedValueList {...props({ filter: { query: DEITIES.query, group: '' } })} />);

      fireEvent.change(searchbox(), { target: { value: `${DEITIES.query}s` } });
      expect(filterButton()).toBeEnabled();

      fireEvent.change(searchbox(), { target: { value: `${DEITIES.query} ` } });
      expect(filterButton()).toBeDisabled();
    });

    it('opens the filtered list from its first page', () => {
      render(
        <GroupedValueList
          {...props({ previousHref: groupedValuesHref(DEITIES.kind, { before: 'b' }) })}
        />,
      );

      fireEvent.change(searchbox(), { target: { value: ' Two words ' } });
      fireEvent.change(groupBox(), { target: { value: groups[1].slug } });
      fireEvent.click(filterButton());

      expect(router.push).toHaveBeenCalledWith(
        `${path}?query=Two+words&${DEITIES.groupParam}=${groups[1].slug}`,
      );
    });

    it('opens the unfiltered list when the filter is cleared', () => {
      render(<GroupedValueList {...props({ filter: shown })} />);

      fireEvent.change(searchbox(), { target: { value: '' } });
      fireEvent.change(groupBox(), { target: { value: '' } });
      fireEvent.click(filterButton());

      expect(router.push).toHaveBeenCalledWith(path);
    });
  });
});
