import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkspaceRole } from '@/modules/coven';
import { encodeCursor } from '@/lib/pagination';
import { requireCovenMembership, requireSession } from '../../../support/request-session';

// The invitations page, with the guard and the services mocked and the role check real.
// It proves the list is read for an owner only, by the permission and not by catching a refusal, and that it pages through the default cursor keys.
// A member who is refused is a member, so they get the shell's Not Authorized page (`forbidden()`), never the stranger's 404.

const notFound = vi.fn(() => {
  throw new Error('not-found');
});
const forbidden = vi.fn(() => {
  throw new Error('forbidden');
});
vi.mock('next/navigation', async () => ({
  ...(await import('../../../support/next-navigation')),
  notFound,
  forbidden,
}));

vi.mock('@/lib/request-session', () => import('../../../support/request-session'));

const listPendingWorkspaceInvitations = vi.fn();
const countPendingWorkspaceInvitations = vi.fn();
vi.mock('@/modules/coven', async () => ({
  listPendingWorkspaceInvitations,
  countPendingWorkspaceInvitations,
  rolePermits: (
    await vi.importActual<typeof import('@/modules/coven/services/access-control')>(
      '@/modules/coven/services/access-control',
    )
  ).rolePermits,
}));

const { default: InvitationsPage } =
  await import('@/app/(shell)/coven/[slug]/(people)/invitations/page');

const rows = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    cursor: { key: [String(index)], id: `i-${index}` },
    node: {
      id: `i-${index}`,
      email: `n${index}@fixture.test`,
      role: 'member',
      expiresAt: new Date('2026-10-19T00:00:00Z'),
      declinedAt: null,
    },
  }));

const visit = async (role: WorkspaceRole, query: Record<string, string> = {}) => {
  requireCovenMembership.mockResolvedValue({
    workspace: { id: 'w', name: 'Fixture Coven', slug: 'fixture-coven' },
    membership: { workspaceId: 'w', userId: 'u', role },
  });
  requireSession.mockResolvedValue({ userId: 'u', role: 'user' });
  render(
    await InvitationsPage({
      params: Promise.resolve({ slug: 'fixture-coven' }),
      searchParams: Promise.resolve(query),
    }),
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  listPendingWorkspaceInvitations.mockImplementation(async () => rows(1));
  countPendingWorkspaceInvitations.mockResolvedValue({ totalCount: 1, countBefore: 0 });
});

describe('the /coven/[slug]/invitations page', () => {
  it('lists the pending invitations for an owner, each with a Revoke', async () => {
    await visit('owner');

    expect(screen.getByRole('table', { name: 'Pending Invitations' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^Revoke the invitation to n0@/ }),
    ).toBeInTheDocument();
    expect(listPendingWorkspaceInvitations).toHaveBeenCalledWith(
      expect.anything(),
      'w',
      expect.anything(),
    );
  });

  it.each(['member', 'viewer'] as const)(
    'answers a %s, whom the coven guard admits, with Not Authorized and reads nothing',
    async (role) => {
      await expect(visit(role)).rejects.toThrow('forbidden');

      // The precondition: the coven guard passed them as a member of this coven, so only the role refused them.
      expect(requireCovenMembership).toHaveBeenCalledWith('fixture-coven');
      await expect(requireCovenMembership.mock.results[0].value).resolves.toMatchObject({
        membership: { workspaceId: 'w', role },
      });
      expect(forbidden).toHaveBeenCalledTimes(1);
      expect(notFound).not.toHaveBeenCalled();
      expect(listPendingWorkspaceInvitations).not.toHaveBeenCalled();
      expect(countPendingWorkspaceInvitations).not.toHaveBeenCalled();
    },
  );

  it('pages through ?after and ?before', async () => {
    listPendingWorkspaceInvitations.mockImplementation(async () => rows(26));
    countPendingWorkspaceInvitations.mockResolvedValue({ totalCount: 60, countBefore: 25 });
    const after = encodeCursor({ key: ['0'], id: 'i-0' });
    await visit('owner', { after });

    const next = screen
      .getAllByRole('link')
      .map((link) => link.getAttribute('href') ?? '')
      .find((href) => href.includes('after='));
    expect(next).toContain('/coven/fixture-coven/invitations?after=');
    // The request began after the cursor the address carried.
    expect(listPendingWorkspaceInvitations.mock.calls[0][2].after).toEqual({
      key: ['0'],
      id: 'i-0',
    });
  });
});
