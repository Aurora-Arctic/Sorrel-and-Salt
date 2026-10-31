import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { buildCardSheetsPdf } from '@/lib/invitation-cards';
import AdminCards, { MintCards } from '@/components/AdminCards';
import AdminArrivals, { ArrivalsActions } from '@/components/AdminCards/arrivals';
import type {
  CreateInvitationCardsMutation,
  CreateInvitationCardsMutationVariables,
  InvitationCardAttemptsQuery,
  InvitationCardAttemptsQueryVariables,
  RevokeInvitationCardBatchMutation,
  RevokeInvitationCardBatchMutationVariables,
} from '@/gql/graphql';
import { RouteModalContext } from '@/components/Modal/route-modal-provider';
import type { RouteModalOpener } from '@/components/Modal/types';
import { StatusRegionProvider } from '@/components/ClickFeedback/status-region';
import { FILTER_ROWS } from '../../support/filter-form';
import { Navigating } from '../../support/navigating';
import type { FilterFormSubject } from '../../support/types';
import { mockGraphQLMutation, mockGraphQLQuery } from '../../support/msw/graphql';

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
    attempts: 3,
    status: 'live' as const,
  },
  {
    batchId: 'b2222222-0000-4000-8000-000000000002',
    mintedAt: new Date('2026-01-01T00:00:00Z'),
    expiresAt: new Date('2026-02-01T00:00:00Z'),
    cards: 9,
    accepted: 9,
    pending: 0,
    attempts: 0,
    status: 'used-up' as const,
  },
  {
    batchId: 'b3333333-0000-4000-8000-000000000003',
    mintedAt: new Date('2026-08-01T00:00:00Z'),
    expiresAt: new Date('2026-11-01T00:00:00Z'),
    cards: 9,
    accepted: 2,
    pending: 0,
    attempts: 0,
    status: 'revoked' as const,
  },
  {
    batchId: 'b4444444-0000-4000-8000-000000000004',
    mintedAt: new Date('2026-03-01T00:00:00Z'),
    expiresAt: new Date('2026-04-01T00:00:00Z'),
    cards: 9,
    accepted: 0,
    pending: 0,
    attempts: 0,
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
  it('shows how many refused opens each batch has, and a way to the list only where there are some', () => {
    render(<AdminCards batches={BATCHES} />);

    const [first, second] = screen.getAllByRole('row').slice(1);
    expect(within(first).getByText('3')).toBeInTheDocument();
    expect(within(first).getByRole('button', { name: /^View Refused Opens/ })).toBeInTheDocument();
    expect(within(second).queryByRole('button', { name: /^View Refused Opens/ })).toBeNull();
  });

  it("lists the account, the reason, the count and the first and latest times of a batch's refused opens", async () => {
    mockGraphQLQuery<InvitationCardAttemptsQuery, InvitationCardAttemptsQueryVariables>(
      'InvitationCardAttempts',
      ({ batchId }) => {
        expect(batchId).toBe(BATCH_ONE);
        return {
          invitationCardAttempts: {
            edges: [
              {
                node: {
                  id: 'a1',
                  reason: 'revoked',
                  attempts: 2,
                  cardPosition: 14,
                  firstAttemptedAt: '2026-10-28T08:00:00.000Z',
                  lastAttemptedAt: '2026-10-29T09:30:00.000Z',
                  account: { id: 'u1', name: 'Other Wort', email: 'other@example.test' },
                },
              },
            ],
            pageInfo: { hasNextPage: false, endCursor: null },
          },
        };
      },
    );
    render(<AdminCards batches={BATCHES} />);

    fireEvent.click(screen.getByRole('button', { name: /^View Refused Opens/ }));

    const list = await screen.findByRole('dialog', { name: 'Refused Opens, Batch b1111111' });
    expect(within(list).getByText(/already admits nobody/)).toBeInTheDocument();
    expect(await within(list).findByText('Other Wort')).toBeInTheDocument();
    const row = within(list).getByText('Other Wort').closest('tr') as HTMLElement;
    expect(within(row).getByText('other@example.test')).toBeInTheDocument();
    expect(within(row).getByRole('link', { name: 'Other Wort' })).toHaveAttribute(
      'href',
      '/admin/users?user=u1',
    );
    expect(within(row).getByText('Sheet 2, Card 5')).toBeInTheDocument();
    expect(within(row).getByText('Revoked')).toBeInTheDocument();
    expect(within(row).getByText('2')).toBeInTheDocument();
    const times = row.querySelectorAll('time');
    expect(times[0]).toHaveTextContent(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    expect(times[0]).toHaveAttribute('datetime', '2026-10-28T08:00:00.000Z');
    expect(times[1]).toHaveAttribute('datetime', '2026-10-29T09:30:00.000Z');
    expect(within(list).getByRole('columnheader', { name: 'First' })).toBeInTheDocument();
    expect(within(list).queryByRole('columnheader', { name: 'Email' })).toBeNull();
    // The email sits in the Account cell, under the name.
    expect(
      within(within(row).getAllByRole('cell')[0]).getByText('other@example.test'),
    ).toBeInTheDocument();
  });

  it('shows a removed account as Removed account, with no link and no email', async () => {
    mockGraphQLQuery<InvitationCardAttemptsQuery, InvitationCardAttemptsQueryVariables>(
      'InvitationCardAttempts',
      () => ({
        invitationCardAttempts: {
          edges: [
            {
              node: {
                id: 'a2',
                reason: 'accepted',
                attempts: 1,
                cardPosition: null,
                firstAttemptedAt: '2026-10-28T08:00:00.000Z',
                lastAttemptedAt: '2026-10-29T09:30:00.000Z',
                account: null,
              },
            },
          ],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      }),
    );
    render(<AdminCards batches={BATCHES} />);

    fireEvent.click(screen.getByRole('button', { name: /^View Refused Opens/ }));

    const list = await screen.findByRole('dialog', { name: 'Refused Opens, Batch b1111111' });
    expect(within(list).getByText('Loading…')).toBeInTheDocument();
    expect(await within(list).findByText('Removed account')).toBeInTheDocument();
    expect(within(list).getByText('Accepted by another account')).toBeInTheDocument();
    expect(within(list).getByText('Unknown')).toBeInTheDocument();
    expect(within(list).queryByRole('link')).toBeNull();
  });

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
    // Expires is a UTC day; Minted On keeps the time, in the viewer's zone.
    expect(within(first).getByText('2026-12-01')).toBeInTheDocument();
    expect(first.querySelector('time[datetime="2026-10-01T00:00:00.000Z"]')).toHaveTextContent(
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/,
    );
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

  it('sends nothing for Revoke Batch until the question is confirmed, then revokes the batch', async () => {
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
    expect(open).toHaveClass('btn--destructive');
    fireEvent.click(open);
    // Asking comes first: the open alone sends nothing.
    expect(calls).toEqual([]);
    expect(
      within(screen.getByRole('dialog')).getByText(/minted 1 October 2026\?/),
    ).toBeInTheDocument();
    expect(screen.getByText(/already accepted a card keep their access/)).toBeInTheDocument();
    const confirm = within(screen.getByRole('dialog')).getByRole('button', {
      name: 'Revoke Batch',
    });
    expect(confirm).toHaveClass('btn--destructive');
    expect(calls).toEqual([]);
    fireEvent.click(confirm);

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
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    onTestFinished(() => click.mockRestore());
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

const WORT = {
  openHref: '/admin/users?user=u-wort' as const,
  heading: { eyebrow: 'User', title: 'Wort Tester' },
};

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
            account: WORT,
          },
          {
            id: 'a2',
            accountName: 'Fern Tester',
            accountEmail: 'fern@example.test',
            acceptedAt: new Date('2026-10-29T10:00:00Z'),
            batchId: 'b1111111-0000-4000-8000-000000000001',
            covens: [],
            account: null,
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

  it("opens the account's user modal from its name, and leaves a removed account as plain text", () => {
    const opener: RouteModalOpener = { loading: undefined, open: vi.fn(), cancel: vi.fn() };
    render(
      <RouteModalContext.Provider value={opener}>
        <AdminArrivals
          arrivals={[
            {
              id: 'a1',
              accountName: 'Wort Tester',
              accountEmail: 'wort@example.test',
              acceptedAt: new Date('2026-10-30T10:00:00Z'),
              batchId: 'b1111111-0000-4000-8000-000000000001',
              covens: [],
              account: WORT,
            },
            {
              id: 'a2',
              accountName: 'Removed account',
              accountEmail: '',
              acceptedAt: new Date('2026-10-29T10:00:00Z'),
              batchId: 'b1111111-0000-4000-8000-000000000001',
              covens: [],
              account: null,
            },
          ]}
        />
      </RouteModalContext.Provider>,
    );

    const link = screen.getByRole('link', { name: 'Wort Tester' });
    expect(link).toHaveAttribute('href', WORT.openHref);
    fireEvent.click(link);
    expect(opener.open).toHaveBeenCalledExactlyOnceWith(WORT.openHref, WORT.heading, undefined);
    expect(screen.getByText('Removed account')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Removed account' })).toBeNull();
  });
});

// The Cards tab's filter. The shared rows assert the address it builds and which values count as a filter;
// the rest proves each field writes the URL and the table shows what the URL holds.
describe('AdminCards filter', () => {
  const NONE = {
    batch: '',
    status: '' as const,
    mintedFrom: '',
    mintedTo: '',
    expiresFrom: '',
    expiresTo: '',
  };
  const FILTER = {
    batch: 'b11',
    status: 'live' as const,
    mintedFrom: '2026-10-01',
    mintedTo: '2026-10-31',
    expiresFrom: '2026-11-01',
    expiresTo: '2026-12-31',
  };
  const PATH = '/admin/invitation-cards';
  const send = (batch: string, status: string, mf: string, mt: string, ef: string, et: string) =>
    `batch=${batch}&status=${status}&mintedFrom=${mf}&mintedTo=${mt}&expiresFrom=${ef}&expiresTo=${et}`;

  const SUBJECT: FilterFormSubject = {
    label: 'Filter Invitation Cards',
    path: PATH,
    searchLabel: 'Batch',
    push: router.push,
    none: { list: <AdminCards batches={BATCHES} />, sends: send('', '', '', '', '', '') },
    shown: {
      list: <AdminCards batches={BATCHES} filter={FILTER} cursor={{ after: 'c25' }} />,
      sends: send('b11', 'live', '2026-10-01', '2026-10-31', '2026-11-01', '2026-12-31'),
    },
    alone: [
      [{ ...NONE, batch: 'b11' }, send('b11', '', '', '', '', '')],
      [{ ...NONE, status: 'revoked' as const }, send('', 'revoked', '', '', '', '')],
      [{ ...NONE, mintedFrom: '2026-10-01' }, send('', '', '2026-10-01', '', '', '')],
      [{ ...NONE, mintedTo: '2026-10-31' }, send('', '', '', '2026-10-31', '', '')],
      [{ ...NONE, expiresFrom: '2026-11-01' }, send('', '', '', '', '2026-11-01', '')],
      [{ ...NONE, expiresTo: '2026-12-31' }, send('', '', '', '', '', '2026-12-31')],
    ].map(([filter, sends]) => ({
      list: <AdminCards batches={[]} filter={filter as typeof NONE} />,
      sends: sends as string,
    })),
    searched: `${PATH}?batch=Two+words&status=live&mintedFrom=2026-10-01&mintedTo=2026-10-31&expiresFrom=2026-11-01&expiresTo=2026-12-31`,
  };

  const inFlight = (ui: ReactNode) => render(<Navigating push={router.push}>{ui}</Navigating>);

  it.each(FILTER_ROWS)('%s', (_title, run) => run(SUBJECT));

  it('writes the status picked to the URL from the first page, carrying the batch typed', async () => {
    inFlight(<AdminCards batches={BATCHES} cursor={{ after: 'c25' }} />);

    fireEvent.change(screen.getByRole('searchbox', { name: 'Batch' }), {
      target: { value: ' b22 ' },
    });
    fireEvent.click(screen.getByRole('combobox', { name: 'Status' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('option', { name: 'Used up' }));
    });

    expect(router.push).toHaveBeenCalledExactlyOnceWith(`${PATH}?batch=b22&status=used-up`);
  });

  it.each([
    ['Minted From', 'mintedFrom'],
    ['Minted To', 'mintedTo'],
    ['Expires From', 'expiresFrom'],
    ['Expires To', 'expiresTo'],
  ])('writes the day picked in %s to the URL from the first page', async (label, name) => {
    inFlight(<AdminCards batches={BATCHES} cursor={{ after: 'c25' }} />);

    fireEvent.click(screen.getByRole('button', { name: new RegExp(label) }));
    await act(async () => {
      fireEvent.click(
        within(screen.getByRole('grid')).getByRole('button', { name: /, 15 October 2026/ }),
      );
    });

    expect(router.push).toHaveBeenCalledExactlyOnceWith(`${PATH}?${name}=2026-10-15`);
  });

  it('shows the filter the URL holds in its fields and the rows sent for it', () => {
    render(<AdminCards batches={[BATCHES[0]]} filter={FILTER} />);

    expect(screen.getByRole('searchbox', { name: 'Batch' })).toHaveValue('b11');
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveTextContent('Live');
    expect(screen.getByRole('button', { name: /Minted From/ })).toHaveTextContent('2026');
    expect(screen.getAllByRole('row')).toHaveLength(2);
  });

  it('names the filter in use when nothing matches, and Clear leads to every batch', () => {
    render(<AdminCards batches={[]} filter={{ ...NONE, batch: 'zz' }} />);

    expect(screen.getByText(/zz/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Clear' })).toHaveAttribute('href', PATH);
  });
});

describe('AdminArrivals filter', () => {
  const PATH = '/admin/card-sign-ups';
  const SUBJECT: FilterFormSubject = {
    label: 'Filter Card Sign-Ups',
    path: PATH,
    searchLabel: 'Name, Email or Batch',
    push: router.push,
    none: { list: <AdminArrivals arrivals={[]} />, sends: 'query=' },
    shown: {
      list: <AdminArrivals arrivals={[]} filter={{ query: 'wort' }} />,
      sends: 'query=wort',
    },
    alone: [
      {
        list: <AdminArrivals arrivals={[]} filter={{ query: 'b11' }} />,
        sends: 'query=b11',
      },
    ],
    searched: `${PATH}?query=Two+words`,
  };

  it.each(FILTER_ROWS)('%s', (_title, run) => run(SUBJECT));

  it('is one search box, saying in its tip what it matches', () => {
    render(<AdminArrivals arrivals={[]} filter={{ query: 'wort' }} />);

    expect(screen.getAllByRole('searchbox')).toHaveLength(1);
    const box = screen.getByRole('searchbox', { name: 'Name, Email or Batch' });
    expect(box).toHaveValue('wort');
    expect(box).toHaveAccessibleDescription(/batch/i);
  });

  const askedCsv = async (filter: { query: string }) => {
    const asked: unknown[] = [];
    mockGraphQLQuery('CardArrivalsCsv', (variables) => {
      asked.push(variables);
      return { cardArrivalsCsv: 'name,email\n' };
    });
    // The anchor's click is stubbed: jsdom would navigate to the object URL, and every later request in the file would fail on the page's origin.
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    onTestFinished(() => click.mockRestore());
    URL.createObjectURL = vi.fn(() => 'blob:csv');
    URL.revokeObjectURL = vi.fn();

    render(<ArrivalsActions filter={filter} />);
    fireEvent.click(screen.getByRole('button', { name: /Download CSV/ }));
    await waitFor(() => expect(asked).toHaveLength(1));
    return asked[0];
  };

  it('sends the filter shown to the CSV download', async () => {
    expect(await askedCsv({ query: 'wort' })).toEqual({ query: 'wort' });
  });

  it('sends no variables when the filter is blank, as on the unfiltered tab', async () => {
    expect(await askedCsv({ query: '' })).toEqual({});
  });
});
