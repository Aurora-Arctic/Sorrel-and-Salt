import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactElement } from 'react';
import { userEvent, within } from 'storybook/test';
import { AdminTabbedFrame } from '../../../.storybook/admin-frame';
import { answerOperations, useMockHandlers } from '../../../.storybook/mock-api';
import AdminCards, { MintCards } from '.';
import AdminArrivals from './arrivals';
import type { ArrivalEntry, BatchEntry } from './types';

// Render-only; behaviour is asserted in tests/components/AdminCards.
const meta = { title: 'Admin / Invitation Cards' } satisfies Meta;
export default meta;
type Story = StoryObj;

const BATCH = '5b1c0000-0000-4000-8000-000000000001';
const FUTURE = new Date('2099-01-01T00:00:00Z');
const BATCHES: BatchEntry[] = [
  {
    batchId: BATCH,
    mintedAt: new Date('2026-10-30T10:00:00Z'),
    expiresAt: FUTURE,
    cards: 27,
    accepted: 4,
    pending: 20,
    attempts: 3,
    note: 'Handed out at the autumn fair stall. Two sheets went to the shop on the high street, one to the library desk, and the rest are held back for the winter market, so check with the stall lead before minting another batch.',
    status: 'live',
  },
  {
    batchId: '7c2d0000-0000-4000-8000-000000000002',
    mintedAt: new Date('2026-09-01T10:00:00Z'),
    expiresAt: new Date('2099-12-01T00:00:00Z'),
    cards: 9,
    accepted: 3,
    pending: 0,
    attempts: 0,
    note: 'Shop counter',
    status: 'revoked',
  },
  {
    batchId: '9e4f0000-0000-4000-8000-000000000003',
    mintedAt: new Date('2026-03-01T10:00:00Z'),
    expiresAt: new Date('2026-06-01T00:00:00Z'),
    cards: 18,
    accepted: 5,
    pending: 0,
    attempts: 0,
    note: null,
    status: 'expired',
  },
  {
    batchId: '3a8b0000-0000-4000-8000-000000000004',
    mintedAt: new Date('2026-02-01T10:00:00Z'),
    expiresAt: new Date('2026-12-01T00:00:00Z'),
    cards: 9,
    accepted: 9,
    pending: 0,
    attempts: 0,
    note: null,
    status: 'used-up',
  },
];
const ARRIVALS: ArrivalEntry[] = [
  {
    id: 'a1',
    accountName: 'Fixture Wort',
    accountEmail: 'fixture.wort@example.test',
    acceptedAt: new Date('2026-10-30T10:00:00Z'),
    batchId: BATCH,
    covens: ['Fixture Coven'],
    account: {
      openHref: '/admin/users?user=fixture',
      heading: { eyebrow: 'User', title: 'Fixture Wort' },
    },
  },
];

const Cards = ({
  batches,
  minting,
}: {
  batches: BatchEntry[];
  minting?: boolean;
}): ReactElement => (
  <AdminTabbedFrame page="people" open="/admin/invitation-cards" action={<MintCards />}>
    <AdminCards batches={batches} minting={minting} />
  </AdminTabbedFrame>
);

export const Default: Story = { render: () => <Cards batches={BATCHES} /> };
export const Empty: Story = { render: () => <Cards batches={[]} /> };
export const Minting: Story = { render: () => <Cards batches={BATCHES} minting /> };
const ATTEMPTS = [
  ['Fixture Wort', 'fixture.wort@example.test', 4, 'revoked', 3],
  ['Testa Longname Mockleaf', 'testa.longname.mockleaf@example.test', 11, 'accepted', 12],
  ['Mocka Once', 'mocka.once@example.test', 20, 'expired', 1],
].map(([name, email, cardPosition, reason, attempts], i) => ({
  node: {
    id: `at${i}`,
    reason,
    attempts,
    cardPosition,
    firstAttemptedAt: '2026-10-30T10:00:00Z',
    lastAttemptedAt: '2026-10-31T09:30:00Z',
    account: { id: `ac${i}`, name, email },
  },
}));
const REFUSED = [
  answerOperations(({ operationName }) =>
    operationName === 'InvitationCardAttempts'
      ? {
          invitationCardAttempts: {
            edges: ATTEMPTS,
            pageInfo: { hasNextPage: false, endCursor: null },
          },
        }
      : undefined,
  ),
];

const RefusedOpens = (): ReactElement => {
  useMockHandlers(REFUSED);
  return <Cards batches={BATCHES} />;
};

/** The Refused Opens dialog open on a batch: a table where the dialog is wide, stacked on a phone. */
export const RefusedOpensDialog: Story = {
  render: () => <RefusedOpens />,
  play: async ({ canvasElement }) => {
    await userEvent.click(
      await within(canvasElement).findByRole('button', { name: /View Refused Opens/ }),
    );
  },
};

export const Arrivals: Story = {
  render: () => (
    <AdminTabbedFrame page="people" open="/admin/card-sign-ups">
      <AdminArrivals arrivals={ARRIVALS} />
    </AdminTabbedFrame>
  ),
};

const MINTED = [
  answerOperations(({ operationName }) =>
    operationName === 'CreateInvitationCards'
      ? {
          createInvitationCards: {
            batchId: BATCH,
            expiresAt: '2027-01-29T12:00:00.000Z',
            tokens: Array.from({ length: 9 }, (_, i) => `fixturetoken${i}abcd`),
          },
        }
      : undefined,
  ),
];

const MintedDialog = (): ReactElement => {
  useMockHandlers(MINTED);
  return <Cards batches={BATCHES} minting />;
};

/** The dialog after minting: where the admin downloads the PDF. */
export const Minted: Story = {
  render: () => <MintedDialog />,
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.type(await body.findByRole('spinbutton', { name: /Number of Sheets/ }), '1');
    await userEvent.click(await body.findByRole('button', { name: 'Mint Cards' }));
  },
};
