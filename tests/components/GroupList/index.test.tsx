import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GroupList from '@/components/GroupList';
import { groupsHref } from '@/components/GroupList/href';
import type { GroupListEntry } from '@/components/GroupList/types';

// The soft pager navigates through the App Router.
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

  it("draws a category group's name in a chip wearing its pair", () => {
    render(<GroupList kind="category" groups={[WARDS]} />);

    const chip = screen.getByText('Fixture Wards', { selector: '.chip' });
    expect(chip.style.getPropertyValue('--chip-dark')).toBe('#4e8bc2');
    expect(chip.style.getPropertyValue('--chip-light')).toBe('#0c5393');
  });

  it("draws a form group's name as plain text", () => {
    render(
      <GroupList
        kind="form"
        groups={[{ ...WARDS, name: 'Fixture Matter', colorDark: undefined, colorLight: undefined }]}
      />,
    );

    expect(screen.getByRole('cell', { name: 'Fixture Matter' })).toBeInTheDocument();
    expect(document.querySelector('.chip')).toBeNull();
  });

  it('says so when there is no group', () => {
    render(<GroupList kind="form" groups={[]} />);

    expect(screen.getByText('No groups yet.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('says so in its own word when there is no tradition', () => {
    render(<GroupList kind="tradition" groups={[]} />);

    expect(screen.getByText('No traditions yet.')).toBeInTheDocument();
  });

  it('pages by the links it is given', () => {
    render(
      <GroupList
        kind="category"
        groups={[WARDS]}
        nextHref={groupsHref('category', { after: 'cursor' })}
      />,
    );

    expect(screen.getByRole('link', { name: /Next/ })).toHaveAttribute(
      'href',
      '/admin/category-groups?after=cursor',
    );
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
  });
});
