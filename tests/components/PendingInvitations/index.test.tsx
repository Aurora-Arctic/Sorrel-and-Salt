import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PendingInvitations from '@/components/PendingInvitations';
import { StatusRegionProvider } from '@/components/ClickFeedback/status-region';
import { announced, expectRefusalUnder } from '../../support/click-feedback';

const { refresh, graphqlRequest } = vi.hoisted(() => ({
  refresh: vi.fn(),
  graphqlRequest: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), refresh }) }));
vi.mock('@/lib/graphql-client', () => ({ graphqlRequest }));

const WORKSPACE = '00000000-0000-0000-0000-000000000001';
const DECLINED_AT = new Date('2026-10-14T09:30:00Z');
const INVITATIONS = [
  {
    id: 'i-1',
    email: 'fern@fixture.test',
    role: 'member',
    expiresAt: new Date('2026-10-19'),
    declinedAt: null,
  },
  {
    id: 'i-2',
    email: 'moss@fixture.test',
    role: 'viewer',
    expiresAt: new Date('2026-10-18'),
    declinedAt: null,
  },
  {
    id: 'i-3',
    email: 'sage@fixture.test',
    role: 'viewer',
    expiresAt: new Date('2026-10-20'),
    declinedAt: DECLINED_AT,
  },
] as const;
const PENDING = INVITATIONS.filter(({ declinedAt }) => declinedAt === null);

const show = () =>
  render(<PendingInvitations workspaceId={WORKSPACE} invitations={INVITATIONS} />, {
    wrapper: StatusRegionProvider,
  });

describe('PendingInvitations', () => {
  beforeEach(() => {
    refresh.mockReset();
    graphqlRequest.mockReset();
  });

  it('lists one row per invitation, each pending one with its own Revoke', () => {
    show();

    const table = screen.getByRole('table', { name: 'Pending Invitations' });
    expect(within(table).getAllByRole('row')).toHaveLength(1 + INVITATIONS.length);
    for (const { email } of PENDING)
      expect(
        screen.getByRole('button', { name: `Revoke the invitation to ${email}` }),
      ).toBeInTheDocument();
  });

  it('offers a declined invitation Remove instead of Revoke, and dates it by when it was declined', () => {
    show();

    expect(
      screen.getByRole('button', { name: 'Remove the declined invitation to sage@fixture.test' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Revoke the invitation to sage@fixture.test' }),
    ).not.toBeInTheDocument();
    for (const { email } of PENDING)
      expect(
        screen.queryByRole('button', { name: `Remove the declined invitation to ${email}` }),
      ).not.toBeInTheDocument();

    const row = screen.getByRole('row', { name: /sage@fixture\.test/ });
    const time = within(row).getByText(/^\d{1,2} \w+ \d{4}, \d{1,2}:\d{2} (am|pm)$/);
    expect(time.tagName).toBe('TIME');
    expect(time).toHaveAttribute('datetime', DECLINED_AT.toISOString());
  });

  it('dates a pending invitation by when it expires', () => {
    show();

    const row = screen.getByRole('row', { name: /fern@fixture\.test/ });
    expect(within(row).getByText(/^\d{1,2} \w+ \d{4}, \d{1,2}:\d{2} (am|pm)$/)).toHaveAttribute(
      'datetime',
      INVITATIONS[0].expiresAt.toISOString(),
    );
  });

  it('sends the declined invitation’s id in this coven, reads the page again and says so', async () => {
    graphqlRequest.mockResolvedValue({ revokeInvitation: { id: 'i-3' } });
    show();
    fireEvent.click(
      screen.getByRole('button', { name: 'Remove the declined invitation to sage@fixture.test' }),
    );
    const dialog = await screen.findByRole('dialog');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove' }));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(graphqlRequest).toHaveBeenCalledOnce();
    expect(graphqlRequest).toHaveBeenCalledWith(expect.anything(), {
      workspaceId: WORKSPACE,
      id: 'i-3',
    });
    expect(announced()).toContain('sage@fixture.test');
  });

  it('revokes that invitation in this coven, reads the page again and says so', async () => {
    graphqlRequest.mockResolvedValue({ revokeInvitation: { id: 'i-2' } });
    show();
    fireEvent.click(
      screen.getByRole('button', { name: 'Revoke the invitation to moss@fixture.test' }),
    );
    const dialog = await screen.findByRole('dialog');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Revoke' }));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(graphqlRequest).toHaveBeenCalledWith(expect.anything(), {
      workspaceId: WORKSPACE,
      id: 'i-2',
    });
    expect(announced()).toContain('moss@fixture.test');
  });

  it('says why under the control when the service refuses, and does not read the page again', async () => {
    graphqlRequest.mockRejectedValue(new Error('Forbidden'));
    show();
    fireEvent.click(
      screen.getByRole('button', { name: 'Revoke the invitation to fern@fixture.test' }),
    );
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Revoke' }));

    const name = 'Revoke the invitation to fern@fixture.test';
    await expectRefusalUnder(screen.getByRole('button', { name }), name);
    expect(refresh).not.toHaveBeenCalled();
  });
});
