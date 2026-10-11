import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GroupList from '@/components/GroupList';
import { groupsHref } from '@/components/GroupList/href';
import type { GroupListEntry } from '@/components/GroupList/types';

// The soft pager and the filter navigate through the App Router.
const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// A group page's table and pager (M5.6b): each group with its description, a
// category group's name drawn in its own chip, and an Edit link opening it in
// the page's modal (claude-docs/components/group-list.md).

const WARDS: GroupListEntry = {
  id: 'g1',
  name: 'Fixture Wards',
  slug: 'fixture-wards',
  description: 'An invented group',
  colorDark: '#4e8bc2',
  colorLight: '#0c5393',
  editHref: groupsHref('category', {}, { edit: 'fixture-wards' }),
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

  it('draws no table when there is no group', () => {
    render(<GroupList kind="form" groups={[]} />);

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});

// The traditions' name search (MB.115): FilterForm's controls are its own
// to test (CompendiumList's, GroupedValueList's); this asserts the search
// reaches the address and leaves it, and that a kind not handed one draws none.
describe('GroupList, searched by name', () => {
  beforeEach(() => {
    router.push.mockReset();
  });

  const path = '/admin/deity-traditions';
  const searchbox = () => screen.getByRole('searchbox', { name: 'Name' });

  it('opens the searched list from its first page, the query in the address', () => {
    render(
      <GroupList
        kind="tradition"
        groups={[WARDS]}
        filter={{ query: '' }}
        previousHref={groupsHref('tradition', { before: 'b' })}
      />,
    );

    const search = screen.getByRole('form', { name: 'Filter Deity Traditions' });
    expect(search).toHaveAttribute('action', path);
    expect(searchbox()).toHaveAttribute('name', 'query');
    fireEvent.change(searchbox(), { target: { value: ' Test wort ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Filter' }));

    expect(router.push).toHaveBeenCalledWith(`${path}?query=Test+wort`);
  });

  it('opens the unsearched list from Clear while a search is shown', () => {
    render(<GroupList kind="tradition" groups={[]} filter={{ query: 'wort' }} />);

    expect(searchbox()).toHaveValue('wort');
    fireEvent.click(screen.getByRole('link', { name: 'Clear' }));

    expect(router.push).toHaveBeenCalledWith(path);
  });

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
