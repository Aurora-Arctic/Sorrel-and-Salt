import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactElement } from 'react';
import { AdminTabbedFrame } from '../../../.storybook/admin-frame';
import AdminCards, { MintCards } from '.';
import AdminArrivals from './arrivals';
import type { ArrivalEntry, CardEntry } from './types';

// Render-only; behaviour is asserted in tests/components/AdminCards.
const meta = { title: 'Admin / Cards' } satisfies Meta;
export default meta;
type Story = StoryObj;

const BATCH = '5b1c0000-0000-4000-8000-000000000001';
const FUTURE = new Date('2099-01-01T00:00:00Z');
const CARDS: CardEntry[] = [
  {
    id: 'c1',
    batchId: BATCH,
    state: 'pending',
    expiresAt: FUTURE,
    accountName: null,
    attemptCount: 0,
  },
  {
    id: 'c2',
    batchId: BATCH,
    state: 'accepted',
    expiresAt: FUTURE,
    accountName: 'Fixture Wort',
    attemptCount: 3,
  },
  {
    id: 'c3',
    batchId: BATCH,
    state: 'expired',
    expiresAt: new Date('2026-01-01T00:00:00Z'),
    accountName: null,
    attemptCount: 0,
  },
  {
    id: 'c4',
    batchId: BATCH,
    state: 'revoked',
    expiresAt: FUTURE,
    accountName: null,
    attemptCount: 0,
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
  },
];

const Cards = ({ cards, minting }: { cards: CardEntry[]; minting?: boolean }): ReactElement => (
  <AdminTabbedFrame page="people" open="/admin/cards" action={<MintCards />}>
    <AdminCards cards={cards} minting={minting} />
  </AdminTabbedFrame>
);

export const Default: Story = { render: () => <Cards cards={CARDS} /> };
export const Empty: Story = { render: () => <Cards cards={[]} /> };
export const Minting: Story = { render: () => <Cards cards={CARDS} minting /> };
export const Arrivals: Story = {
  render: () => (
    <AdminTabbedFrame page="people" open="/admin/arrivals">
      <AdminArrivals arrivals={ARRIVALS} />
    </AdminTabbedFrame>
  ),
};
