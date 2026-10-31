import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The `/admin/card-sign-ups` page: one row per accepted card, kept when the account behind it can no longer be read.

const requireAdminSession = vi.fn();
vi.mock('@/lib/request-session', () => ({ requireAdminSession }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));

const listCardArrivals = vi.fn();
const countCardArrivals = vi.fn();
const usersForAdmin = vi.fn();
vi.mock('@/modules/identity', () => ({ countCardArrivals, listCardArrivals, usersForAdmin }));
const membershipsOf = vi.fn();
vi.mock('@/modules/coven', () => ({ membershipsOf }));

const { default: ArrivalsPage } = await import('@/app/(shell)/admin/(people)/card-sign-ups/page');

const ADMIN = { userId: '6f1c2d4e-9b8a-4c3d-8e7f-0a1b2c3d4e5f', role: 'admin' } as const;
const BATCH = 'b1111111-0000-4000-8000-000000000001';

const arrival = (id: string, acceptedBy: string) => ({
  node: { id, batchId: BATCH, acceptedBy, acceptedAt: new Date('2026-10-30T10:00:00Z') },
  cursor: { key: [id], id },
});

beforeEach(() => {
  requireAdminSession.mockReset();
  requireAdminSession.mockResolvedValue(ADMIN);
  countCardArrivals.mockResolvedValue({ total: 2, before: 0 });
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
});
