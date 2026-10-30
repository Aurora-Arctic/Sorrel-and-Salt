import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ShellViewer, ShellWorkspace } from '@/lib/types';

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
  },
  {
    id: 'w2',
    slug: 'testwort-circle',
    name: 'Testwort Circle',
    canReadMembers: true,
    canInvite: false,
    canWrite: true,
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

  it('offers an admin the Compendium, Your Covens and Admin links', () => {
    shell(ADMIN);

    const nav = screen.getByRole('navigation', { name: 'Site' });
    expect(nav).toContainElement(screen.getByRole('link', { name: 'Compendium' }));
    expect(nav).toContainElement(screen.getByRole('link', { name: 'Your Covens' }));
    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin');
    // Into the first coven, not via the /coven landing's redirect.
    expect(screen.getByRole('link', { name: 'Your Covens' })).toHaveAttribute(
      'href',
      '/coven/fixture-coven',
    );
  });

  it('sends an admin in no coven to the /coven landing, which offers the create page', () => {
    shell(ADMIN, []);

    expect(screen.getByRole('link', { name: 'Your Coven' })).toHaveAttribute('href', '/coven');
  });

  it('offers a verified member of a coven Your Coven and not Admin', () => {
    shell(MEMBER, COVENS.slice(0, 1));

    // The precondition: a verified viewer does get the rest of the bar.
    expect(screen.getByRole('button', { name: 'Add Ingredient' })).toBeEnabled();
    expect(screen.getByRole('link', { name: 'Compendium' })).toHaveAttribute('href', '/compendium');
    expect(screen.getByRole('link', { name: 'Your Coven' })).toHaveAttribute(
      'href',
      '/coven/fixture-coven',
    );
    expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument();
  });

  it('offers a verified viewer in a coven Your Coven and not Admin', () => {
    shell(MEMBER, [{ ...COVENS[0], canWrite: false, canInvite: false }]);

    expect(screen.getByRole('link', { name: 'Your Coven' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument();
  });

  it('offers a verified account in no coven, who is not a curator, the Compendium alone', () => {
    shell(MEMBER, []);

    expect(screen.getByRole('link', { name: 'Compendium' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^Your Covens?$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument();
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
    expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument();
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
});
