import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactElement } from 'react';
import { AdminTabbedFrame } from '../../../.storybook/admin-frame';
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
export const Arrivals: Story = {
  render: () => (
    <AdminTabbedFrame page="people" open="/admin/card-sign-ups">
      <AdminArrivals arrivals={ARRIVALS} />
    </AdminTabbedFrame>
  ),
};
