import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { encodeCursor } from '@/lib/pagination';
import type { PageRequest } from '@/lib/types';
import { filterForm } from '../../../../../support/filter-form';

// The `/admin/invitations` page, the People page's Invitations tab (MB.70; a
// tab of its own since MB.115), with New Invitation, its action beside the
// heading: the guard, then the identity reads, a page of the pending
// invitations and its count, shown with no hash, the cursor and the pager's
// links, the invite form `?invite` opens, and the pause locking
// Invite and Revoke. The guard and the services are mocked: what they decide is
// tests/lib/request-session.test.ts's and
// tests/modules/identity/services/admin-invitations.test.ts's.

const requireAdminSession = vi.fn();
vi.mock('@/lib/request-session', () => ({ requireAdminSession }));

// The invite form and Revoke hold the router, which only a mounted app provides.
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));

const adminRoleChangePauseState = vi.fn();
const listPendingAdminInvitations = vi.fn();
const countPendingAdminInvitations = vi.fn();
vi.mock('@/modules/identity', () => ({
  adminRoleChangePauseState,
  countPendingAdminInvitations,
  listPendingAdminInvitations,
}));

const { default: AdminInvitationsPage } =
  await import('@/app/(shell)/admin/(people)/invitations/page');
const { default: InvitationsAction } =
  await import('@/app/(shell)/admin/(people)/@action/invitations/page');

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

/** A pending invitation as the service pages it, with the cursor it was found at. */
const entry = (index: number) => ({
  node: { ...PENDING, id: `i${index}`, email: `invited${index}@users.test` },
  cursor: { key: [String(-index)], id: `i${index}` },
});

function lastRequest(): PageRequest {
  const { calls } = listPendingAdminInvitations.mock;
  return calls[calls.length - 1]?.[2] as PageRequest;
}

beforeEach(() => {
  requireAdminSession.mockReset();
  requireAdminSession.mockResolvedValue(ADMIN);
  adminRoleChangePauseState.mockReset();
  adminRoleChangePauseState.mockResolvedValue({ paused: false, canToggle: false });
  listPendingAdminInvitations.mockReset();
  listPendingAdminInvitations.mockResolvedValue([{ node: PENDING, cursor: entry(1).cursor }]);
  countPendingAdminInvitations.mockReset();
  countPendingAdminInvitations.mockResolvedValue({ totalCount: 1, countBefore: 0 });
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

    expect(listPendingAdminInvitations).toHaveBeenCalledWith(
      ADMIN,
      { email: '', expiringSoon: false },
      { limit: 26, inverted: false },
    );
    expect(countPendingAdminInvitations).toHaveBeenCalledWith(
      ADMIN,
      { email: '', expiringSoon: false },
      entry(1).cursor,
    );
    const section = screen.getByRole('region', { name: 'Admin Invitations' });
    expect(within(section).getByText('invited@users.test')).toBeInTheDocument();
    expect(within(section).getByText('Curates the resins')).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(PENDING.tokenHash);
    expect(screen.getByRole('link', { name: 'New Invitation' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('reads the filter off the address, a native submit’s blank flag as the bare one, and keeps it in New Invitation', async () => {
    await renderPage({ email: ' fern ', expiring: '' });

    expect(listPendingAdminInvitations.mock.calls[0]?.[1]).toEqual({
      email: 'fern',
      expiringSoon: true,
    });
    expect(countPendingAdminInvitations.mock.calls[0]?.[1]).toEqual({
      email: 'fern',
      expiringSoon: true,
    });
    const search = filterForm('Filter Invitations');
    expect(within(search).getByRole('searchbox', { name: 'Email' })).toHaveValue('fern');
    expect(within(search).getByRole('switch', { name: 'Expires in 24 Hrs' })).toBeChecked();
    expect(screen.getByRole('link', { name: 'New Invitation' })).toHaveAttribute(
      'href',
      '/admin/invitations?email=fern&expiring&invite',
    );
  });

  it('reads on after a cursor, and back before one', async () => {
    const cursor = entry(5).cursor;

    await renderPage({ after: encodeCursor(cursor) });
    expect(lastRequest()).toEqual({ after: cursor, limit: 26, inverted: false });

    await renderPage({ before: encodeCursor(cursor) });
    expect(lastRequest()).toEqual({ before: cursor, limit: 26, inverted: true });
  });

  it('links the pages either side, keeping the filter', async () => {
    listPendingAdminInvitations.mockResolvedValue(
      Array.from({ length: 26 }, (_, index) => entry(index + 1)),
    );
    countPendingAdminInvitations.mockResolvedValue({ totalCount: 60, countBefore: 25 });

    await renderPage({ email: 'fern', expiring: '', after: encodeCursor(entry(0).cursor) });

    const filter = '/admin/invitations?email=fern&expiring';
    expect(screen.getByRole('link', { name: 'Next' })).toHaveAttribute(
      'href',
      `${filter}&after=${encodeURIComponent(encodeCursor(entry(25).cursor))}`,
    );
    expect(screen.getByRole('link', { name: 'Prev' })).toHaveAttribute(
      'href',
      `${filter}&before=${encodeURIComponent(encodeCursor(entry(1).cursor))}`,
    );
  });

  it('keeps the page shown in New Invitation', async () => {
    const after = encodeCursor(entry(25).cursor);

    await renderPage({ email: 'fern', after });

    expect(screen.getByRole('link', { name: 'New Invitation' })).toHaveAttribute(
      'href',
      `/admin/invitations?email=fern&after=${encodeURIComponent(after)}&invite`,
    );
  });

  it('opens the invite form on ?invite', async () => {
    await renderPage({ invite: '' });

    expect(screen.getByRole('dialog', { name: 'New Invitation' })).toBeInTheDocument();
  });

  it('locks Invite and Revoke while paused, for an admin who is not the primary one', async () => {
    adminRoleChangePauseState.mockResolvedValue({ paused: true, canToggle: false });

    await renderPage({ invite: '' });

    expect(adminRoleChangePauseState).toHaveBeenCalledWith(ADMIN);
    // Not opened even by the form's address.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const section = screen.getByRole('region', { name: 'Admin Invitations' });
    expect(screen.getByRole('button', { name: 'New Invitation' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(
      within(section).getByRole('button', { name: 'Revoke the invitation to invited@users.test' }),
    ).toHaveAttribute('aria-disabled', 'true');
  });
});
