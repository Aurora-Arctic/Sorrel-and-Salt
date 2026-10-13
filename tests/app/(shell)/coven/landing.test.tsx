import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { encodeCursor } from '@/lib/pagination';

// The `/coven` landing (M2.8, Story 2): a member goes into their first coven,
// anyone else is told what they can do next and sees the invitations
// addressed to them (M10.32). The viewer and the invitation services are
// mocked; who is a member and who may create is tests/lib/viewer's, and which
// invitations are theirs is the identity service's.

const REDIRECTED = new Error('NEXT_REDIRECT');
const redirect = vi.fn((_to: string): never => {
  throw REDIRECTED;
});
// Accept reads the router, which a page test has no app to give.
vi.mock('next/navigation', () => ({ redirect, useRouter: () => ({ push: vi.fn() }) }));
const requireSession = vi.fn();
vi.mock('@/lib/request-session', () => ({ requireSession }));
const viewerOf = vi.fn();
vi.mock('@/lib/viewer', () => ({ viewerOf }));
const listReceivedInvitations = vi.fn();
const countReceivedInvitations = vi.fn();
vi.mock('@/modules/identity', () => ({ listReceivedInvitations, countReceivedInvitations }));

const { default: CovenLandingPage } = await import('@/app/(shell)/coven/page');

const noQuery = { searchParams: Promise.resolve({}) };

function asViewer(canCreate: boolean, workspaces: { slug: string; name: string }[] = []) {
  viewerOf.mockResolvedValue({
    viewer: { name: 'Ada Fixture', isAdmin: false, canCreate, verified: true },
    workspaces,
  });
}

const rows = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    cursor: { key: [String(index)], id: `i-${index}` },
    node: {
      id: `i-${index}`,
      covenName: `Fixture Coven ${index}`,
      covenSlug: `fixture-coven-${index}`,
      role: 'member',
      inviterName: null,
      expiresAt: new Date('2026-10-19T00:00:00Z'),
      note: null,
    },
  }));

beforeEach(() => {
  redirect.mockClear();
  requireSession.mockReset().mockResolvedValue({ userId: 'u', role: 'user' });
  viewerOf.mockReset();
  listReceivedInvitations.mockReset().mockResolvedValue([]);
  countReceivedInvitations.mockReset().mockResolvedValue({ totalCount: 0, countBefore: null });
});

const invitationsTable = () => screen.queryByRole('table', { name: 'Your Invitations' });

describe('the /coven landing', () => {
  it('sends a member to the first coven the switcher lists, whatever they may create', async () => {
    asViewer(true, [
      { slug: 'fixture-coven', name: 'Fixture Coven' },
      { slug: 'testwort-circle', name: 'Testwort Circle' },
    ]);

    await expect(CovenLandingPage(noQuery)).rejects.toBe(REDIRECTED);
    expect(redirect).toHaveBeenCalledWith('/coven/fixture-coven');
  });

  it('reads no invitations for a member, who is redirected before the read', async () => {
    asViewer(false, [{ slug: 'fixture-coven', name: 'Fixture Coven' }]);
    // Precondition: there is an invitation a read would have found.
    listReceivedInvitations.mockResolvedValue(rows(1));

    await expect(CovenLandingPage(noQuery)).rejects.toBe(REDIRECTED);

    expect(listReceivedInvitations).not.toHaveBeenCalled();
    expect(countReceivedInvitations).not.toHaveBeenCalled();
  });

  it('offers someone with no coven who may create one the create page', async () => {
    asViewer(true);

    render(await CovenLandingPage(noQuery));

    expect(screen.getByRole('link', { name: 'Create Coven' })).toHaveAttribute(
      'href',
      '/coven/new',
    );
    expect(invitationsTable()).not.toBeInTheDocument();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('tells someone with neither how to get in, with no create link', async () => {
    asViewer(false);

    render(await CovenLandingPage(noQuery));

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Create Coven' })).not.toBeInTheDocument();
    expect(invitationsTable()).not.toBeInTheDocument();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('is behind the session guard', async () => {
    asViewer(false);

    render(await CovenLandingPage(noQuery));

    expect(requireSession).toHaveBeenCalled();
  });

  describe('with invitations addressed to the account', () => {
    beforeEach(() => {
      listReceivedInvitations.mockImplementation(async () => rows(2));
      countReceivedInvitations.mockResolvedValue({ totalCount: 2, countBefore: 0 });
    });

    it('lists them above the create link for someone who may create a coven', async () => {
      asViewer(true);

      render(await CovenLandingPage(noQuery));

      expect(invitationsTable()).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Accept the invitation to Fixture Coven 1' }),
      ).toBeEnabled();
      const create = screen.getByRole('link', { name: 'Create Coven' });
      const table = screen.getByRole('table', { name: 'Your Invitations' });
      expect(table.compareDocumentPosition(create) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('lists them for someone who may not create one, with no create link', async () => {
      asViewer(false);

      render(await CovenLandingPage(noQuery));

      expect(invitationsTable()).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: /^Accept the invitation to / })).toHaveLength(2);
      expect(screen.queryByRole('link', { name: 'Create Coven' })).not.toBeInTheDocument();
    });

    it('reads them through the session', async () => {
      asViewer(false);

      await CovenLandingPage(noQuery);

      expect(listReceivedInvitations).toHaveBeenCalledWith(
        { userId: 'u', role: 'user' },
        expect.anything(),
      );
    });

    it('pages through ?after and ?before', async () => {
      listReceivedInvitations.mockImplementation(async () => rows(26));
      countReceivedInvitations.mockResolvedValue({ totalCount: 60, countBefore: 25 });
      asViewer(false);
      const after = encodeCursor({ key: ['0'], id: 'i-0' });

      render(await CovenLandingPage({ searchParams: Promise.resolve({ after }) }));

      const next = screen
        .getAllByRole('link')
        .map((link) => link.getAttribute('href') ?? '')
        .find((href) => href.includes('after='));
      expect(next).toContain('/coven?after=');
      // The request began after the cursor the address carried.
      expect(listReceivedInvitations.mock.calls[0][1].after).toEqual({ key: ['0'], id: 'i-0' });
    });
  });
});
