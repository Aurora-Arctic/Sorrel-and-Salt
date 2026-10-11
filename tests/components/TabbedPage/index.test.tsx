import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The page the test pretends to be on; Next's own hook reads the App
// Router's state, which a component test does not mount.
const pathname = vi.fn<() => string>();
vi.mock('next/navigation', () => ({ usePathname: () => pathname() }));

const { default: TabbedPage, TabPanelLoading } = await import('@/components/TabbedPage');

// A page in tabs (MB.115): its heading, a nav of links named for the page,
// one per tab with the open one marked from the address, and the open tab's
// content beneath (claude-docs/components/tabbed-page.md).

const TABS = [
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/invitations', label: 'Invitations' },
  { href: '/admin/privilege-changes', label: 'Privilege Changes' },
] as const;

const tabs = () => within(screen.getByRole('navigation', { name: 'People' })).getAllByRole('link');
const hrefs = (links: HTMLElement[]) => links.map((link) => link.getAttribute('href'));
const open = () => hrefs(tabs().filter((link) => link.getAttribute('aria-current') === 'page'));

beforeEach(() => {
  pathname.mockReturnValue('/admin/users');
});

describe('TabbedPage', () => {
  it('heads the page, links each tab at its own address in its order, and shows the content', () => {
    render(
      <TabbedPage title="People" tabs={TABS}>
        <table aria-label="Users" />
      </TabbedPage>,
    );

    expect(screen.getByRole('main')).toContainElement(screen.getByRole('heading', { level: 1 }));
    expect(hrefs(tabs())).toEqual(TABS.map(({ href }) => href));
    // A navigation, not in-page panels: no tablist promising arrow keys.
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(within(screen.getByRole('main')).getByRole('table', { name: 'Users' })).toBeVisible();
  });

  it.each([
    ['/admin/users', ['/admin/users']],
    ['/admin/invitations', ['/admin/invitations']],
    // An address beneath a tab still marks it.
    ['/admin/users/some-user', ['/admin/users']],
    // An address in none of the tabs marks none.
    ['/admin/compendium', []],
  ])('marks only the tab open at %s as the current page', (path, expected) => {
    pathname.mockReturnValue(path);

    render(
      <TabbedPage title="People" tabs={TABS}>
        <p>Content</p>
      </TabbedPage>,
    );

    expect(open()).toEqual(expected);
  });

  it('shows its loading state as a status', () => {
    render(
      <TabbedPage title="People" tabs={TABS}>
        <TabPanelLoading />
      </TabbedPage>,
    );

    expect(within(screen.getByRole('main')).getByRole('status')).toBeInTheDocument();
  });
});
