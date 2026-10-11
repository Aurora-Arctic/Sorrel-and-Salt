import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The page the test pretends to be on; Next's own hook reads the App
// Router's state, which a component test does not mount.
const pathname = vi.fn<() => string>();
vi.mock('next/navigation', () => ({ usePathname: () => pathname() }));

const { default: AdminNav } = await import('@/components/AdminNav');

// The nav the `/admin` layout carries (M5.4): one entry per admin-curated
// resource, and nothing else, with the page you are on marked
// (claude-docs/components/admin-nav.md).

const links = (): HTMLElement[] =>
  within(screen.getByRole('navigation', { name: 'Admin' })).getAllByRole('link');

const current = (): (string | null)[] =>
  links()
    .filter((link) => link.getAttribute('aria-current') === 'page')
    .map((link) => link.getAttribute('href'));

beforeEach(() => {
  pathname.mockReturnValue('/admin');
});

describe('AdminNav', () => {
  it('links the compendium, categories and their groups, forms and theirs, planets, zodiac signs, deities and their traditions, users, and the privilege ledger, in that order', () => {
    render(<AdminNav />);

    expect(links().map((link) => link.getAttribute('href'))).toEqual([
      '/admin/compendium',
      '/admin/categories',
      '/admin/category-groups',
      '/admin/forms',
      '/admin/form-groups',
      '/admin/planets',
      '/admin/zodiac-signs',
      '/admin/deities',
      '/admin/deity-traditions',
      '/admin/users',
      '/admin/privilege-changes',
    ]);
  });

  it.each([
    // The index marks none; a page marks its own entry and no sibling whose
    // path starts the same way; an address beneath a page still marks it.
    ['/admin', []],
    ['/admin/categories', ['/admin/categories']],
    ['/admin/category-groups', ['/admin/category-groups']],
    ['/admin/users/some-user', ['/admin/users']],
  ])('marks only the page you are on at %s as current', (path, expected) => {
    pathname.mockReturnValue(path);

    render(<AdminNav />);

    expect(current()).toEqual(expected);
  });
});
