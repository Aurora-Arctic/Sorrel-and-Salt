import { render, screen, within } from '@testing-library/react';
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

    const row = within(screen.getAllByRole('row')[1]);
    expect(row.getByText('27')).toBeInTheDocument();
    expect(row.getByText('Live')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Revoke Batch b1111111/ })).toBeInTheDocument();
    expect(screen.queryByText(/a-hash-that-must-not-render/)).toBeNull();
    expect(cardBatchTotals).toHaveBeenCalledWith(ADMIN, [BATCH]);
  });

  it('reads the filter from the address, sends it to the list and the count, and shows it', async () => {
    listCardBatches.mockResolvedValue([]);
    countCardBatches.mockResolvedValue({ total: 0, before: 0 });
    cardBatchTotals.mockResolvedValue([]);
    const sent = {
      batch: 'b11',
      status: 'revoked',
      mintedFrom: '2026-10-01',
      mintedTo: '2026-10-31',
      expiresFrom: '2026-11-01',
      expiresTo: '2026-12-31',
    };

    render(
      await CardsPage({
        searchParams: Promise.resolve({ ...sent, status: ' revoked ', batch: ' b11 ' }),
      }),
    );

    expect(listCardBatches).toHaveBeenCalledWith(ADMIN, sent, expect.anything());
    expect(countCardBatches).toHaveBeenCalledWith(ADMIN, sent, undefined);
    expect(screen.getByRole('searchbox', { name: 'Batch' })).toHaveValue('b11');
  });

  it('drops a status it does not know and a day that is not a day', async () => {
    listCardBatches.mockResolvedValue([]);
    countCardBatches.mockResolvedValue({ total: 0, before: 0 });
    cardBatchTotals.mockResolvedValue([]);

    await CardsPage({ searchParams: Promise.resolve({ status: 'gone', mintedFrom: 'soon' }) });

    expect(listCardBatches).toHaveBeenCalledWith(
      ADMIN,
      expect.objectContaining({ status: undefined, mintedFrom: '' }),
      expect.anything(),
    );
  });
});
