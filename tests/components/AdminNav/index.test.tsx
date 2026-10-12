import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { currentHrefs, hrefs } from '../../support/links';

// The page the test pretends to be on; Next's own hook reads the App
// Router's state, which a component test does not mount.
const pathname = vi.fn<() => string>();
vi.mock('next/navigation', () => ({ usePathname: () => pathname() }));

const { default: AdminNav } = await import('@/components/AdminNav');

// The nav the `/admin` layout carries (M5.4): every admin page, and nothing
// else, each linked at its first tab, with the page you are on marked
// (claude-docs/components/admin-nav.md). Which pages show in the row and
// which behind More is the stylesheet's, so every page is in the row here.

const nav = () => screen.getByRole('navigation', { name: 'Admin' });
const row = () => within(nav()).getAllByRole('link');

// Each page linked at its first tab (MB.115), in the sections' order.
const PAGES = [
  '/admin/compendium',
  '/admin/categories',
  '/admin/forms',
  '/admin/deities',
  '/admin/celestial-bodies',
  '/admin/users',
];

beforeEach(() => {
  pathname.mockReturnValue('/admin');
});

describe('AdminNav', () => {
  it('links every admin page in a row, in its sections’ order', () => {
    render(<AdminNav />);

    expect(hrefs(row())).toEqual(PAGES);
  });

  it.each([
    // The index marks none; a page marks its own entry, on any of its tabs
    // (MB.115); an address beneath a tab still marks it.
    ['/admin', []],
    ['/admin/categories', ['/admin/categories']],
    ['/admin/category-groups', ['/admin/categories']],
    ['/admin/invitations', ['/admin/users']],
    ['/admin/users/some-user', ['/admin/users']],
  ])('marks only the page you are on at %s as current', (path, expected) => {
    pathname.mockReturnValue(path);

    render(<AdminNav />);

    expect(currentHrefs(row())).toEqual(expected);
  });

  it('lists the last two pages behind More, which names the page you are on when it is one of them', () => {
    pathname.mockReturnValue('/admin/invitations');
    render(<AdminNav />);
    const more = within(nav()).getByRole('button', { name: 'More: People' });

    fireEvent.click(more);

    const list = document.getElementById(more.getAttribute('aria-controls')!)!;
    expect(hrefs(within(list).getAllByRole('link'))).toEqual([
      '/admin/celestial-bodies',
      '/admin/users',
    ]);
    expect(more).toHaveAttribute('aria-current', 'page');
  });
});
