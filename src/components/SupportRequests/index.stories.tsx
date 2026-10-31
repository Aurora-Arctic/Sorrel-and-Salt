import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactElement } from 'react';
import { WorkshopNavigation } from '../../../.storybook/navigation';
import SupportRequests from '.';
import type { SupportRequestDetailEntry, SupportRequestEntry } from './types';

// Render-only; behaviour is asserted in tests/components/SupportRequests.
const meta = {
  title: 'Admin / Support Requests',
} satisfies Meta;
export default meta;
type Story = StoryObj;

const SENDER = { id: 'sender-1', name: 'Hazel Brook', email: 'hazel@example.test' };
const ADMIN = { id: 'admin-1', name: 'Ash Warden' };
const CURATOR = { id: 'curator-1', name: 'Fern Keeper' };

const REQUESTS: SupportRequestEntry[] = [
  {
    id: 'request-1',
    about: 'bug',
    subject: 'Wobbling Cauldron',
    status: 'open',
    sender: SENDER,
    assignee: CURATOR,
    curatorVisible: true,
    errorCode: 500,
  },
  {
    id: 'request-2',
    about: 'question',
    subject: 'Where Do Invitations Go',
    status: 'resolved',
    sender: SENDER,
    assignee: null,
    curatorVisible: false,
    errorCode: null,
  },
];

const OPENED: SupportRequestDetailEntry = {
  ...REQUESTS[0]!,
  message: 'The cauldron wobbles every time I save.',
  path: '/coven/[slug]/grimoire',
  issueUrl: null,
  resolvedBy: null,
  resolvedAt: null,
  replies: [
    {
      id: 'reply-1',
      body: 'Thank you, we are looking at it.',
      author: ADMIN,
      createdAt: new Date('2026-10-30T09:00:00Z'),
    },
  ],
  timeouts: [
    {
      id: 'timeout-1',
      until: new Date('2026-09-01T09:00:00Z'),
      note: 'Repeated test messages',
      liftedAt: null,
    },
  ],
};

const Page = ({ opened }: { opened?: SupportRequestDetailEntry }): ReactElement => (
  <WorkshopNavigation.Provider value={() => undefined}>
    <SupportRequests
      requests={REQUESTS}
      viewer={{ id: ADMIN.id, role: 'admin' }}
      assignees={[ADMIN, CURATOR]}
      opened={opened}
    />
  </WorkshopNavigation.Provider>
);

export const List: Story = { render: () => <Page /> };
export const Opened: Story = { render: () => <Page opened={OPENED} /> };
export const Empty: Story = {
  render: () => (
    <WorkshopNavigation.Provider value={() => undefined}>
      <SupportRequests requests={[]} viewer={{ id: ADMIN.id, role: 'admin' }} />
    </WorkshopNavigation.Provider>
  ),
};
