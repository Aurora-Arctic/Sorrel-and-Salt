import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The `/admin/invitations` page, the People page's Invitations tab (MB.70; a
// tab of its own since MB.115): the guard, then the two identity reads, the
// pending invitations shown with no hash, and the pause locking Invite and
// Revoke. The guard and the services are mocked: what they decide is
// tests/lib/request-session.test.ts's and
// tests/modules/identity/services/admin-invitations.test.ts's.

const requireAdminSession = vi.fn();
vi.mock('@/lib/request-session', () => ({ requireAdminSession }));

// Invite Admin holds the router, which only a mounted app provides.
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const adminRoleChangePauseState = vi.fn();
const listPendingAdminInvitations = vi.fn();
vi.mock('@/modules/identity', () => ({ adminRoleChangePauseState, listPendingAdminInvitations }));

const { default: AdminInvitationsPage } = await import('@/app/admin/(people)/invitations/page');

const ADMIN = { userId: '6f1c2d4e-9b8a-4c3d-8e7f-0a1b2c3d4e5f', role: 'admin' } as const;

const PENDING = {
  id: 'i1',
  email: 'invited@users.test',
  note: 'Curates the resins',
  expiresAt: new Date('2026-10-17T20:05:00Z'),
  tokenHash: 'a-hash-that-must-not-render',
};

beforeEach(() => {
  requireAdminSession.mockReset();
  requireAdminSession.mockResolvedValue(ADMIN);
  adminRoleChangePauseState.mockReset();
  adminRoleChangePauseState.mockResolvedValue({ paused: false, canToggle: false });
  listPendingAdminInvitations.mockReset();
  listPendingAdminInvitations.mockResolvedValue([PENDING]);
});

describe('the /admin/invitations page', () => {
  it('renders nothing, and reads nothing, when the guard refuses', async () => {
    requireAdminSession.mockRejectedValue(new Error('forbidden'));

    await expect(AdminInvitationsPage()).rejects.toThrow('forbidden');
    expect(listPendingAdminInvitations).not.toHaveBeenCalled();
    expect(adminRoleChangePauseState).not.toHaveBeenCalled();
  });

  it('lists the pending invitations with what an admin acts on, and never the hash', async () => {
    render(await AdminInvitationsPage());

    expect(listPendingAdminInvitations).toHaveBeenCalledWith(ADMIN);
    const section = screen.getByRole('region', { name: 'Admin Invitations' });
    expect(within(section).getByText('invited@users.test')).toBeInTheDocument();
    expect(within(section).getByText('Curates the resins')).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(PENDING.tokenHash);
    expect(within(section).getByRole('button', { name: 'Invite Admin' })).not.toHaveAttribute(
      'aria-disabled',
    );
  });

  it('locks Invite and Revoke while paused, for an admin who is not the primary one', async () => {
    adminRoleChangePauseState.mockResolvedValue({ paused: true, canToggle: false });

    render(await AdminInvitationsPage());

    expect(adminRoleChangePauseState).toHaveBeenCalledWith(ADMIN);
    const section = screen.getByRole('region', { name: 'Admin Invitations' });
    expect(within(section).getByRole('button', { name: 'Invite Admin' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(
      within(section).getByRole('button', { name: 'Revoke the invitation to invited@users.test' }),
    ).toHaveAttribute('aria-disabled', 'true');
  });
});
