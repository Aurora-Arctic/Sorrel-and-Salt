import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ShellViewer, ShellWorkspace } from '@/lib/types';

const pathname = vi.fn<() => string>();
vi.mock('next/navigation', () => ({ usePathname: () => pathname() }));
vi.mock('@/lib/auth-client', () => ({ signOut: vi.fn() }));

const { default: AppShell } = await import('@/components/AppShell');

// The shell around every signed-in page (MB.7): who sees which links, where
// the brand goes, and what an unverified account is left with.

const MEMBER: ShellViewer = {
  name: 'Fixture Member',
  isAdmin: false,
  canCreate: false,
  verified: true,
  pendingInvitations: 0,
};
const ADMIN: ShellViewer = { ...MEMBER, name: 'Fixture Admin', isAdmin: true };
const UNVERIFIED: ShellViewer = { ...MEMBER, verified: false };
const COVENS: ShellWorkspace[] = [
  { slug: 'fixture-coven', name: 'Fixture Coven', canReadMembers: true },
  { slug: 'testwort-circle', name: 'Testwort Circle', canReadMembers: true },
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

  it('offers an admin the Your Coven and Admin links', () => {
    shell(ADMIN);

    const nav = screen.getByRole('navigation', { name: 'Site' });
    expect(nav).toContainElement(screen.getByRole('link', { name: 'Your Coven' }));
    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin');
    // Into the first coven, not via the /coven landing's redirect (MB.257).
    expect(screen.getByRole('link', { name: 'Your Coven' })).toHaveAttribute(
      'href',
      '/coven/fixture-coven',
    );
  });

  it('sends an admin in no coven to the /coven landing, which offers the create page', () => {
    shell(ADMIN, []);

    expect(screen.getByRole('link', { name: 'Your Coven' })).toHaveAttribute('href', '/coven');
  });

  it('offers anyone else neither, though they are signed in and verified', () => {
    shell(MEMBER);

    // The precondition: a verified viewer does get the rest of the bar.
    expect(screen.getByRole('button', { name: 'Add Ingredient' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Site' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Your Coven' })).not.toBeInTheDocument();
  });

  it('marks the area the page is in as the current page', () => {
    pathname.mockReturnValue('/admin/users');
    shell(ADMIN);

    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Your Coven' })).not.toHaveAttribute('aria-current');
  });

  it('sends the brand to the admin area for an admin, and anyone else into their first coven', () => {
    const { unmount } = shell(ADMIN);
    expect(screen.getByRole('link', { name: 'Sorrel & Salt' })).toHaveAttribute('href', '/admin');
    unmount();

    shell(MEMBER);
    expect(screen.getByRole('link', { name: 'Sorrel & Salt' })).toHaveAttribute(
      'href',
      '/coven/fixture-coven',
    );
  });

  it('sends the brand to the /coven landing for someone in no coven', () => {
    shell(MEMBER, []);

    expect(screen.getByRole('link', { name: 'Sorrel & Salt' })).toHaveAttribute('href', '/coven');
  });

  it('keeps Add Ingredient a real button, disabled until its form exists', () => {
    shell(MEMBER);

    expect(screen.getByRole('button', { name: 'Add Ingredient' })).toBeDisabled();
  });

  it('leaves an unverified account the brand as text, the account menu and the theme switch', () => {
    shell(UNVERIFIED);

    expect(screen.queryByRole('link', { name: 'Sorrel & Salt' })).not.toBeInTheDocument();
    expect(screen.getByText('Sorrel & Salt')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Site' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add Ingredient' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fixture Member' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Toggle light and dark mode' })).toBeInTheDocument();
  });

  it('offers an unverified admin no links either', () => {
    shell({ ...UNVERIFIED, isAdmin: true });

    expect(screen.queryByRole('navigation', { name: 'Site' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument();
  });

  it('starts with a skip link to the page, which sits in the element it names', () => {
    shell(MEMBER);

    const skip = screen.getByRole('link', { name: 'Skip to Content' });
    const target = document.getElementById(skip.getAttribute('href')?.slice(1) ?? '');
    expect(target).toContainElement(screen.getByRole('main'));
    expect(skip.compareDocumentPosition(screen.getByRole('banner'))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });
});
