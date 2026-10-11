import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The page the test pretends to be on; Next's own hook reads the App
// Router's state, which a component test does not mount.
const pathname = vi.fn<() => string>();
vi.mock('next/navigation', () => ({ usePathname: () => pathname() }));

const { default: AdminNav } = await import('@/components/AdminNav');

// The nav the `/admin` layout carries (M5.4): every admin page, and nothing
// else, with the page you are on marked, as a row and, for a phone, as a
// disclosure of the same links in their sections
// (claude-docs/components/admin-nav.md). Which of the two shows is the
// stylesheet's, so both are in the page here.

const nav = () => screen.getByRole('navigation', { name: 'Admin' });
// The disclosure: a `<details>`, whose role is group.
const menu = () => within(nav()).getByRole('group');
const hrefs = (links: HTMLElement[]) => links.map((link) => link.getAttribute('href'));
const row = () =>
  within(nav())
    .getAllByRole('link')
    .filter((link) => !menu().contains(link));

const current = (links: HTMLElement[]) =>
  hrefs(links.filter((link) => link.getAttribute('aria-current') === 'page'));

const SECTIONS = [
  ['Compendium', ['/admin/compendium']],
  ['Categories', ['/admin/categories', '/admin/category-groups']],
  ['Forms', ['/admin/forms', '/admin/form-groups']],
  ['Deities', ['/admin/deities', '/admin/deity-traditions']],
  ['Astrology', ['/admin/planets', '/admin/zodiac-signs']],
  ['People', ['/admin/users', '/admin/privilege-changes']],
] as const;

beforeEach(() => {
  pathname.mockReturnValue('/admin');
});

describe('AdminNav', () => {
  it('links every admin page in a row, in its sections’ order', () => {
    render(<AdminNav />);

    expect(hrefs(row())).toEqual(SECTIONS.flatMap(([, pages]) => pages));
  });

  it('holds every link again in the disclosure, a list named for each section', () => {
    render(<AdminNav />);

    expect(within(menu()).getAllByRole('list')).toHaveLength(SECTIONS.length);
    for (const [name, pages] of SECTIONS) {
      const list = within(menu()).getByRole('list', { name });
      expect(hrefs(within(list).getAllByRole('link'))).toEqual(pages);
    }
  });

  it.each([
    // The index marks none; a page marks its own entry and no sibling whose
    // path starts the same way; an address beneath a page still marks it.
    ['/admin', []],
    ['/admin/categories', ['/admin/categories']],
    ['/admin/category-groups', ['/admin/category-groups']],
    ['/admin/users/some-user', ['/admin/users']],
  ])(
    'marks only the page you are on at %s as current, in the row and the disclosure',
    (path, expected) => {
      pathname.mockReturnValue(path);

      render(<AdminNav />);

      expect(current(row())).toEqual(expected);
      expect(current(within(menu()).getAllByRole('link'))).toEqual(expected);
    },
  );

  it('shuts the disclosure after a client-side navigation', () => {
    pathname.mockReturnValue('/admin/users');
    const { rerender } = render(<AdminNav />);
    // As a press on its summary would; the layout, and so the nav, stays
    // mounted across a soft navigation.
    (menu() as HTMLDetailsElement).open = true;
    expect(menu()).toHaveAttribute('open');

    pathname.mockReturnValue('/admin/privilege-changes');
    rerender(<AdminNav />);

    expect(menu()).not.toHaveAttribute('open');
    expect(current(within(menu()).getAllByRole('link'))).toEqual(['/admin/privilege-changes']);
  });
});
