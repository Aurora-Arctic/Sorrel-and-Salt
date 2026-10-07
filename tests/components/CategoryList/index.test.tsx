import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CategoryList from '@/components/CategoryList';
import { categoriesHref } from '@/components/CategoryList/href';
import type { CategoryListEntry } from '@/components/CategoryList/types';

// `/admin/categories`' table (M5.6): each category with its group, an Edit
// link opening it in the page's modal, and the pager
// (claude-docs/components/category-list.md).

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

describe('CategoryList', () => {
  it('lists each category with its group and description', () => {
    render(<CategoryList categories={ENTRIES} />);

    const rows = within(screen.getByRole('table')).getAllByRole('row');
    expect(rows).toHaveLength(3);
    expect(within(rows[1]).getByRole('cell', { name: 'Testcraft' })).toBeInTheDocument();
    expect(within(rows[1]).getByRole('cell', { name: 'Fixture Protection' })).toBeInTheDocument();
    expect(within(rows[1]).getByRole('cell', { name: 'An invented category' })).toBeInTheDocument();
  });

  it('links each row to its edit modal, named for the category', () => {
    render(<CategoryList categories={ENTRIES} />);

    expect(screen.getByRole('link', { name: 'Edit Testcraft' })).toHaveAttribute(
      'href',
      '/admin/categories?edit=testcraft',
    );
  });

  it('pages when there is another page either way', () => {
    render(
      <CategoryList
        categories={ENTRIES}

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
    render(
      <CategoryList
        categories={ENTRIES}

        nextHref={categoriesHref({ after: 'a' })}
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
      '/admin/categories?after=a',
    );
  });

  it('has no pager on a lone page', () => {
    render(<CategoryList categories={ENTRIES} />);

    expect(screen.queryByRole('navigation', { name: 'Pages' })).not.toBeInTheDocument();
  });

  it('says so when there are none', () => {
    render(<CategoryList categories={[]} />);

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText('No categories yet.')).toBeInTheDocument();
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
});
