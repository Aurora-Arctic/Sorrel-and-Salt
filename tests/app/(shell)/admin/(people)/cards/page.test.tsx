import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The `/admin/cards` page: the guard first, then the identity reads. What the guard and services decide is
// tests/lib/request-session.test.ts's and tests/modules/identity/services/invitation-cards.test.ts's.

const requireAdminSession = vi.fn();
vi.mock('@/lib/request-session', () => ({ requireAdminSession }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));

const listInvitationCards = vi.fn();
const countInvitationCards = vi.fn();
const usersForAdmin = vi.fn();
const totalCardAttempts = vi.fn();
vi.mock('@/modules/identity', async () => ({
  cardState: (
    await vi.importActual<typeof import('@/modules/identity/services/invitation-cards')>(
      '@/modules/identity/services/invitation-cards',
    )
  ).cardState,
  countInvitationCards,
  listInvitationCards,
  totalCardAttempts,
  usersForAdmin,
}));

const { default: CardsPage } = await import('@/app/(shell)/admin/(people)/cards/page');

const ADMIN = { userId: '6f1c2d4e-9b8a-4c3d-8e7f-0a1b2c3d4e5f', role: 'admin' } as const;

beforeEach(() => {
  requireAdminSession.mockReset();
  requireAdminSession.mockResolvedValue(ADMIN);
  listInvitationCards.mockReset();
  countInvitationCards.mockReset();
  usersForAdmin.mockReset();
  usersForAdmin.mockResolvedValue([]);
  totalCardAttempts.mockReset();
  totalCardAttempts.mockResolvedValue([]);
});

describe('/admin/cards', () => {
  it('is refused to anyone the admin guard refuses, before any read', async () => {
    requireAdminSession.mockRejectedValue(new Error('forbidden'));

    await expect(CardsPage({ searchParams: Promise.resolve({}) })).rejects.toThrow('forbidden');
    expect(listInvitationCards).not.toHaveBeenCalled();
  });

  it('lists a card with its state and shows no hash', async () => {
    listInvitationCards.mockResolvedValue([
      {
        node: {
          id: 'c1',
          batchId: 'b1111111-0000-4000-8000-000000000001',
          acceptedAt: null,
          acceptedBy: null,
          revokedAt: null,
          expiresAt: new Date('2099-01-01T00:00:00Z'),
          tokenHash: 'a-hash-that-must-not-render',
        },
        cursor: { key: ['-1'], id: 'c1' },
      },
    ]);
    countInvitationCards.mockResolvedValue({ total: 1, before: 0 });

    render(await CardsPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.queryByText(/a-hash-that-must-not-render/)).toBeNull();
  });
});
