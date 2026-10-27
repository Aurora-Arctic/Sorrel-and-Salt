import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GroupedValueList from '@/components/GroupedValueList';
import { groupedValuesHref } from '@/components/GroupedValueList/href';
import type {
  GroupedValueListProps,
  GroupedValuesPlace,
} from '@/components/GroupedValueList/types';
import type { ListDialog } from '@/lib/types';
import { FILTER_ROWS, drawnOnServer, filterForm } from '../../support/filter-form';
import type { FilterFormSubject, GroupedValueListSubject } from '../../support/types';

// The soft pager and the filter navigate through the App Router; Vitest hoists the mock above the imports.
const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// A curated vocabulary's filter, table and pager — `/admin/categories`' (M5.6,
// MB.178), `/admin/forms`' (M5.6a) and `/admin/deities`' (MB.132): each value
// with its group, an Edit link opening it in the page's modal, and the filter
// that narrows them, and the flat celestial bodies and signs (MB.95) with no group at
// all (claude-docs/components/grouped-value-list.md). The kinds
// share every behaviour, so it runs on the deities, whose group goes by its
// own name; the other kinds get only what they change, their page and their
// group's parameter. Paging is Pager's, the filter's spinner and its reset to
// the filter shown CompendiumList's.

const DEITIES: GroupedValueListSubject = {
  kind: 'deity',
  path: '/admin/deities',
  filterName: 'Filter Deities',
  groupLabel: 'Tradition',
  groupParam: 'tradition',
  entries: [
    {
      id: 'd1',
      updatedBy: 'Fixture Editor',
      updatedAt: new Date('2026-05-06T10:00:00Z'),
      name: 'Testra',
      slug: 'testra-fixtural',
      description: 'An invented god',
      groupName: 'Fixtural',
      editHref: groupedValuesHref('deity', {}, { edit: 'testra-fixtural' }),
      editHeading: { title: 'Testra' },
    },
    {
      id: 'd2',
      updatedBy: 'Fixture Editor',
      updatedAt: new Date('2026-05-06T10:00:00Z'),
      name: 'Mockra',
      slug: 'mockra-mockish',
      description: 'Another',
      groupName: 'Mockish',
      editHref: groupedValuesHref('deity', {}, { edit: 'mockra-mockish' }),
      editHeading: { title: 'Mockra' },
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

  // M14.23: a deity is found by any of its other names, so its row says them.
  it("names a deity's other names under its name, and nothing for a deity with none", () => {
    const [testra, mockra] = entries;
    render(
      <GroupedValueList
        {...props({ values: [{ ...testra, otherNames: ['Testrina', 'Tess'] }, mockra] })}
      />,
    );

    const rows = within(screen.getByRole('table')).getAllByRole('row');
    expect(
      within(rows[1]).getByRole('cell', { name: 'Testra Also called Testrina, Tess' }),
    ).toBeInTheDocument();
    expect(within(rows[2]).getByRole('cell', { name: 'Mockra' })).toBeInTheDocument();
  });

  // MB.260: who last edited each row, and when, as the coven's member list has it.
  it('draws an Updated column', () => {
    render(<GroupedValueList {...props()} />);

    expect(screen.getByRole('columnheader', { name: 'Updated' })).toBeInTheDocument();
  });

  it('links each row to its edit modal, named for the value', () => {
    render(<GroupedValueList {...props()} />);

    expect(screen.getByRole('link', { name: `Edit ${entries[0].name}` })).toHaveAttribute(
      'href',
      `${path}?edit=${entries[0].slug}`,
    );
  });

  // MB.95's flat kinds, folded in at MB.115: filed under nothing, so
  // neither the table nor the filter offers a group.
  it('shows a flat kind with no group column and no group filter', () => {
    render(<GroupedValueList {...props({ kind: 'celestialBody', groups: undefined })} />);

    const headings = within(screen.getByRole('table')).getAllByRole('columnheader');
    expect(headings).toHaveLength(4);
    expect(
      within(filterForm('Filter Celestial Bodies')).queryByRole('combobox'),
    ).not.toBeInTheDocument();
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
    const href = (place: GroupedValuesPlace, dialog?: ListDialog) =>
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
      { kind: 'category', path: '/admin/categories', group: 'group=g&' },
      // A flat kind has no group to write.
      { kind: 'celestialBody', path: '/admin/celestial-bodies', group: '' },
    ] as const)('addresses the $kind page, its group as it names one', (other) => {
      expect(groupedValuesHref(other.kind, { query: 'q', group: 'g', after: 'a' }, 'new')).toBe(
        `${other.path}?query=q&${other.group}after=a&new`,
      );
    });
  });

  // MB.178: a GET form to the page itself, as the user list's (MB.52),
  // applying as each field changes (MB.115, the owner's call): the group once
  // a choice settles, the name on its Search submit.
  describe('the filter', () => {
    beforeEach(() => {
      router.push.mockReset();
    });

    const shown = { query: DEITIES.query, group: groups[0].slug };
    const searchbox = () => screen.getByRole('searchbox', { name: 'Name' });
    const groupBox = () => screen.getByRole('combobox', { name: DEITIES.groupLabel });

    // The group goes under its own parameter by slug, from the type-ahead's
    // hidden input, as the server's select sends it.
    const group = (slug: string) => `${DEITIES.groupParam}=${slug}`;
    const SUBJECT: FilterFormSubject = {
      label: DEITIES.filterName,
      path,
      searchLabel: 'Name',
      push: router.push,
      none: { list: <GroupedValueList {...props()} />, sends: `query=&${group('')}` },
      shown: {
        list: (
          <GroupedValueList
            {...props({
              filter: shown,
              previousHref: groupedValuesHref(DEITIES.kind, { ...shown, before: 'b' }),
            })}
          />
        ),
        sends: `query=${DEITIES.query}&${group(groups[0].slug)}`,
      },
      alone: [
        {
          list: <GroupedValueList {...props({ filter: { query: DEITIES.query, group: '' } })} />,
          sends: `query=${DEITIES.query}&${group('')}`,
        },
        {
          list: <GroupedValueList {...props({ filter: { query: '', group: groups[0].slug } })} />,
          sends: `query=&${group(groups[0].slug)}`,
        },
      ],
      searched: `${path}?query=Two+words&${group(groups[0].slug)}`,
    };

    it.each(FILTER_ROWS)('%s', (_title, run) => run(SUBJECT));

    // The owner's call (MB.115): typed into once hydrated, but drawn as a
    // native select by the server, so the filter works before JavaScript.
    it('draws the group as a native select on the server, and as a type-ahead once hydrated', async () => {
      const { container, hydrate } = drawnOnServer(
        <GroupedValueList {...props({ filter: shown })} />,
      );

      const served = within(container).getByRole('combobox', { name: DEITIES.groupLabel });
      expect(served).toHaveValue(groups[0].slug);
      expect(served).toHaveAttribute('name', DEITIES.groupParam);
      expect(within(served).getAllByRole('option')).toHaveLength(groups.length + 1);
      expect(served).not.toHaveAttribute('aria-autocomplete');

      await hydrate();
      const hydrated = within(container).getByRole('combobox', { name: DEITIES.groupLabel });
      expect(hydrated).toHaveAttribute('aria-autocomplete', 'list');
      expect(hydrated).toHaveValue(groups[0].name);
    });

    it('applies a group picked, carrying the name typed', () => {
      render(<GroupedValueList {...props()} />);

      fireEvent.change(searchbox(), { target: { value: ' Two words ' } });
      fireEvent.change(groupBox(), { target: { value: groups[1].name.slice(1, 4) } });
      expect(router.push).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole('option', { name: groups[1].name }));

      expect(router.push.mock.calls).toEqual([
        [`${path}?query=Two+words&${DEITIES.groupParam}=${groups[1].slug}`],
      ]);
    });

    it('opens every group from the clear, keeping the name shown', () => {
      render(<GroupedValueList {...props({ filter: shown })} />);

      fireEvent.click(screen.getByRole('button', { name: `Clear ${DEITIES.groupLabel}` }));

      expect(router.push.mock.calls).toEqual([[`${path}?query=${DEITIES.query}`]]);
    });
  });
});
