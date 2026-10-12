import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkspaceRole } from '@/modules/coven';
import { Forbidden } from '@/lib/errors';

// The members page (story 9; M6.13). The guard and the services are mocked,
// since what they decide is their own tests'; the role check is the real one,
// read off the access-control statements. Here: who gets role controls, and
// that a refusal from the service is a 404.

const notFound = vi.fn(() => {
  throw new Error('not-found');
});
vi.mock('next/navigation', () => ({ notFound, useRouter: () => ({ refresh: vi.fn() }) }));

const requireCovenMembership = vi.fn();
const requireSession = vi.fn();
vi.mock('@/lib/request-session', () => ({ requireCovenMembership, requireSession }));

const listMembers = vi.fn();
vi.mock('@/modules/coven', async () => ({
  listMembers,
  rolePermits: (
    await vi.importActual<typeof import('@/modules/coven/services/access-control')>(
      '@/modules/coven/services/access-control',
    )
  ).rolePermits,
}));
vi.mock('@/modules/identity', () => ({
  displayNamesOf: async (_session: unknown, ids: string[]) => ids.map((id) => `Name of ${id}`),
}));

const { default: MembersPage } = await import('@/app/(shell)/coven/[slug]/members/page');

const WORKSPACE = { id: 'w', name: 'Fixture Coven', slug: 'fixture-coven' };
const SEATS = [
  ['u-owner', 'owner'],
  ['u-member', 'member'],
  ['u-viewer', 'viewer'],
] as const;

const render_ = async (role: WorkspaceRole) => {
  requireCovenMembership.mockResolvedValue({
    workspace: WORKSPACE,
    membership: { workspaceId: 'w', userId: 'u-owner', role },
  });
  requireSession.mockResolvedValue({ userId: 'u-owner', role: 'user' });
  render(
    await MembersPage({
      params: Promise.resolve({ slug: 'fixture-coven' }),
      searchParams: Promise.resolve({}),
    }),
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  listMembers.mockImplementation(async () =>
    SEATS.map(([userId, role], index) => ({
      cursor: { key: [String(index)], id: userId },
      node: {
        userId,
        role,
        joinedAt: new Date('2026-03-04T05:06:07Z'),
        updatedBy: 'u-owner',
        updatedAt: new Date('2026-03-04T05:06:07Z'),
        workspace: WORKSPACE,
      },
    })),
  );
});

describe('the /coven/[slug]/members page', () => {
  it('lists every member, with a single member too', async () => {
    await render_('owner');
    expect(screen.getAllByRole('row')).toHaveLength(1 + SEATS.length);

    listMembers.mockImplementation(async () => [
      {
        cursor: { key: ['0'], id: 'u-owner' },
        node: {
          userId: 'u-owner',
          role: 'owner',
          joinedAt: new Date(),
          updatedBy: 'u-owner',
          updatedAt: new Date(),
          workspace: WORKSPACE,
        },
      },
    ]);
    document.body.innerHTML = '';
    await render_('owner');
    expect(screen.getAllByRole('row')).toHaveLength(2);
  });

  it('gives an owner the controls to promote a member and a viewer', async () => {
    await render_('owner');

    expect(screen.getByRole('button', { name: 'Promote Name of u-member' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Promote Name of u-viewer' })).toBeInTheDocument();
  });

  it('offers an owner the roles to move to, each with what it allows', async () => {
    await render_('owner');
    fireEvent.click(screen.getByRole('button', { name: 'Promote Name of u-viewer' }));

    const group = await screen.findByRole('group', { name: 'New Role' });
    expect(within(group).getByRole('radio', { name: /^Member/ })).toBeChecked();
    expect(within(group).getByRole('radio', { name: /^Owner/ })).not.toBeChecked();
    expect(within(group).getByRole('radio', { name: /^Owner.*deleting it/ })).toBeInTheDocument();
  });

  it('shows a member the list and no role controls', async () => {
    await render_('member');

    expect(screen.getAllByRole('row')).toHaveLength(1 + SEATS.length);
    expect(screen.queryByRole('button', { name: /^(Promote|Demote)/ })).not.toBeInTheDocument();
  });

  it('answers a viewer, whose seat exists, with the 404 a stranger gets', async () => {
    requireCovenMembership.mockResolvedValue({
      workspace: WORKSPACE,
      membership: { workspaceId: 'w', userId: 'u-viewer', role: 'viewer' },
    });
    requireSession.mockResolvedValue({ userId: 'u-viewer', role: 'user' });
    listMembers.mockRejectedValue(new Forbidden());

    await expect(
      MembersPage({
        params: Promise.resolve({ slug: 'fixture-coven' }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow('not-found');
    expect(notFound).toHaveBeenCalled();
  });
});
