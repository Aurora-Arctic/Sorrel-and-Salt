import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkspaceRole } from '@/modules/coven';
import { Forbidden } from '@/lib/errors';
import { makeQueryClient } from '@/lib/graphql-client';
import { encodeCursor } from '@/lib/pagination';
import { mockGraphQLQuery } from '../../../support/msw/graphql';

const notFound = vi.fn(() => {
  throw new Error('not-found');
});
const replace = vi.fn();
vi.mock('next/navigation', () => ({ notFound, useRouter: () => ({ refresh: vi.fn(), replace }) }));

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

const render_ = async (role: WorkspaceRole, searchParams: Record<string, string> = {}) => {
  requireCovenMembership.mockResolvedValue({
    workspace: WORKSPACE,
    membership: { workspaceId: 'w', userId: 'u-owner', role },
  });
  requireSession.mockResolvedValue({ userId: 'u-owner', role: 'user' });
  // The modal's Coven Access reads the member's pauses through the query client the app provides.
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      {await MembersPage({
        params: Promise.resolve({ slug: 'fixture-coven' }),
        searchParams: Promise.resolve(searchParams),
      })}
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
  vi.clearAllMocks();
  mockGraphQLQuery('MemberPauses', () => ({
    workspace: { id: 'w', memberPauses: { edges: [] } },
  }));
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
      rows.find((row) => within(row).queryByRole('link', { name: `Name of ${id}` }));
    expect(within(rowOf('u-member')!).getByText('Name of u-inviter')).toBeInTheDocument();
    expect(within(rowOf('u-viewer')!).queryByText('Name of u-inviter')).not.toBeInTheDocument();
  });

  it('draws no action on any row, for an owner or a member: the actions are the modal’s', async () => {
    for (const role of ['owner', 'member'] as const) {
      const { unmount } = await render_(role);
      const table = screen.getByRole('table', { name: 'Members' });
      // Why one could have been drawn: an owner may change roles, pause and remove.
      expect(within(table).getAllByRole('link')).toHaveLength(SEATS.length);
      expect(
        within(table).queryAllByRole('button', {
          name: /^(Change Role|Pause Access|Lift Pause|Remove)/,
        }),
      ).toEqual([]);
      unmount();
    }
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

  it("reads the standing pauses in one batch for an owner, and marks the paused viewer's row alone", async () => {
    await render_('owner');

    expect(standingMemberPauses).toHaveBeenCalledExactlyOnceWith(expect.anything(), 'w', [
      'u-owner',
      'u-member',
      'u-viewer',
    ]);
    const table = screen.getByRole('table', { name: 'Members' });
    expect(within(table).getByRole('columnheader', { name: 'Access' })).toBeInTheDocument();
    const rowOf = (id: string) =>
      within(table)
        .getAllByRole('row')
        .find((row) => within(row).queryByRole('link', { name: `Name of ${id}` }))!;
    expect(within(rowOf('u-viewer')).getByText('Paused with no end date')).toBeInTheDocument();
    expect(within(rowOf('u-member')).queryByText(/^Paused/)).toBeNull();
    expect(within(rowOf('u-owner')).queryByText(/^Paused/)).toBeNull();
  });

  it('reads no pauses for a member, and draws no Access column', async () => {
    await render_('member');

    expect(standingMemberPauses).not.toHaveBeenCalled();
    expect(screen.queryByRole('columnheader', { name: 'Access' })).toBeNull();
    expect(screen.queryByText(/^Paused/)).toBeNull();
  });
});

// `?member=<id>` opens the member's modal over the list, from the rows the page already read.
describe('the /coven/[slug]/members page, the member modal', () => {
  const VIEWING_MEMBER = 'Member, Name of u-member, u-member@testwort.test';

  it('links each name to its modal, keeping the cursor', async () => {
    const after = encodeCursor({ key: ['1'], id: 'u-member' });
    await render_('owner', { after });

    expect(screen.getByRole('link', { name: 'Name of u-viewer' })).toHaveAttribute(
      'href',
      `/coven/fixture-coven/members?after=${encodeURIComponent(after)}&member=u-viewer`,
    );
  });

  it('opens no modal without ?member=', async () => {
    await render_('owner');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it("opens an owner the member's modal, with the role change, the access pause and the removal, reading nothing more", async () => {
    await render_('owner', { member: 'u-member' });

    const dialog = screen.getByRole('dialog', { name: VIEWING_MEMBER });
    expect(listMembers).toHaveBeenCalledTimes(1);
    expect(
      within(dialog).getByRole('button', { name: 'Change Role for Name of u-member' }),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole('region', { name: 'Coven Access' })).toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', { name: 'Remove Name of u-member' }),
    ).toBeInTheDocument();
  });

  it("carries the pause the page read for the member into the modal's Coven Access", async () => {
    await render_('owner', { member: 'u-viewer' });

    const access = within(screen.getByRole('dialog')).getByRole('region', { name: 'Coven Access' });
    // The badge in the folded section's summary, as its standing card holds another.
    expect(within(access).getAllByText('Paused').length).toBeGreaterThan(0);
  });

  it("offers no pause on an owner's modal and no Remove on your own", async () => {
    await render_('owner', { member: 'u-owner' });

    const dialog = screen.getByRole('dialog');
    // Why either could have been there: the viewer is an owner, with the role change on this modal.
    expect(
      within(dialog).getByRole('button', { name: 'Change Role for Name of u-owner' }),
    ).toBeInTheDocument();
    expect(within(dialog).queryByRole('region', { name: 'Coven Access' })).toBeNull();
    expect(within(dialog).queryByRole('button', { name: /^Remove/ })).toBeNull();
  });

  it('opens a member the modal with the facts alone, no address and no actions', async () => {
    await render_('member', { member: 'u-viewer' });

    const dialog = screen.getByRole('dialog', { name: 'Member, Name of u-viewer' });
    expect(within(dialog).getByRole('region', { name: 'Membership' })).toHaveTextContent(
      'Observer',
    );
    expect(
      within(dialog).queryAllByRole('button', {
        name: /^(Change Role|Pause Access|Lift Pause|Remove)/,
      }),
    ).toEqual([]);
    expect(within(dialog).queryByRole('region', { name: 'Coven Access' })).toBeNull();
  });

  it('closes back to the list at the same cursor', async () => {
    const after = encodeCursor({ key: ['1'], id: 'u-member' });
    await render_('owner', { after, member: 'u-member' });

    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Close' }),
    );

    expect(replace).toHaveBeenCalledWith(
      `/coven/fixture-coven/members?after=${encodeURIComponent(after)}`,
      { scroll: false },
    );
  });

  // Hand-edited, a member since removed, or one on another page: the list beneath is still the page asked for.
  it('says the address names no member on this page, and opens no modal, for an id not among its rows', async () => {
    await render_('owner', { member: 'u-elsewhere' });

    expect(screen.getByRole('alert')).toHaveTextContent('No member');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Members' })).toBeInTheDocument();
  });
});
