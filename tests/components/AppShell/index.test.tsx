import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { longMinuteInZone } from '@/lib/utc';
import { printed } from '../../support/printed-text';
import type { ShellViewer, ShellWorkspace } from '@/lib/types';
import { signInPath } from '@/lib/sign-in';

const pathname = vi.fn<() => string>();
vi.mock('next/navigation', () => ({
  usePathname: () => pathname(),
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/lib/auth-client', () => ({ signOut: vi.fn() }));

const { default: AppShell } = await import('@/components/AppShell');

// The shell around every signed-in page: who sees which links, where
// the brand goes, and what an unverified account is left with.

const MEMBER: ShellViewer = {
  name: 'Fixture Member',
  canCurate: false,
  canCreate: false,
  verified: true,
  pendingInvitations: 0,
  assignedSupport: 0,
  waitingSupport: 0,
};
const ADMIN: ShellViewer = { ...MEMBER, name: 'Fixture Admin', canCurate: true };
const UNVERIFIED: ShellViewer = { ...MEMBER, verified: false };
const COVENS: ShellWorkspace[] = [
  {
    id: 'w1',
    slug: 'fixture-coven',
    name: 'Fixture Coven',
    canReadMembers: true,
    canInvite: true,
    canWrite: true,
    paused: null,
  },
  {
    id: 'w2',
    slug: 'testwort-circle',
    name: 'Testwort Circle',
    canReadMembers: true,
    canInvite: false,
    canWrite: true,
    paused: null,
  },
];

const shell = (viewer: ShellViewer, workspaces: ShellWorkspace[] = COVENS) =>
  render(
    <AppShell viewer={viewer} workspaces={workspaces}>
      <main>The page</main>
    </AppShell>,
  );

beforeEach(() => {
  pathname.mockReturnValue('/coven/fixture-coven');
});

describe('AppShell', () => {
  it('hands the viewer’s pending invitations to the account menu, which links to them', () => {
    shell({ ...MEMBER, pendingInvitations: 2 });

    fireEvent.click(screen.getByRole('button', { name: /^Fixture Member/ }));

    expect(screen.getByRole('link', { name: '2 Coven Invitations' })).toHaveAttribute(
      'href',
      '/account#account-invitations',
    );
  });

  it('offers a curator or a keeper the Compendium, Your Covens, Curator and Keepers links', () => {
    shell(ADMIN);

    const nav = screen.getByRole('navigation', { name: 'Site' });
    expect(nav).toContainElement(screen.getByRole('link', { name: 'Compendium' }));
    expect(nav).toContainElement(screen.getByRole('link', { name: 'Your Covens' }));
    expect(within(nav).getByRole('link', { name: 'Curator' })).toHaveAttribute('href', '/curator');
    expect(within(nav).getByRole('link', { name: 'Keepers' })).toHaveAttribute('href', '/keepers');
    expect(within(nav).queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument();
    // Into the first coven, not via the /coven landing's redirect.
    expect(screen.getByRole('link', { name: 'Your Covens' })).toHaveAttribute(
      'href',
      '/coven/fixture-coven',
    );
  });

  it('sends a keeper in no coven to the /coven landing, which offers the create page', () => {
    shell(ADMIN, []);

    expect(screen.getByRole('link', { name: 'Your Coven' })).toHaveAttribute('href', '/coven');
  });

  it('offers a verified member of a coven Your Coven and neither Curator nor Keepers', () => {
    shell(MEMBER, COVENS.slice(0, 1));

    // The precondition: a verified viewer does get the rest of the bar.
    expect(screen.getByRole('button', { name: 'Add Ingredient' })).toBeEnabled();
    expect(screen.getByRole('link', { name: 'Compendium' })).toHaveAttribute('href', '/compendium');
    expect(screen.getByRole('link', { name: 'Your Coven' })).toHaveAttribute(
      'href',
      '/coven/fixture-coven',
    );
    expect(screen.queryByRole('link', { name: 'Curator' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Keepers' })).not.toBeInTheDocument();
  });

  it('offers a verified viewer in a coven Your Coven and neither Curator nor Keepers', () => {
    shell(MEMBER, [{ ...COVENS[0], canWrite: false, canInvite: false }]);

    expect(screen.getByRole('link', { name: 'Your Coven' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Curator' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Keepers' })).not.toBeInTheDocument();
  });

  it('offers a verified account in no coven, who is not a curator, the Compendium alone', () => {
    shell(MEMBER, []);

    expect(screen.getByRole('link', { name: 'Compendium' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^Your Covens?$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Curator' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Keepers' })).not.toBeInTheDocument();
  });

  it('names the coven link for one coven or several', () => {
    const { unmount } = shell(ADMIN, COVENS.slice(0, 1));
    expect(screen.getByRole('link', { name: 'Your Coven' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Your Covens' })).not.toBeInTheDocument();
    unmount();

    shell(ADMIN, COVENS);
    expect(screen.getByRole('link', { name: 'Your Covens' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Your Coven' })).not.toBeInTheDocument();
  });

  it('leaves an unverified account the brand link to the front page, the account menu and the theme switch', () => {
    shell(UNVERIFIED);

    expect(screen.getByRole('link', { name: 'Sorrel & Salt' })).toHaveAttribute('href', '/');
    expect(screen.queryByRole('button', { name: 'Add Ingredient' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^Your Covens?$/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fixture Member' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Toggle light and dark mode' })).toBeInTheDocument();
  });

  it('offers an unverified admin the Compendium and no other link', () => {
    shell({ ...UNVERIFIED, canCurate: true });

    expect(screen.getByRole('link', { name: 'Compendium' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Curator' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Keepers' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Your Coven' })).not.toBeInTheDocument();
  });

  it('starts with a skip link to an empty target just before the page', () => {
    shell(MEMBER);

    const skip = screen.getByRole('link', { name: 'Skip to Content' });
    const target = document.getElementById(skip.getAttribute('href')?.slice(1) ?? '');
    // Focusable by script only, and wrapping nothing, so a click on the page
    // never lands on it.
    expect(target).toHaveAttribute('tabindex', '-1');
    expect(target).toBeEmptyDOMElement();
    expect(target!.compareDocumentPosition(screen.getByRole('main'))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(skip.compareDocumentPosition(screen.getByRole('banner'))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it('tells a paused viewer their access is paused, in a landmark of its own', () => {
    const until = new Date('2027-01-02T03:04:00Z');
    shell({ ...MEMBER, accessPause: { until } }, []);

    const pause = screen.getByRole('complementary', { name: 'Site Access' });
    expect(pause).toHaveTextContent(
      `Your site access is paused until ${printed(longMinuteInZone(until))}.`,
    );
    expect(screen.getByRole('link', { name: 'What This Means' })).toHaveAttribute(
      'href',
      '/access-paused',
    );
  });

  it('shows no pause notice to a viewer who is not paused', () => {
    shell(MEMBER);

    expect(screen.queryByRole('complementary', { name: 'Site Access' })).not.toBeInTheDocument();
  });
});

// An anonymous sender holds a session only for support: the menu names no account, leads to their requests, and offers to
// make a real account, returning to those requests (claude-docs/design-decisions/m15.48-anonymous-sender.md).
describe('the account menu for an anonymous sender', () => {
  // As the shell's viewer read builds it for an anonymous session.
  const ANONYMOUS = { ...MEMBER, name: 'Anonymous', anonymous: true } as ShellViewer;
  const panelLinks = (menu: HTMLElement) => {
    const panel = document.getElementById(menu.getAttribute('aria-controls') ?? '');
    return within(panel!).getAllByRole('link');
  };

  it('names the button Account with no initials, and offers only Support and Create Account', () => {
    pathname.mockReturnValue('/account/support');
    shell(ANONYMOUS);
    const menu = screen.getByRole('button', { name: 'Account' });
    // Neither the stored name nor letters drawn from it: the avatar shows no text.
    expect(menu).toHaveTextContent(/^Account$/);

    fireEvent.click(menu);

    expect(panelLinks(menu).map((link) => link.textContent)).toEqual(['Support', 'Create Account']);
    expect(screen.getByRole('link', { name: 'Support' })).toHaveAttribute(
      'href',
      '/account/support',
    );
    expect(screen.getByRole('link', { name: 'Create Account' })).toHaveAttribute(
      'href',
      signInPath('/account/support'),
    );
  });

  it('leads Support to the list when requests wait on them too', () => {
    pathname.mockReturnValue('/account/support');
    shell({ ...ANONYMOUS, waitingSupport: 2 });

    fireEvent.click(screen.getByRole('button', { name: /^Account/ }));

    expect(screen.getByRole('link', { name: /^Support/ })).toHaveAttribute(
      'href',
      '/account/support',
    );
  });

  it('still names a signed-in member’s button for them, with Your Account and no Create Account', () => {
    shell(MEMBER);
    const menu = screen.getByRole('button', { name: 'Fixture Member' });
    expect(menu).toHaveTextContent(/FM/);

    fireEvent.click(menu);

    expect(screen.getByRole('link', { name: 'Your Account' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Create Account' })).not.toBeInTheDocument();
  });
});
