import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { longMinuteInZone } from '@/lib/utc';
import type { ShellContext } from '@/lib/types';

// The public frame's layout: the session decides which chrome, and
// nothing here may redirect. The viewer read is mocked (tests/lib/viewer.test.ts
// has it); AppShell's client parts are stood in for.

const viewerIfSignedIn = vi.fn<() => Promise<ShellContext | null>>();
vi.mock('@/lib/viewer', () => ({ viewerIfSignedIn }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/compendium',
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/lib/auth-client', () => ({ signOut: vi.fn() }));

const { default: PublicLayout } = await import('@/app/(public)/layout');

const MEMBER: ShellContext = {
  viewer: {
    name: 'Fixture Member',
    canCurate: false,
    canCreate: false,
    verified: true,
    pendingInvitations: 0,
    assignedSupport: 0,
    waitingSupport: 0,
  },
  workspaces: [],
};

const layout = async () => render(await PublicLayout({ children: <h1>The compendium</h1> }));

beforeEach(() => {
  viewerIfSignedIn.mockReset();
});

describe('the (public) layout', () => {
  it('gives a signed-out visitor the public frame, the way in, and one main after #main', async () => {
    viewerIfSignedIn.mockResolvedValue(null);

    await layout();

    expect(screen.getByRole('link', { name: 'Sign In' })).toHaveAttribute('href', '/sign-in');
    expect(screen.getByRole('link', { name: 'Skip to Content' })).toHaveAttribute('href', '#main');
    expect(screen.getByRole('navigation', { name: 'Site' })).toBeInTheDocument();
    expect(document.getElementById('main')!.nextElementSibling).toContainElement(
      screen.getByRole('main'),
    );
    expect(screen.getByRole('main')).toContainElement(
      screen.getByRole('heading', { name: 'The compendium' }),
    );
  });

  it('gives a signed-in visitor the application shell, not the way in', async () => {
    viewerIfSignedIn.mockResolvedValue(MEMBER);

    await layout();

    expect(screen.getByRole('button', { name: 'Fixture Member' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Sign In' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Skip to Content' })).toHaveAttribute('href', '#main');
    expect(screen.getByRole('navigation', { name: 'Site' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toContainElement(
      screen.getByRole('heading', { name: 'The compendium' }),
    );
  });

  it('tells a paused viewer their access is paused until its end, as the site prints a date, and links to the paused page', async () => {
    const until = new Date('2027-01-02T03:04:00Z');
    viewerIfSignedIn.mockResolvedValue({
      ...MEMBER,
      viewer: { ...MEMBER.viewer, accessPause: { until } },
    });

    await layout();

    const notice = screen.getByRole('status');
    expect(notice).toHaveTextContent(
      `Your site access is paused until ${longMinuteInZone(until)}.`,
    );
    expect(screen.getByRole('link', { name: 'What This Means' })).toHaveAttribute(
      'href',
      '/access-paused',
    );
    expect(screen.getByRole('main')).toContainElement(
      screen.getByRole('heading', { name: 'The compendium' }),
    );
  });

  it('tells a viewer paused with no end that it has no end date', async () => {
    viewerIfSignedIn.mockResolvedValue({
      ...MEMBER,
      viewer: { ...MEMBER.viewer, accessPause: { until: null } },
    });

    await layout();

    expect(screen.getByRole('status')).toHaveTextContent(
      /Your site access is paused, with no end date/,
    );
    expect(screen.getByRole('link', { name: 'What This Means' })).toHaveAttribute(
      'href',
      '/access-paused',
    );
  });

  it('shows no pause notice to a viewer who is not paused', async () => {
    viewerIfSignedIn.mockResolvedValue(MEMBER);

    await layout();

    expect(screen.queryByText(/site access is paused/)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'What This Means' })).not.toBeInTheDocument();
  });
});
