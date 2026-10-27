import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { currentHrefs, hrefs } from '../../support/links';
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
const open = () => currentHrefs(tabs());
const busy = () => hrefs(tabs().filter((link) => link.getAttribute('aria-busy') === 'true'));

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

  it('draws no tab row for a page with one tab, and still shows its action and content', () => {
    render(
      <TabbedPage title="People" tabs={[TABS[0]]} action={<a href="/admin/users?pause">Pause</a>}>
        <p>Content</p>
      </TabbedPage>,
    );

    expect(screen.queryByRole('navigation', { name: 'People' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Pause' })).toBeVisible();
    expect(screen.getByText('Content')).toBeVisible();
  });

  it.each([
    ['/admin/users', ['/admin/users']],
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

  it('greys every tab and the action and puts a status in place of the content while a pressed tab is on its way', async () => {
    renderNavigating();
    // Before the press: every tab and the action can be pressed, and the content shows.
    expect(tabs().filter((link) => link.hasAttribute('aria-disabled'))).toEqual([]);
    expect(action()?.closest('[inert]')).toBeNull();
    expect(within(panel()).queryByRole('status')).not.toBeInTheDocument();

    // Awaited: the press starts a navigation that suspends, which a synchronous
    // act leaves uncommitted.
    await act(async () => {
      fireEvent.click(tab('Invitations'));
    });

    expect(router.push).toHaveBeenCalledWith('/admin/invitations');
    for (const link of tabs()) expect(link).toHaveAttribute('aria-disabled', 'true');
    expect(action()?.closest('[inert]')).not.toBeNull();
    expect(within(panel()).getByRole('status')).toBeInTheDocument();
    expect(within(panel()).queryByRole('table', { name: 'Users' })).not.toBeInTheDocument();
    // The page shown is still Users until Invitations renders; the pressed
    // tab is the one on its way.
    expect(open()).toEqual(['/admin/users']);
    expect(busy()).toEqual(['/admin/invitations']);

    // A second press while the first is on its way goes nowhere.
    await act(async () => {
      fireEvent.click(tab('Privilege Changes'));
    });
    expect(router.push).toHaveBeenCalledTimes(1);
  });

  it('moves the current page to the pressed tab once it has rendered', () => {
    // A navigation that renders at once: the address moves and the
    // transition ends in the same update.
    const Switching = () => {
      const [, rendered] = useState(0);
      router.push.mockImplementation((href: string) => {
        pathname.mockReturnValue(href);
        rendered((count) => count + 1);
      });
      return (
        <TabbedPage title="People" tabs={TABS}>
          <p>Content</p>
        </TabbedPage>
      );
    };
    render(<Switching />);

    fireEvent.click(tab('Invitations'));

    expect(open()).toEqual(['/admin/invitations']);
    expect(busy()).toEqual([]);
    expect(tabs().filter((link) => link.hasAttribute('aria-disabled'))).toEqual([]);
  });

  it('marks a tab pressed while a pointer is down on it, a tap included, and not after', () => {
    render(
      <TabbedPage title="People" tabs={TABS}>
        <p>Content</p>
      </TabbedPage>,
    );
    const users = tab('Users');

    fireEvent.pointerDown(users, { button: 0, pointerType: 'touch' });
    expect(users).toHaveAttribute('data-pressed');
    fireEvent.pointerUp(users);
    expect(users).not.toHaveAttribute('data-pressed');

    // A touch that turns into a scroll of the track is not a press.
    fireEvent.pointerDown(users, { button: 0, pointerType: 'touch' });
    fireEvent.pointerCancel(users);
    expect(users).not.toHaveAttribute('data-pressed');
  });

  // Control, Meta and Shift all reach the one `opensElsewhere` check, which
  // tests/lib/opens-elsewhere.test.ts proves; this proves the tab passes it.
  it('leaves a press with a modifier key to the browser', () => {
    renderNavigating();

    fireEvent.click(tab('Invitations'), { ctrlKey: true });

    expect(router.push).not.toHaveBeenCalled();
    expect(tabs().filter((link) => link.hasAttribute('aria-disabled'))).toEqual([]);
    expect(within(panel()).getByRole('table', { name: 'Users' })).toBeVisible();
  });
});
