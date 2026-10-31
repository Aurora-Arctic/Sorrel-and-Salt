import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { currentHrefs, hrefs } from '../../support/links';

// The page the test pretends to be on; Next's own hook reads the App
// Router's state, which a component test does not mount.
const pathname = vi.fn<() => string>();
vi.mock('next/navigation', () => ({
  usePathname: () => pathname(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

const { default: AdminNav } = await import('@/components/AdminNav');

// The nav the `/admin` layout carries: every admin page and nothing else, each linked at its first tab, with the page you are on marked (claude-docs/components/admin-nav.md).
// Which pages show in the row and which behind More is the stylesheet's, so every page is in the row here.

const nav = () => screen.getByRole('navigation', { name: 'Admin' });
const row = () => within(nav()).getAllByRole('link');

// Each page linked at its first tab, in the sections' order.
const PAGES = [
  '/admin/compendium',
  '/admin/categories',
  '/admin/forms',
  '/admin/deities',
  '/admin/celestial-bodies',
  '/admin/support',
  '/admin/users',
];

beforeEach(() => {
  pathname.mockReturnValue('/admin');
});

describe('AdminNav', () => {
  it('links every admin page in a row, in its sections’ order', () => {
    render(<AdminNav managesPeople />);

    expect(hrefs(row())).toEqual(PAGES);
  });

  // A curator is shown the curation pages and not People, which every
  // page beneath refuses them anyway (claude-docs/auth/admin-guard.md).
  it('leaves People out for a curator, who manages no one', () => {
    render(<AdminNav managesPeople={false} />);

    expect(hrefs(row())).toEqual(PAGES.filter((href) => href !== '/admin/users'));
    expect(hrefs(row())).toContain('/admin/support');
  });

  it.each([
    // The index marks none; a page marks its own entry, on any of its tabs
    // .
    ['/admin', []],
    ['/admin/categories', ['/admin/categories']],
    ['/admin/category-groups', ['/admin/categories']],
  ])('marks only the page you are on at %s as current', (path, expected) => {
    pathname.mockReturnValue(path);

    render(<AdminNav managesPeople />);

    expect(currentHrefs(row())).toEqual(expected);
  });
});
