import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkspaceRole } from '@/modules/coven';
import { Forbidden } from '@/lib/errors';

// The members page, with the guard and the services mocked and the role check real, read off the access-control statements.
// It proves who gets role controls and that a refusal from the service is a 404.

const notFound = vi.fn(() => {
  throw new Error('not-found');
});
vi.mock('next/navigation', () => ({ notFound, useRouter: () => ({ refresh: vi.fn() }) }));

const requireCovenMembership = vi.fn();
const requireSession = vi.fn();
vi.mock('@/lib/request-session', () => ({ requireCovenMembership, requireSession }));

const listMembers = vi.fn();
const memberRoster = vi.fn();
const memberEmails = vi.fn();
const standingMemberPauses = vi.fn();
vi.mock('@/modules/coven', async () => ({
  listMembers,
  memberEmails,
  memberRoster,
  standingMemberPauses,
  rolePermits: (
    await vi.importActual<typeof import('@/modules/coven/services/access-control')>(
      '@/modules/coven/services/access-control',
    )
  ).rolePermits,
}));
vi.mock('@/modules/identity', () => ({
  displayNamesOf: async (_session: unknown, ids: string[]) => ids.map((id) => `Name of ${id}`),
}));

const { default: MembersPage } = await import('@/app/(shell)/coven/[slug]/(people)/members/page');

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
  memberEmails.mockImplementation(async (_session: unknown, _workspaceId: string, ids: string[]) =>
    ids.map((userId) => ({ userId, address: `${userId}@testwort.test` })),
  );
  standingMemberPauses.mockResolvedValue([{ userId: 'u-viewer', until: null }]);
  memberRoster.mockImplementation(async () => SEATS.map(([userId, role]) => ({ userId, role })));
  listMembers.mockImplementation(async () =>
    SEATS.map(([userId, role], index) => ({
      cursor: { key: [String(index)], id: userId },
      node: {
        userId,
        role,
        joinedAt: new Date('2026-03-04T05:06:07Z'),
        updatedBy: 'u-owner',
        updatedAt: new Date('2026-03-04T05:06:07Z'),
        invitedBy: userId === 'u-member' ? 'u-inviter' : null,
        workspace: WORKSPACE,
      },
    })),
  );
});

describe('the /coven/[slug]/members page', () => {
  it('lists every member', async () => {
    await render_('owner');
    expect(within(screen.getByRole('table', { name: 'Members' })).getAllByRole('row')).toHaveLength(
      1 + SEATS.length,
    );
  });

  it('names who invited a member, and leaves the cell empty for someone nobody invited', async () => {
    await render_('owner');
    const rows = within(screen.getByRole('table', { name: 'Members' })).getAllByRole('row');
    const rowOf = (id: string) =>
      rows.find((row) =>
        within(row).queryByText(`Name of ${id}`, { selector: '.member-list__name' }),
      );
    expect(within(rowOf('u-member')!).getByText('Name of u-inviter')).toBeInTheDocument();
    expect(within(rowOf('u-viewer')!).queryByText('Name of u-inviter')).not.toBeInTheDocument();
  });

  it('gives an owner a Change Role control on every row', async () => {
    await render_('owner');

    for (const who of ['u-owner', 'u-member', 'u-viewer'])
      expect(
        screen.getByRole('button', { name: `Change Role for Name of ${who}` }),
      ).toBeInTheDocument();
  });

  it('shows a member the list and no role controls', async () => {
    await render_('member');

    expect(within(screen.getByRole('table', { name: 'Members' })).getAllByRole('row')).toHaveLength(
      1 + SEATS.length,
    );
    expect(screen.queryByRole('button', { name: /^Change Role/ })).not.toBeInTheDocument();
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

  // The quiet note, raised before it is urgent.
  it('notes it when the coven has exactly one owner, to an owner and a member alike', async () => {
    await render_('owner');
    expect(screen.getByRole('status')).toBeInTheDocument();

    document.body.innerHTML = '';
    await render_('member');
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('says nothing about it when there are two owners', async () => {
    memberRoster.mockImplementation(async () => [
      { userId: 'u-owner', role: 'owner' },
      { userId: 'u-member', role: 'owner' },
    ]);
    await render_('owner');

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  // The addresses are the owner's, asked for this page's members.
  it("shows an owner each member's address, read for this page's members", async () => {
    await render_('owner');

    expect(memberEmails).toHaveBeenCalledWith(
      expect.anything(),
      'w',
      expect.arrayContaining(SEATS.map(([userId]) => userId)),
    );
    const table = screen.getByRole('table', { name: 'Members' });
    for (const [userId] of SEATS) expect(table).toHaveTextContent(`${userId}@testwort.test`);
  });

  it('asks no address for a member, and shows none', async () => {
    await render_('member');

    expect(memberEmails).not.toHaveBeenCalled();
    expect(screen.getByRole('table', { name: 'Members' })).not.toHaveTextContent('@testwort.test');
  });

  it("gives an owner Pause Access on a member's row, Lift Pause on a paused viewer's, and neither on an owner's", async () => {
    await render_('owner');

    expect(standingMemberPauses).toHaveBeenCalledWith(expect.anything(), 'w', [
      'u-owner',
      'u-member',
      'u-viewer',
    ]);
    expect(
      screen.getByRole('button', { name: 'Pause Access for Name of u-member' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Lift Pause for Name of u-viewer' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pause Access for Name of u-viewer' })).toBeNull();
    // Why the owner's row could have had one: the owner's row is drawn, with its own Change Role.
    expect(
      screen.getByRole('button', { name: 'Change Role for Name of u-owner' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pause Access for Name of u-owner' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Lift Pause for Name of u-owner' })).toBeNull();
  });

  it('offers a member no pause controls and reads no pauses', async () => {
    await render_('member');

    expect(standingMemberPauses).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /^(Pause Access|Lift Pause)/ })).toBeNull();
  });
});
