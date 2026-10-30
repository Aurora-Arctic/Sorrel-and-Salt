import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildCardSheetsPdf } from '@/lib/invitation-cards';
import AdminCards, { MintCards } from '@/components/AdminCards';
import AdminArrivals from '@/components/AdminCards/arrivals';
import type {
  CreateInvitationCardsMutation,
  CreateInvitationCardsMutationVariables,
  RevokeInvitationCardBatchMutation,
  RevokeInvitationCardBatchMutationVariables,
} from '@/gql/graphql';
import { StatusRegionProvider } from '@/components/ClickFeedback/status-region';
import { mockGraphQLMutation } from '../../support/msw/graphql';

// The Cards and Arrivals tabs: render-only, so the page owns the read and this owns what an admin sees of it
// and sends (claude-docs/components/admin-cards.md).

vi.mock('@/lib/invitation-cards', () => ({
  cardQrSvg: (link: string) =>
    `<svg xmlns="http://www.w3.org/2000/svg"><title>${link}</title></svg>`,
  buildCardSheetsPdf: vi.fn(async () => new Uint8Array([37, 80, 68, 70])),
}));

const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const CARDS = [
  {
    id: 'c1aaaaaa-0000-4000-8000-000000000001',
    batchId: 'b1111111-0000-4000-8000-000000000001',
    state: 'pending' as const,
    expiresAt: new Date('2026-12-01T00:00:00Z'),
    accountName: null,
  },
  {
    id: 'c2aaaaaa-0000-4000-8000-000000000002',
    batchId: 'b1111111-0000-4000-8000-000000000001',
    state: 'accepted' as const,
    expiresAt: new Date('2026-12-01T00:00:00Z'),
    accountName: 'Wort Tester',
  },
  {
    id: 'c3aaaaaa-0000-4000-8000-000000000003',
    batchId: 'b2222222-0000-4000-8000-000000000002',
    state: 'expired' as const,
    expiresAt: new Date('2026-01-01T00:00:00Z'),
    accountName: null,
  },
  {
    id: 'c4aaaaaa-0000-4000-8000-000000000004',
    batchId: 'b2222222-0000-4000-8000-000000000002',
    state: 'revoked' as const,
    expiresAt: new Date('2026-12-01T00:00:00Z'),
    accountName: null,
  },
];

beforeEach(() => {
  router.push.mockClear();
  router.replace.mockClear();
  router.refresh.mockClear();
});

const dialog = () => screen.getByRole('dialog', { name: 'Mint Cards' });
const mint = () => within(dialog()).getByRole('button', { name: 'Mint Cards' });

describe('AdminCards', () => {
  it('lists each card with its state, and Revoke only on a pending one', () => {
    render(<AdminCards cards={CARDS} />);

    const rows = screen.getAllByRole('row').slice(1);
    expect(rows).toHaveLength(4);
    for (const [row, state] of rows.map(
      (row, i) => [row, ['Pending', 'Accepted', 'Expired', 'Revoked'][i]] as const,
    )) {
      expect(within(row).getByText(state)).toBeInTheDocument();
    }
    expect(within(rows[1]).getByText('Wort Tester')).toBeInTheDocument();
    expect(within(rows[0]).getByRole('button', { name: /^Revoke card/ })).toBeInTheDocument();
    for (const row of rows.slice(1)) {
      expect(within(row).queryByRole('button', { name: /^Revoke card/ })).toBeNull();
    }
  });

  it('opens the mint form by the address, from a link', () => {
    render(<MintCards />);

    expect(screen.getByRole('link', { name: 'Mint Cards' })).toHaveAttribute(
      'href',
      '/admin/cards?mint',
    );
  });

  it('keeps Mint Cards disabled until a count and an expiry date are both given, then sends them', async () => {
    const calls: CreateInvitationCardsMutationVariables[] = [];
    mockGraphQLMutation<CreateInvitationCardsMutation, CreateInvitationCardsMutationVariables>(
      'CreateInvitationCards',
      (variables) => {
        calls.push(variables);
        return {
          createInvitationCards: {
            batchId: 'b3333333-0000-4000-8000-000000000003',
            expiresAt: variables.expiresAt,
            tokens: ['t1', 't2', 't3'],
          },
        };
      },
    );
    render(<AdminCards cards={[]} minting />);

    expect(mint()).toBeDisabled();
    fireEvent.change(within(dialog()).getByLabelText(/Number of Cards/), {
      target: { value: '3' },
    });
    expect(mint()).toBeDisabled();
    fireEvent.change(within(dialog()).getByLabelText(/Expires On/), {
      target: { value: '2026-12-01' },
    });
    expect(mint()).toBeEnabled();
    fireEvent.click(mint());

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]).toEqual({ count: 3, expiresAt: '2026-12-01T00:00:00.000Z' });
    expect(await within(dialog()).findByText(/cannot be shown again/)).toBeInTheDocument();
    for (const n of [1, 2, 3]) {
      expect(within(dialog()).getByRole('img', { name: `Code for Card ${n}` })).toBeInTheDocument();
      expect(
        within(dialog()).getByRole('button', { name: `Download Card ${n}` }),
      ).toBeInTheDocument();
    }
    expect(within(dialog()).getByRole('button', { name: 'Download PDF' })).toBeEnabled();
  });

  it('revokes a batch after asking, naming the batch', async () => {
    const calls: RevokeInvitationCardBatchMutationVariables[] = [];
    mockGraphQLMutation<
      RevokeInvitationCardBatchMutation,
      RevokeInvitationCardBatchMutationVariables
    >('RevokeInvitationCardBatch', (variables) => {
      calls.push(variables);
      return { revokeInvitationCardBatch: [{ id: CARDS[0].id }] };
    });
    render(
      <StatusRegionProvider>
        <AdminCards cards={CARDS} />
      </StatusRegionProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /^Revoke Batch b1111111/ }));
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Revoke Batch' }),
    );

    await waitFor(() => expect(calls).toEqual([{ batchId: CARDS[0].batchId }]));
  });

  it('builds the batch PDF from one link per code when Download PDF is pressed', async () => {
    mockGraphQLMutation<CreateInvitationCardsMutation, CreateInvitationCardsMutationVariables>(
      'CreateInvitationCards',
      (variables) => ({
        createInvitationCards: {
          batchId: 'b4444444-0000-4000-8000-000000000004',
          expiresAt: variables.expiresAt,
          tokens: ['ta', 'tb'],
        },
      }),
    );
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    render(<AdminCards cards={[]} minting />);
    fireEvent.change(within(dialog()).getByLabelText(/Number of Cards/), {
      target: { value: '2' },
    });
    fireEvent.change(within(dialog()).getByLabelText(/Expires On/), {
      target: { value: '2026-12-01' },
    });
    fireEvent.click(mint());
    fireEvent.click(await within(dialog()).findByRole('button', { name: 'Download PDF' }));

    await waitFor(() => expect(buildCardSheetsPdf).toHaveBeenCalled());
    const input = vi.mocked(buildCardSheetsPdf).mock.calls[0][0];
    expect(input.links).toEqual(['http://localhost:3000/i/ta', 'http://localhost:3000/i/tb']);
    expect(input.expiresAt).toEqual(new Date('2026-12-01T00:00:00.000Z'));
    await waitFor(() =>
      expect(within(dialog()).getByRole('button', { name: 'Download PDF' })).toBeEnabled(),
    );
  });
});

describe('AdminArrivals', () => {
  it('lists each arrival with its account, date and owned covens', () => {
    render(
      <AdminArrivals
        arrivals={[
          {
            id: 'a1',
            accountName: 'Wort Tester',
            accountEmail: 'wort@example.test',
            acceptedAt: new Date('2026-10-30T10:00:00Z'),
            batchId: 'b1111111-0000-4000-8000-000000000001',
            covens: ['Testwort Coven', 'Second Coven'],
          },
          {
            id: 'a2',
            accountName: 'Fern Tester',
            accountEmail: 'fern@example.test',
            acceptedAt: new Date('2026-10-29T10:00:00Z'),
            batchId: 'b1111111-0000-4000-8000-000000000001',
            covens: [],
          },
        ]}
      />,
    );

    const [, first, second] = screen.getAllByRole('row');
    expect(within(first).getByText('wort@example.test')).toBeInTheDocument();
    expect(within(first).getByText('Testwort Coven, Second Coven')).toBeInTheDocument();
    expect(within(second).getByText('None yet')).toBeInTheDocument();
  });
});
