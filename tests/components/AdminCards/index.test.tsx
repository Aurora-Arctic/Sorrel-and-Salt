import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

// The Invitation Cards and Card Sign-Ups tabs: render-only, so the page owns the read and this owns what an admin sees of it
// and sends (claude-docs/components/admin-cards.md).

vi.mock('@/lib/invitation-cards', () => ({
  cardQrSvg: (link: string) =>
    `<svg xmlns="http://www.w3.org/2000/svg"><title>${link}</title></svg>`,
  buildCardSheetsPdf: vi.fn(async () => new Uint8Array([37, 80, 68, 70])),
}));

const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const BATCH_ONE = 'b1111111-0000-4000-8000-000000000001';
const BATCHES = [
  {
    batchId: BATCH_ONE,
    mintedAt: new Date('2026-10-01T00:00:00Z'),
    expiresAt: new Date('2026-12-01T00:00:00Z'),
    cards: 27,
    accepted: 4,
    pending: 20,
    status: 'live' as const,
  },
  {
    batchId: 'b2222222-0000-4000-8000-000000000002',
    mintedAt: new Date('2026-01-01T00:00:00Z'),
    expiresAt: new Date('2026-02-01T00:00:00Z'),
    cards: 9,
    accepted: 9,
    pending: 0,
    status: 'used-up' as const,
  },
  {
    batchId: 'b3333333-0000-4000-8000-000000000003',
    mintedAt: new Date('2026-08-01T00:00:00Z'),
    expiresAt: new Date('2026-11-01T00:00:00Z'),
    cards: 9,
    accepted: 2,
    pending: 0,
    status: 'revoked' as const,
  },
  {
    batchId: 'b4444444-0000-4000-8000-000000000004',
    mintedAt: new Date('2026-03-01T00:00:00Z'),
    expiresAt: new Date('2026-04-01T00:00:00Z'),
    cards: 9,
    accepted: 0,
    pending: 0,
    status: 'expired' as const,
  },
];

// A fixed clock, so the earliest pickable expiry and the calendar's first month do not move.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-10-30T12:00:00Z') });
  router.push.mockClear();
  router.replace.mockClear();
  router.refresh.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
  Reflect.deleteProperty(URL, 'createObjectURL');
  Reflect.deleteProperty(URL, 'revokeObjectURL');
  vi.restoreAllMocks();
});

// Opens the Expires On calendar and picks 1 February 2027, a month on from the default day, which the calendar opens at.
function pickFirstOfFebruary() {
  fireEvent.click(within(dialog()).getByRole('button', { name: /Expires On/ }));
  fireEvent.click(screen.getByRole('button', { name: /Next Month/ }));
  fireEvent.click(
    within(screen.getByRole('grid')).getByRole('button', { name: /, 1 February 2027/ }),
  );
}

const dialog = () => screen.getByRole('dialog', { name: 'Mint Cards' });
const mint = () => within(dialog()).getByRole('button', { name: 'Mint Cards' });

describe('AdminCards', () => {
  it('lists a row per batch with its counts, and Revoke Batch only while a card is pending', () => {
    render(<AdminCards batches={BATCHES} />);

    const [first, second, third, fourth] = screen.getAllByRole('row').slice(1);
    expect(screen.getAllByRole('row')).toHaveLength(5);
    expect(within(first).getByText('b1111111')).toBeInTheDocument();
    expect(within(first).getByText('27')).toBeInTheDocument();
    expect(within(first).getByText('4')).toBeInTheDocument();
    expect(
      within(first).getByRole('button', { name: /^Revoke Batch b1111111/ }),
    ).toBeInTheDocument();
    expect(within(second).queryByRole('button', { name: /^Revoke Batch/ })).toBeNull();
    expect(within(first).getByText('Live')).toBeInTheDocument();
    expect(within(second).getByText('Used up')).toBeInTheDocument();
    expect(within(third).getByText('Revoked')).toBeInTheDocument();
    expect(within(fourth).getByText('Expired')).toBeInTheDocument();
    // Expires is a date; Minted On keeps the time.
    expect(within(first).getByText('1 December 2026')).toBeInTheDocument();
    expect(within(first).getByText('1 October 2026, 00:00 UTC')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Revoke card/i })).toBeNull();
  });

  it('opens the mint form by the address, from a link', () => {
    render(<MintCards />);

    expect(screen.getByRole('link', { name: 'Mint Cards' })).toHaveAttribute(
      'href',
      '/admin/invitation-cards?mint',
    );
  });

  it('keeps Mint Cards disabled until a sheet count is given, shows the total, then sends the sheets', async () => {
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
    render(<AdminCards batches={[]} minting />);

    expect(mint()).toBeDisabled();
    expect(
      within(dialog()).getByRole('spinbutton', { name: /Number of Sheets/ }),
    ).toHaveAccessibleDescription('A Letter sheet holds 9 cards.');
    fireEvent.change(within(dialog()).getByRole('spinbutton', { name: /Number of Sheets/ }), {
      target: { value: '3' },
    });
    expect(within(dialog()).getByText('3 sheets: 27 cards')).toBeInTheDocument();
    pickFirstOfFebruary();
    expect(mint()).toBeEnabled();
    fireEvent.click(mint());

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]).toEqual({ sheets: 3, expiresAt: '2027-02-01T00:00:00.000Z' });
    expect(
      await within(dialog()).findByText(/only copy of these cards and cannot be made again/),
    ).toBeInTheDocument();
    expect(within(dialog()).getByRole('button', { name: 'Download PDF' })).toBeEnabled();
    expect(within(dialog()).queryByRole('img')).toBeNull();
    expect(within(dialog()).queryByRole('button', { name: /Download Card/ })).toBeNull();
  });

  it('revokes a batch after asking, naming the batch', async () => {
    const calls: RevokeInvitationCardBatchMutationVariables[] = [];
    mockGraphQLMutation<
      RevokeInvitationCardBatchMutation,
      RevokeInvitationCardBatchMutationVariables
    >('RevokeInvitationCardBatch', (variables) => {
      calls.push(variables);
      return { revokeInvitationCardBatch: [{ id: 'c1' }] };
    });
    render(
      <StatusRegionProvider>
        <AdminCards batches={BATCHES} />
      </StatusRegionProvider>,
    );

    const open = screen.getByRole('button', { name: /^Revoke Batch b1111111/ });
    expect(open).toHaveClass('btn--quiet');
    fireEvent.click(open);
    expect(
      within(screen.getByRole('dialog')).getByText(/minted 1 October 2026\?/),
    ).toBeInTheDocument();
    expect(screen.getByText(/already accepted a card keep their access/)).toBeInTheDocument();
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Revoke Batch' }),
    );

    await waitFor(() => expect(calls).toEqual([{ batchId: BATCH_ONE }]));
  });

  const mintTwo = async () => {
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
    // The save is an anchor press; jsdom would otherwise try to open the blob address.
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    render(<AdminCards batches={[]} minting />);
    fireEvent.change(within(dialog()).getByRole('spinbutton', { name: /Number of Sheets/ }), {
      target: { value: '1' },
    });
    pickFirstOfFebruary();
    fireEvent.click(mint());
    await within(dialog()).findByRole('button', { name: 'Download PDF' });
  };

  it('builds the batch PDF from one link per code when Download PDF is pressed', async () => {
    await mintTwo();
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Download PDF' }));

    await waitFor(() => expect(buildCardSheetsPdf).toHaveBeenCalled());
    const input = vi.mocked(buildCardSheetsPdf).mock.calls[0][0];
    expect(input.links).toEqual(['http://localhost:3000/i/ta', 'http://localhost:3000/i/tb']);
    expect(input.expiresAt).toEqual(new Date('2027-02-01T00:00:00.000Z'));
    await waitFor(() =>
      expect(within(dialog()).getByRole('button', { name: 'Download Again' })).toBeEnabled(),
    );
  });

  it('says the file is saved once downloaded, offers Download Again, and keeps the object URL alive for a minute', async () => {
    await mintTwo();
    const timers = vi.spyOn(globalThis, 'setTimeout');
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Download PDF' }));

    expect(await within(dialog()).findByText(/Saved as cards-b4444444\.pdf/)).toBeInTheDocument();
    expect(
      within(dialog()).queryByText(/only copy of these cards and cannot be made again/),
    ).toBeNull();
    expect(within(dialog()).getByRole('button', { name: 'Download Again' })).toBeInTheDocument();
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    expect(timers.mock.calls.some(([, delay]) => delay === 60_000)).toBe(true);
  });

  it('asks before closing a minted batch whose PDF is not downloaded, and closes quietly after', async () => {
    await mintTwo();

    fireEvent.click(within(dialog()).getByRole('button', { name: 'Close' }));
    expect(screen.getByText(/You haven't downloaded the PDF/)).toBeInTheDocument();
    expect(screen.getByText(/revoke the batch from the list/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Keep Open' }));
    expect(screen.queryByText(/You haven't downloaded the PDF/)).toBeNull();

    fireEvent.click(within(dialog()).getByRole('button', { name: 'Download PDF' }));
    await waitFor(() => expect(buildCardSheetsPdf).toHaveBeenCalled());
    await waitFor(() =>
      expect(within(dialog()).getByRole('button', { name: 'Download Again' })).toBeEnabled(),
    );
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Close' }));
    expect(screen.queryByText(/You haven't downloaded the PDF/)).toBeNull();
  });
});

describe('Mint Cards default expiry', () => {
  it('starts the expiry 90 days from today, and sends that day', async () => {
    const calls: CreateInvitationCardsMutationVariables[] = [];
    mockGraphQLMutation<CreateInvitationCardsMutation, CreateInvitationCardsMutationVariables>(
      'CreateInvitationCards',
      (variables) => {
        calls.push(variables);
        return {
          createInvitationCards: {
            batchId: 'b5555555-0000-4000-8000-000000000005',
            expiresAt: variables.expiresAt,
            tokens: ['t1'],
          },
        };
      },
    );
    render(<AdminCards batches={[]} minting />);

    // 30 October 2026 plus 90 days is 28 January 2027.
    expect(within(dialog()).getByRole('button', { name: /Expires On/ })).toHaveTextContent(
      /28 January 2027/,
    );
    fireEvent.change(within(dialog()).getByRole('spinbutton', { name: /Number of Sheets/ }), {
      target: { value: '1' },
    });
    expect(mint()).toBeEnabled();
    fireEvent.click(mint());

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]).toEqual({ sheets: 1, expiresAt: '2027-01-28T00:00:00.000Z' });
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

    const [head, first, second] = screen.getAllByRole('row');
    expect(within(head).queryByText('Email')).toBeNull();
    expect(within(head).getByText('Accepted On')).toBeInTheDocument();
    expect(within(head).getByText('Covens Owned')).toBeInTheDocument();
    expect(within(first).getByText('wort@example.test')).toBeInTheDocument();
    expect(within(first).getByText('Testwort Coven, Second Coven')).toBeInTheDocument();
    expect(within(second).getByText('None yet')).toBeInTheDocument();
  });
});
