import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkspaceRole } from '@/modules/coven';
import { encodeCursor } from '@/lib/pagination';

// The invitations page. The guard and the services are mocked;
// the role check is the real one. Here: the list is read for an owner only,
// by the permission and not by catching a refusal, and it pages through the
// default cursor keys.

const notFound = vi.fn(() => {
  throw new Error('not-found');
});
vi.mock('next/navigation', () => ({ notFound, useRouter: () => ({ refresh: vi.fn() }) }));

const requireCovenMembership = vi.fn();
const requireSession = vi.fn();
vi.mock('@/lib/request-session', () => ({ requireCovenMembership, requireSession }));

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
    'answers a %s with the 404 and reads nothing',
    async (role) => {
      await expect(visit(role)).rejects.toThrow('not-found');

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
