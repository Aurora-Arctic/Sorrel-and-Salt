import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The `/admin/invitations` page, the People page's Invitations tab (MB.70; a
// tab of its own since MB.115), with Invite Admin, its action beside the
// heading: the guard, then the two identity reads, the pending invitations
// shown with no hash, the invite form `?invite` opens, and the pause locking
// Invite and Revoke. The guard and the services are mocked: what they decide is
// tests/lib/request-session.test.ts's and
// tests/modules/identity/services/admin-invitations.test.ts's.

const requireAdminSession = vi.fn();
vi.mock('@/lib/request-session', () => ({ requireAdminSession }));

// The invite form and Revoke hold the router, which only a mounted app provides.
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));

// jsdom implements no modal dialog; stood in for as a browser behaves.
HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
  this.setAttribute('open', '');
};
HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
  this.removeAttribute('open');
};

const adminRoleChangePauseState = vi.fn();
const listPendingAdminInvitations = vi.fn();
vi.mock('@/modules/identity', () => ({ adminRoleChangePauseState, listPendingAdminInvitations }));

const { default: AdminInvitationsPage } = await import('@/app/admin/(people)/invitations/page');
const { default: InvitationsAction } =
  await import('@/app/admin/(people)/@action/invitations/page');

// The tab's action and its content, as the route group's layout puts them on one page.
async function renderPage(params: Record<string, string> = {}) {
  const [action, page] = await Promise.all([
    InvitationsAction({ searchParams: Promise.resolve(params) }),
    AdminInvitationsPage({ searchParams: Promise.resolve(params) }),
  ]);
  render(
    <>
      {action}
      {page}
    </>,
  );
}

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

    await expect(renderPage()).rejects.toThrow('forbidden');
    expect(listPendingAdminInvitations).not.toHaveBeenCalled();
    expect(adminRoleChangePauseState).not.toHaveBeenCalled();
  });

  it('lists the pending invitations with what an admin acts on, and never the hash', async () => {
    await renderPage();

    expect(listPendingAdminInvitations).toHaveBeenCalledWith(ADMIN, {
      email: '',
      expiringSoon: false,
    });
    const section = screen.getByRole('region', { name: 'Admin Invitations' });
    expect(within(section).getByText('invited@users.test')).toBeInTheDocument();
    expect(within(section).getByText('Curates the resins')).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(PENDING.tokenHash);
    expect(screen.getByRole('link', { name: 'Invite Admin' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('reads the filter off the address, a native submit’s blank flag as the bare one, and keeps it in Invite Admin', async () => {
    await renderPage({ email: ' fern ', expiring: '' });

    expect(listPendingAdminInvitations).toHaveBeenCalledWith(ADMIN, {
      email: 'fern',
      expiringSoon: true,
    });
    const search = screen.getByRole('form', { name: 'Filter Invitations' });
    expect(within(search).getByRole('searchbox', { name: 'Email' })).toHaveValue('fern');
    expect(within(search).getByRole('switch', { name: 'Expires in 24 Hrs' })).toBeChecked();
    expect(screen.getByRole('link', { name: 'Invite Admin' })).toHaveAttribute(
      'href',
      '/admin/invitations?email=fern&expiring&invite',
    );
  });

  it('opens the invite form on ?invite', async () => {
    await renderPage({ invite: '' });

    expect(screen.getByRole('dialog', { name: 'Invite Admin' })).toBeInTheDocument();
  });

  it('locks Invite and Revoke while paused, for an admin who is not the primary one', async () => {
    adminRoleChangePauseState.mockResolvedValue({ paused: true, canToggle: false });

    await renderPage({ invite: '' });

    expect(adminRoleChangePauseState).toHaveBeenCalledWith(ADMIN);
    // Not opened even by the form's address.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const section = screen.getByRole('region', { name: 'Admin Invitations' });
    expect(screen.getByRole('button', { name: 'Invite Admin' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(
      within(section).getByRole('button', { name: 'Revoke the invitation to invited@users.test' }),
    ).toHaveAttribute('aria-disabled', 'true');
  });
});
