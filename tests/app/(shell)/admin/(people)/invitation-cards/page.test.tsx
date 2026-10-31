import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The `/admin/invitation-cards` page: the guard first, then the identity reads. What the guard and services decide is
// tests/lib/request-session.test.ts's and tests/modules/identity/services/invitation-cards.test.ts's.

const requireAdminSession = vi.fn();
vi.mock('@/lib/request-session', () => ({ requireAdminSession }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));

const listCardBatches = vi.fn();
const countCardBatches = vi.fn();
const cardBatchTotals = vi.fn();
vi.mock('@/modules/identity', () => ({ cardBatchTotals, countCardBatches, listCardBatches }));

const { default: CardsPage } = await import('@/app/(shell)/admin/(people)/invitation-cards/page');

const ADMIN = { userId: '6f1c2d4e-9b8a-4c3d-8e7f-0a1b2c3d4e5f', role: 'admin' } as const;
const BATCH = 'b1111111-0000-4000-8000-000000000001';

beforeEach(() => {
  requireAdminSession.mockReset();
  requireAdminSession.mockResolvedValue(ADMIN);
  listCardBatches.mockReset();
  countCardBatches.mockReset();
  cardBatchTotals.mockReset();
});

describe('/admin/invitation-cards', () => {
  it('is refused to anyone the admin guard refuses, before any read', async () => {
    requireAdminSession.mockRejectedValue(new Error('forbidden'));

    await expect(CardsPage({ searchParams: Promise.resolve({}) })).rejects.toThrow('forbidden');
    expect(listCardBatches).not.toHaveBeenCalled();
  });

  it('lists a batch with its counts and shows no hash', async () => {
    listCardBatches.mockResolvedValue([
      {
        node: {
          id: 'c1',
          batchId: BATCH,
          createdAt: new Date('2026-10-01T00:00:00Z'),
          expiresAt: new Date('2099-01-01T00:00:00Z'),
          tokenHash: 'a-hash-that-must-not-render',
        },
        cursor: { key: ['-1'], id: 'c1' },
      },
    ]);
    countCardBatches.mockResolvedValue({ total: 1, before: 0 });
    cardBatchTotals.mockResolvedValue([
      { batchId: BATCH, cards: 27, accepted: 4, pending: 20, attempts: 5 },
    ]);

    render(await CardsPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText('27')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Revoke Batch b1111111/ })).toBeInTheDocument();
    expect(screen.queryByText(/a-hash-that-must-not-render/)).toBeNull();
    expect(cardBatchTotals).toHaveBeenCalledWith(ADMIN, [BATCH]);
  });
});
