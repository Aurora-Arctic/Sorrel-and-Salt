import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GroupedValueList from '@/components/GroupedValueList';
import { groupedValuesHref } from '@/components/GroupedValueList/href';
import type {
  GroupedValueListProps,
  GroupedValuesDialog,
  GroupedValuesPlace,
} from '@/components/GroupedValueList/types';
import { Navigating } from '../../support/navigating';
import type { GroupedValueListSubject } from '../../support/types';

// The soft pager and the filter navigate through the App Router; Vitest hoists the mock above the imports.
const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// A grouped vocabulary's filter, table and pager — `/admin/categories`' (M5.6,
// MB.178) and `/admin/forms`' (M5.6a): each value with its group, an Edit link
// opening it in the page's modal, the filter that narrows them, and the pager
// (claude-docs/components/grouped-value-list.md). Every kind runs the same
// rows, so a new kind is a subject here and an entry in the list's `KINDS`;
// what only one kind does — the category chip — has its own describe.

const SUBJECTS: GroupedValueListSubject[] = [
  {
    kind: 'category',
    path: '/admin/categories',
    filterName: 'Filter categories',
    groupLabel: 'Group',
    groupParam: 'group',
    allGroups: 'All groups',
    noneYet: 'No categories yet.',
    noMatch: 'No category matches.',
    entries: [
      {
        id: 'c1',
        name: 'Testcraft',
        slug: 'testcraft',
        description: 'An invented category',
        groupName: 'Fixture Protection',
        groupColors: { colorDark: '#5d8ab1', colorLight: '#286ba6' },
        editHref: groupedValuesHref('category', {}, { edit: 'testcraft' }),
      },
      {
        id: 'c2',
        name: 'Testward',
        slug: 'testward',
        description: 'Another',
        groupName: 'Fixture Healing',
        editHref: groupedValuesHref('category', {}, { edit: 'testward' }),
      },
    ],
    groups: [
      { slug: 'fixture-healing', name: 'Fixture Healing' },
      { slug: 'fixture-protection', name: 'Fixture Protection' },
    ],
    query: 'test',
  },
  {
    kind: 'form',
    path: '/admin/forms',
    filterName: 'Filter forms',
    groupLabel: 'Group',
    groupParam: 'group',
    allGroups: 'All groups',
    noneYet: 'No forms yet.',
    noMatch: 'No form matches.',
    entries: [
      {
        id: 'f1',
        name: 'Testwort Shard',
        slug: 'testwort-shard-fixture-mineral',
        description: 'An invented form',
        groupName: 'Fixture Mineral',
        editHref: groupedValuesHref('form', {}, { edit: 'testwort-shard-fixture-mineral' }),
      },
      {
        id: 'f2',
        name: 'Testwort Sliver',
        slug: 'testwort-sliver-fixture-substance',
        description: 'Another',
        groupName: 'Fixture Substance',
        editHref: groupedValuesHref('form', {}, { edit: 'testwort-sliver-fixture-substance' }),
      },
    ],
    groups: [
      { slug: 'fixture-mineral', name: 'Fixture Mineral' },
      { slug: 'fixture-substance', name: 'Fixture Substance' },
    ],
    query: 'shard',
  },
  {
    kind: 'deity',
    path: '/admin/deities',
    filterName: 'Filter deities',
    groupLabel: 'Tradition',
    groupParam: 'tradition',
    allGroups: 'All traditions',
    noneYet: 'No deities yet.',
    noMatch: 'No deity matches.',
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
  },
];

const props = (
  subject: GroupedValueListSubject,
  overrides: Partial<GroupedValueListProps> = {},
): GroupedValueListProps => ({
  kind: subject.kind,
  values: subject.entries,
  filter: { query: '', group: '' },
  groups: subject.groups,
  ...overrides,
});

describe.each(SUBJECTS)('GroupedValueList, the $kind kind', (subject) => {
  const { path, entries, groups } = subject;

  it('lists each value with its group and description', () => {
    render(<GroupedValueList {...props(subject)} />);

    const rows = within(screen.getByRole('table')).getAllByRole('row');
    expect(rows).toHaveLength(3);
    expect(
      within(rows[0]).getByRole('columnheader', { name: subject.groupLabel }),
    ).toBeInTheDocument();
    expect(within(rows[1]).getByRole('cell', { name: entries[0].name })).toBeInTheDocument();
    expect(within(rows[1]).getByRole('cell', { name: entries[0].groupName })).toBeInTheDocument();
    expect(within(rows[1]).getByRole('cell', { name: entries[0].description })).toBeInTheDocument();
  });

  it('links each row to its edit modal, named for the value', () => {
    render(<GroupedValueList {...props(subject)} />);

    expect(screen.getByRole('link', { name: `Edit ${entries[0].name}` })).toHaveAttribute(
      'href',
      `${path}?edit=${entries[0].slug}`,
    );
  });

  it('pages when there is another page either way, saying where it stands', () => {
    render(
      <GroupedValueList
        {...props(subject)}
        previousHref={groupedValuesHref(subject.kind, { before: 'b' })}
        nextHref={groupedValuesHref(subject.kind, { after: 'a' })}
        position={{ page: 2, pages: 3 }}
      />,
    );

    const pages = screen.getByRole('navigation', { name: 'Pages' });
    expect(within(pages).getByRole('link', { name: 'Prev' })).toHaveAttribute(
      'href',
      `${path}?before=b`,
    );
    expect(within(pages).getByRole('link', { name: 'Next' })).toHaveAttribute(
      'href',
      `${path}?after=a`,
    );
    expect(pages).toHaveTextContent('Page 2 of 3');
  });

  it('disables the end that has no page, rather than hiding it', () => {
    render(
      <GroupedValueList
        {...props(subject)}
        nextHref={groupedValuesHref(subject.kind, { after: 'a' })}
      />,
    );

    const pages = screen.getByRole('navigation', { name: 'Pages' });
    expect(within(pages).getByRole('link', { name: 'Prev' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(within(pages).getByRole('link', { name: 'Prev' })).not.toHaveAttribute('href');
    expect(within(pages).getByRole('link', { name: 'Next' })).toHaveAttribute(
      'href',
      `${path}?after=a`,
    );
  });

  it('has no pager on a lone page', () => {
    render(<GroupedValueList {...props(subject)} />);

    expect(screen.queryByRole('navigation', { name: 'Pages' })).not.toBeInTheDocument();
  });

  it('says so when there are none', () => {
    render(<GroupedValueList {...props(subject, { values: [] })} />);

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText(subject.noneYet)).toBeInTheDocument();
  });

  it.each([
    ['a query', { query: 'nothing', group: '' }],
    ['a group', { query: '', group: groups[0].slug }],
  ])('says none matches when %s finds none', (_, filter) => {
    render(<GroupedValueList {...props(subject, { values: [], filter })} />);

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText(subject.noMatch)).toBeInTheDocument();
    expect(screen.queryByText(subject.noneYet)).not.toBeInTheDocument();
  });

  describe('groupedValuesHref', () => {
    const href = (place: GroupedValuesPlace, dialog?: GroupedValuesDialog) =>
      groupedValuesHref(subject.kind, place, dialog);

    it('keeps the page a modal opens over, the modal last', () => {
      expect(href({ after: 'x/y' }, { edit: entries[0].slug })).toBe(
        `${path}?after=x%2Fy&edit=${entries[0].slug}`,
      );
      expect(href({ before: 'b' }, 'new')).toBe(`${path}?before=b&new`);
      expect(href({}, 'new')).toBe(`${path}?new`);
      expect(href({})).toBe(path);
    });

    it('keeps the filter ahead of the cursor and the modal, the group under its own name', () => {
      const group = `${subject.groupParam}=${groups[0].slug}`;
      expect(href({ query: 'two words', group: groups[0].slug, after: 'a' }, { edit: 'x' })).toBe(
        `${path}?query=two+words&${group}&after=a&edit=x`,
      );
      expect(href({ query: subject.query, before: 'b' }, 'new')).toBe(
        `${path}?query=${subject.query}&before=b&new`,
      );
      expect(href({ group: groups[0].slug })).toBe(`${path}?${group}`);
    });

    it('writes no blank filter', () => {
      expect(href({ query: '', group: '' })).toBe(path);
    });
  });

  // MB.178: a GET form to the page itself, as the user list's (MB.52), with
  // Filter offered only when there is a new filter to apply.
  describe('the filter', () => {
    beforeEach(() => {
      router.push.mockReset();
    });

    const shown = { query: subject.query, group: groups[0].slug };
    const filterButton = () => screen.getByRole('button', { name: 'Filter' });
    const searchbox = () => screen.getByRole('searchbox', { name: 'Name' });
    const groupBox = () => screen.getByRole('combobox', { name: subject.groupLabel });

    it('filters by a GET search to the page itself, keeping what was asked', () => {
      render(<GroupedValueList {...props(subject, { filter: shown })} />);

      // The <search> landmark around it is the e2e spec's to find, as the user
      // list's is: jsdom's role table predates the element.
      const search = screen.getByRole('form', { name: subject.filterName });
      expect(search).toHaveAttribute('action', path);
      expect(search).toHaveAttribute('method', 'get');
      const name = within(search).getByRole('searchbox', { name: 'Name' });
      expect(name).toHaveValue(subject.query);
      expect(name).toHaveAttribute('name', 'query');
      const group = within(search).getByRole('combobox', { name: subject.groupLabel });
      expect(group).toHaveValue(groups[0].slug);
      expect(group).toHaveAttribute('name', subject.groupParam);
    });

    it('offers every group by slug, alphabetical as given, after the option for all', () => {
      render(<GroupedValueList {...props(subject)} />);

      const options = within(groupBox()).getAllByRole('option');
      expect(options.map((option) => [option.textContent, option.getAttribute('value')])).toEqual([
        [subject.allGroups, ''],
        [groups[0].name, groups[0].slug],
        [groups[1].name, groups[1].slug],
      ]);
      expect(groupBox()).toHaveValue('');
    });

    it('is disabled while the form matches the filter shown', () => {
      render(<GroupedValueList {...props(subject, { filter: shown })} />);

      expect(filterButton()).toBeDisabled();
    });

    it('enables once the query differs, and disables again when it is put back', () => {
      render(
        <GroupedValueList {...props(subject, { filter: { query: subject.query, group: '' } })} />,
      );

      fireEvent.change(searchbox(), { target: { value: `${subject.query}s` } });
      expect(filterButton()).toBeEnabled();

      fireEvent.change(searchbox(), { target: { value: `${subject.query} ` } });
      expect(filterButton()).toBeDisabled();
    });

    it('enables once the group differs, and disables again when it is put back', () => {
      render(<GroupedValueList {...props(subject)} />);

      fireEvent.change(groupBox(), { target: { value: groups[1].slug } });
      expect(filterButton()).toBeEnabled();

      fireEvent.change(groupBox(), { target: { value: '' } });
      expect(filterButton()).toBeDisabled();
    });

    it('opens the filtered list from its first page', () => {
      render(
        <GroupedValueList
          {...props(subject, {
            previousHref: groupedValuesHref(subject.kind, { before: 'b' }),
          })}
        />,
      );

      fireEvent.change(searchbox(), { target: { value: ' Two words ' } });
      fireEvent.change(groupBox(), { target: { value: groups[1].slug } });
      fireEvent.click(filterButton());

      expect(router.push).toHaveBeenCalledWith(
        `${path}?query=Two+words&${subject.groupParam}=${groups[1].slug}`,
      );
    });

    it('opens the unfiltered list when the filter is cleared', () => {
      render(<GroupedValueList {...props(subject, { filter: shown })} />);

      fireEvent.change(searchbox(), { target: { value: '' } });
      fireEvent.change(groupBox(), { target: { value: '' } });
      fireEvent.click(filterButton());

      expect(router.push).toHaveBeenCalledWith(path);
    });

    it('shows it is filtering until the filtered list arrives', async () => {
      render(
        <Navigating push={router.push}>
          <GroupedValueList {...props(subject)} />
        </Navigating>,
      );

      fireEvent.change(searchbox(), { target: { value: subject.query } });
      await act(async () => {
        fireEvent.click(filterButton());
      });

      const busy = screen.getByRole('button', { name: 'Filtering' });
      expect(busy).toBeDisabled();
      expect(busy).toHaveAttribute('aria-busy', 'true');
      expect(router.push).toHaveBeenCalledWith(`${path}?query=${subject.query}`);
    });

    it('starts again from the filter shown when the page shows another', () => {
      const { rerender } = render(<GroupedValueList {...props(subject)} />);
      fireEvent.change(searchbox(), { target: { value: 'draft' } });

      // Back to an older filter is a soft navigation: the page renders again with it.
      rerender(<GroupedValueList {...props(subject, { filter: shown })} />);

      expect(searchbox()).toHaveValue(subject.query);
      expect(groupBox()).toHaveValue(groups[0].slug);
      expect(filterButton()).toBeDisabled();
    });
  });
});

describe('GroupedValueList, categories', () => {
  const [subject] = SUBJECTS;

  // The owner's call: the group as the reader meets it, in its own chip.
  it("draws a group in its chip, wearing the group's pair, and plain where it has none", () => {
    render(<GroupedValueList {...props(subject)} />);

    const chip = screen.getByText('Fixture Protection', { selector: '.chip' });
    expect(chip.style.getPropertyValue('--chip-dark')).toBe('#5d8ab1');
    expect(chip.style.getPropertyValue('--chip-light')).toBe('#286ba6');
    expect(screen.getByRole('cell', { name: 'Fixture Healing' }).querySelector('.chip')).toBeNull();
  });
});
