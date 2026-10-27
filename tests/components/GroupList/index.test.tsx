import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GroupList from '@/components/GroupList';
import { groupsHref } from '@/components/GroupList/href';
import type { GroupListEntry } from '@/components/GroupList/types';
import { FILTER_ROWS } from '../../support/filter-form';
import type { FilterFormSubject } from '../../support/types';

// The soft pager and the filter navigate through the App Router.
const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// A group page's table and pager (M5.6b): each group with its description, a
// category group's name drawn in its own chip, and an Edit link opening it in
// the page's modal (claude-docs/components/group-list.md).

const WARDS: GroupListEntry = {
  id: 'g1',
  updatedBy: 'Fixture Editor',
  updatedAt: new Date('2026-05-06T10:00:00Z'),
  name: 'Fixture Wards',
  slug: 'fixture-wards',
  description: 'An invented group',
  colorDark: '#4e8bc2',
  colorLight: '#0c5393',
  editHref: groupsHref('category', {}, { edit: 'fixture-wards' }),
  editHeading: { eyebrow: 'Edit Category Group', title: 'Fixture Wards' },
};

describe('GroupList', () => {
  it('lists each group with its description and an Edit link to its modal', () => {
    render(<GroupList kind="category" groups={[WARDS]} />);

    const row = screen.getByRole('row', { name: /Fixture Wards/ });
    expect(within(row).getByText('An invented group')).toBeInTheDocument();
    expect(within(row).getByRole('link', { name: 'Edit Fixture Wards' })).toHaveAttribute(
      'href',
      '/admin/category-groups?edit=fixture-wards',
    );
  });

  // MB.260: who last edited each row, and when, as the coven's member list has it.
  it('draws an Updated column', () => {
    render(<GroupList kind="category" groups={[WARDS]} />);

    expect(screen.getByRole('columnheader', { name: 'Updated' })).toBeInTheDocument();
  });

  it('draws no table when there is no group', () => {
    render(<GroupList kind="form" groups={[]} />);

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});

// The traditions' name search (MB.115): FilterForm's controls are its own
// to test (CompendiumList's, GroupedValueList's); the shared rows assert the
// search reaches the address and leaves it, and this that a kind not handed
// one draws none.
describe('GroupList, searched by name', () => {
  beforeEach(() => {
    router.push.mockReset();
  });

  const path = '/admin/deity-traditions';
  const SUBJECT: FilterFormSubject = {
    label: 'Filter Deity Traditions',
    path,
    searchLabel: 'Name',
    push: router.push,
    none: {
      list: <GroupList kind="tradition" groups={[WARDS]} filter={{ query: '' }} />,
      sends: 'query=',
    },
    shown: {
      list: (
        <GroupList
          kind="tradition"
          groups={[WARDS]}
          filter={{ query: 'wort' }}
          previousHref={groupsHref('tradition', { query: 'wort', before: 'b' })}
        />
      ),
      sends: 'query=wort',
    },
    alone: [
      {
        list: <GroupList kind="tradition" groups={[]} filter={{ query: 'wort' }} />,
        sends: 'query=wort',
      },
    ],
    searched: `${path}?query=Two+words`,
  };

  it.each(FILTER_ROWS)('%s', (_title, run) => run(SUBJECT));

  it('draws no search for a kind not handed one', () => {
    render(<GroupList kind="category" groups={[WARDS]} />);

    expect(screen.queryByRole('form')).not.toBeInTheDocument();
  });
});

describe('groupsHref', () => {
  it("builds each page's address, keeping the cursor under a modal", () => {
    expect(groupsHref('form', {})).toBe('/admin/form-groups');
    expect(groupsHref('tradition', {}, 'new')).toBe('/admin/deity-traditions?new');
    expect(groupsHref('form', { after: 'c' }, 'new')).toBe('/admin/form-groups?after=c&new');
    expect(groupsHref('category', { before: 'c' }, { edit: 'a b' })).toBe(
      '/admin/category-groups?before=c&edit=a+b',
    );
    // The search goes ahead of the cursor and the modal, and a blank one is none.
    expect(groupsHref('tradition', { query: 'wort', after: 'c' }, 'new')).toBe(
      '/admin/deity-traditions?query=wort&after=c&new',
    );
    expect(groupsHref('tradition', { query: '' })).toBe('/admin/deity-traditions');
  });
});
