import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { router } from '../../support/next-navigation';
import GroupList from '@/components/GroupList';
import { groupsHref } from '@/components/GroupList/href';
import type { GroupListEntry } from '@/components/GroupList/types';
import { FILTER_ROWS } from '../../support/filter-form';
import type { FilterFormSubject } from '../../support/types';

// The soft pager and the filter navigate through the App Router.

// claude-docs/components/group-list.md

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
      '/curator/category-groups?edit=fixture-wards',
    );
  });

  it('draws an Updated column', () => {
    render(<GroupList kind="category" groups={[WARDS]} />);

    expect(screen.getByRole('columnheader', { name: 'Updated' })).toBeInTheDocument();
  });

  it('draws no table when there is no group', () => {
    render(<GroupList kind="form" groups={[]} />);

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});

// FilterForm's controls are tested in CompendiumList and GroupedValueList.
describe('GroupList, searched by name', () => {
  beforeEach(() => {
    router.push.mockReset();
  });

  const path = '/curator/deity-traditions';
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
    expect(groupsHref('form', {})).toBe('/curator/form-groups');
    expect(groupsHref('tradition', {}, 'new')).toBe('/curator/deity-traditions?new');
    expect(groupsHref('form', { after: 'c' }, 'new')).toBe('/curator/form-groups?after=c&new');
    expect(groupsHref('category', { before: 'c' }, { edit: 'a b' })).toBe(
      '/curator/category-groups?before=c&edit=a+b',
    );
    expect(groupsHref('tradition', { query: 'wort', after: 'c' }, 'new')).toBe(
      '/curator/deity-traditions?query=wort&after=c&new',
    );
    expect(groupsHref('tradition', { query: '' })).toBe('/curator/deity-traditions');
  });
});
