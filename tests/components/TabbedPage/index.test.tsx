import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Navigating } from '../../support/navigating';

// The page the test pretends to be on, and the router a tab press navigates
// through; Next's own hooks read the App Router's state, which a component
// test does not mount.
const pathname = vi.fn<() => string>();
const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ usePathname: () => pathname(), useRouter: () => router }));

const { default: TabbedPage } = await import('@/components/TabbedPage');

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
  router.push.mockReset();
});

describe('TabbedPage', () => {
  it("heads the page with the open tab's action, links each tab at its own address in its order, and shows the content", () => {
    render(
      <TabbedPage title="People" tabs={TABS} action={<a href="/admin/users?pause">Pause</a>}>
        <table aria-label="Users" />
      </TabbedPage>,
    );

    expect(screen.getByRole('main')).toContainElement(screen.getByRole('heading', { level: 1 }));
    // The action is the page's, beside its heading: neither a tab nor the content.
    const action = within(screen.getByRole('main')).getByRole('link', { name: 'Pause' });
    expect(tabs()).not.toContain(action);
    expect(screen.getByRole('table', { name: 'Users' })).not.toContainElement(action);
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

  // Users is open; Invitations is pressed, and Next has not yet rendered it.
  const renderNavigating = () =>
    render(
      <Navigating push={router.push}>
        <TabbedPage title="People" tabs={TABS} action={<a href="/admin/users?pause">Pause</a>}>
          <table aria-label="Users" />
        </TabbedPage>
      </Navigating>,
    );
  const tab = (name: string) =>
    within(screen.getByRole('navigation', { name: 'People' })).getByRole('link', { name });
  const panel = () => screen.getByRole('main');
  // `inert` takes the action out of reach, and out of the accessibility tree
  // with it, so it is found by its link in the DOM rather than by role.
  const action = () => screen.getByText('Pause').closest('a');

  it('greys every tab and the action and puts a status in place of the content while a pressed tab is on its way', () => {
    renderNavigating();
    // Before the press: every tab and the action can be pressed, and the content shows.
    expect(tabs().filter((link) => link.hasAttribute('aria-disabled'))).toEqual([]);
    expect(action()?.closest('[inert]')).toBeNull();
    expect(within(panel()).queryByRole('status')).not.toBeInTheDocument();

    fireEvent.click(tab('Invitations'));

    expect(router.push).toHaveBeenCalledWith('/admin/invitations');
    for (const link of tabs()) expect(link).toHaveAttribute('aria-disabled', 'true');
    expect(action()?.closest('[inert]')).not.toBeNull();
    expect(within(panel()).getByRole('status')).toBeInTheDocument();
    expect(within(panel()).queryByRole('table', { name: 'Users' })).not.toBeInTheDocument();

    // A second press while the first is on its way goes nowhere.
    fireEvent.click(tab('Privilege Changes'));
    expect(router.push).toHaveBeenCalledTimes(1);
  });

  it.each([['ctrlKey'], ['metaKey'], ['shiftKey']] as const)(
    'leaves a press with %s to the browser',
    (key) => {
      renderNavigating();

      fireEvent.click(tab('Invitations'), { [key]: true });

      expect(router.push).not.toHaveBeenCalled();
      expect(tabs().filter((link) => link.hasAttribute('aria-disabled'))).toEqual([]);
      expect(within(panel()).getByRole('table', { name: 'Users' })).toBeVisible();
    },
  );
});
