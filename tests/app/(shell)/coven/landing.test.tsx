import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The `/coven` landing (M2.8, Story 2): a member goes into their first coven,
// anyone else is told what they can do next, and someone with coven
// invitations waiting is told so, with a link to the account page's
// Invitations section, where they are listed (M10.32). The viewer is mocked:
// who is a member, who may create and how many invitations wait are
// tests/lib/viewer's, and which invitations are theirs the identity service's.

const REDIRECTED = new Error('NEXT_REDIRECT');
const redirect = vi.fn((_to: string): never => {
  throw REDIRECTED;
});
vi.mock('next/navigation', () => ({
  redirect,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));
const requireSession = vi.fn();
vi.mock('@/lib/request-session', () => ({ requireSession }));
const viewerOf = vi.fn();
vi.mock('@/lib/viewer', () => ({ viewerOf }));

const { default: CovenLandingPage } = await import('@/app/(shell)/coven/page');

function asViewer(
  canCreate: boolean,
  workspaces: { slug: string; name: string }[] = [],
  pendingInvitations = 0,
) {
  viewerOf.mockResolvedValue({
    viewer: {
      name: 'Ada Fixture',
      canCurate: false,
      canCreate,
      verified: true,
      pendingInvitations,
    },
    workspaces,
  });
}

beforeEach(() => {
  redirect.mockClear();
  requireSession.mockReset().mockResolvedValue({ userId: 'u', role: 'user' });
  viewerOf.mockReset();
});

const notice = () => screen.queryByRole('status');

describe('the /coven landing', () => {
  it('sends a member to the first coven the switcher lists, whatever they may create', async () => {
    asViewer(true, [
      { slug: 'fixture-coven', name: 'Fixture Coven' },
      { slug: 'testwort-circle', name: 'Testwort Circle' },
    ]);

    await expect(CovenLandingPage()).rejects.toBe(REDIRECTED);
    expect(redirect).toHaveBeenCalledWith('/coven/fixture-coven');
  });

  it('offers someone with no coven who may create one the create page', async () => {
    asViewer(true);

    render(await CovenLandingPage());

    expect(screen.getByRole('link', { name: 'Create Coven' })).toHaveAttribute(
      'href',
      '/coven/new',
    );
    expect(notice()).not.toBeInTheDocument();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('tells someone with neither how to get in, with no create link, behind the session guard', async () => {
    asViewer(false);

    render(await CovenLandingPage());

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Create Coven' })).not.toBeInTheDocument();
    expect(notice()).not.toBeInTheDocument();
    expect(redirect).not.toHaveBeenCalled();
    expect(requireSession).toHaveBeenCalled();
  });

  // The notice reads only the pending count, never the right to create, so one case covers both.
  it('tells someone with pending invitations that they wait, linking to the account page’s section', async () => {
    asViewer(false, [], 2);

    render(await CovenLandingPage());

    const status = notice();
    expect(status).toHaveTextContent('2');
    expect(within(status as HTMLElement).getByRole('link')).toHaveAttribute(
      'href',
      '/account#account-invitations',
    );
    // The list itself is the account page's, never drawn here.
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
