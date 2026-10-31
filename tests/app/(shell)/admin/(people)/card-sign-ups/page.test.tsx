import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { encodeCursor } from '@/lib/pagination';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The `/admin/card-sign-ups` page: one row per accepted card, kept when the account behind it can no longer be read.

const requireAdminSession = vi.fn();
vi.mock('@/lib/request-session', () => ({ requireAdminSession }));
const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, refresh: vi.fn() }) }));

const listCardArrivals = vi.fn();
const countCardArrivals = vi.fn();
const usersForAdmin = vi.fn();
const adminRoleChangePauseState = vi.fn();
const listedOnUserList = vi.fn();
const providersOf = vi.fn();
vi.mock('@/modules/identity', () => ({
  adminRoleChangePauseState,
  countCardArrivals,
  isPrimaryAdmin: () => false,
  listCardArrivals,
  listedOnUserList,
  providersOf,
  usersForAdmin,
}));
const membershipsOf = vi.fn();
vi.mock('@/modules/coven', () => ({ membershipsOf }));

// The modal also reads the user's support time-outs, which are the support page tests' to prove; none here.
vi.mock('@/app/(shell)/admin/support/reads', () => ({ readTimeoutsOf: vi.fn(async () => []) }));

const { default: ArrivalsPage } = await import('@/app/(shell)/admin/(people)/card-sign-ups/page');

const ADMIN = { userId: '6f1c2d4e-9b8a-4c3d-8e7f-0a1b2c3d4e5f', role: 'admin' } as const;
const BATCH = 'b1111111-0000-4000-8000-000000000001';
const AFTER = encodeCursor({ key: ['a0'], id: 'a0' });

const arrival = (id: string, acceptedBy: string) => ({
  node: { id, batchId: BATCH, acceptedBy, acceptedAt: new Date('2026-10-30T10:00:00Z') },
  cursor: { key: [id], id },
});

beforeEach(() => {
  requireAdminSession.mockReset();
  requireAdminSession.mockResolvedValue(ADMIN);
  countCardArrivals.mockResolvedValue({ total: 2, before: 0 });
  replace.mockReset();
  adminRoleChangePauseState.mockResolvedValue({ paused: false, canToggle: false });
  listedOnUserList.mockReturnValue(true);
  providersOf.mockResolvedValue([[]]);
});

describe('/admin/card-sign-ups', () => {
  it('keeps a row whose account lookup failed, naming it a removed account', async () => {
    listCardArrivals.mockResolvedValue([
      arrival('a1', 'u1'),
      arrival('a2', 'u2'),
      arrival('a3', 'u3'),
    ]);
    usersForAdmin.mockResolvedValue([
      { name: 'Wort Tester', email: 'wort@example.test' },
      null,
      new Error('lookup failed'),
    ]);
    membershipsOf.mockResolvedValue([[], [], new Error('lookup failed')]);

    render(await ArrivalsPage({ searchParams: Promise.resolve({}) }));

    const rows = screen.getAllByRole('row').slice(1);
    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getByText('Wort Tester')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Removed account')).toBeInTheDocument();
    expect(within(rows[2]).getByText('Removed account')).toBeInTheDocument();
  });

  it('reads the filter from the address, sends it to the list and the count, and shows it', async () => {
    listCardArrivals.mockResolvedValue([]);
    countCardArrivals.mockResolvedValue({ total: 0, before: 0 });
    usersForAdmin.mockResolvedValue([]);
    membershipsOf.mockResolvedValue([]);

    render(await ArrivalsPage({ searchParams: Promise.resolve({ query: ' wort ' }) }));

    const sent = { query: 'wort' };
    expect(listCardArrivals).toHaveBeenCalledWith(ADMIN, sent, expect.anything());
    expect(countCardArrivals).toHaveBeenCalledWith(ADMIN, sent, undefined);
    expect(screen.getByRole('searchbox', { name: 'Name, Email or Batch' })).toHaveValue('wort');
  });

  describe("an account's name", () => {
    const WORT = {
      id: '00000000-0000-4000-8000-0000000000a1',
      name: 'Wort Tester',
      email: 'wort@example.test',
      role: 'user',
      canCreateWorkspace: false,
      createdAt: new Date('2026-03-04T05:06:07Z'),
      emailVerified: true,
    };

    beforeEach(() => {
      listCardArrivals.mockResolvedValue([arrival('a1', WORT.id)]);
      usersForAdmin.mockResolvedValue([WORT]);
      membershipsOf.mockResolvedValue([[]]);
    });

    it('links to the user modal on this page, keeping the page it stands on', async () => {
      render(await ArrivalsPage({ searchParams: Promise.resolve({}) }));
      expect(screen.getByRole('link', { name: 'Wort Tester' })).toHaveAttribute(
        'href',
        `/admin/card-sign-ups?user=${WORT.id}`,
      );
    });

    it('keeps the cursor in that link', async () => {
      render(await ArrivalsPage({ searchParams: Promise.resolve({ after: AFTER }) }));
      expect(screen.getByRole('link', { name: 'Wort Tester' })).toHaveAttribute(
        'href',
        `/admin/card-sign-ups?after=${encodeURIComponent(AFTER)}&user=${WORT.id}`,
      );
    });

    it('opens the modal over the list, and Close returns to the list at its cursor', async () => {
      render(
        await ArrivalsPage({ searchParams: Promise.resolve({ after: AFTER, user: WORT.id }) }),
      );

      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByText(/Wort Tester/)).toBeInTheDocument();
      await userEvent.click(within(dialog).getByRole('button', { name: 'Close' }));

      expect(replace).toHaveBeenCalledWith(
        `/admin/card-sign-ups?after=${encodeURIComponent(AFTER)}`,
      );
    });
  });
});
