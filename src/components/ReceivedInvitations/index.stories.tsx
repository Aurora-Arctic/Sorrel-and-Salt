import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import ReceivedInvitations from '.';
import type { ReceivedInvitationEntry, ReceivedInvitationsProps } from './types';

// Render-only; behaviour is asserted in tests/components/ReceivedInvitations.
// Each story sits in the account page's Invitations section, a panel in the narrow
// frame, because the list's stacked rows depend on the panel's width.
const meta = {
  title: 'Account / Invitations Received',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: import('react').ReactNode }>;

const ONE: ReceivedInvitationEntry = {
  id: 'i-1',
  covenName: 'Fixture Coven',
  covenSlug: 'fixture-coven',
  role: 'member',
  inviterName: 'Ada Fixture',
  expiresAt: new Date('2026-10-19'),
  note: null,
};

const SEVERAL: readonly ReceivedInvitationEntry[] = [
  ONE,
  {
    id: 'i-2',
    covenName: 'Testwort Circle',
    covenSlug: 'testwort-circle',
    role: 'viewer',
    inviterName: null,
    expiresAt: new Date('2026-10-18'),
    note: 'We meet on the first Friday of each month.',
  },
  {
    id: 'i-3',
    covenName: 'Fixtura Grove',
    covenSlug: 'fixtura-grove',
    role: 'member',
    inviterName: null,
    expiresAt: new Date('2026-10-17'),
    note: null,
  },
];

const Page = ({ invitations, ...rest }: ReceivedInvitationsProps) => (
  <main className="page-frame page-frame--narrow">
    <section className="page-frame__section panel" aria-labelledby="invitations-heading">
      <div className="header">
        <h2 id="invitations-heading">Invitations</h2>
        <p className="lede">Covens that have invited this email address to join them.</p>
      </div>
      <ReceivedInvitations invitations={invitations} {...rest} />
    </section>
  </main>
);

const oneInvitationNode = <Page invitations={[ONE]} />;

const defaultNode = <Page invitations={SEVERAL} />;

// The section is always on the account page, so an empty list is drawn too.
const emptyNode = <Page invitations={[]} />;

const lastPageNode = (
  <Page invitations={SEVERAL} previousHref="/account?before=a" position={{ page: 2, pages: 2 }} />
);

const STATES_STATES: Record<string, ReactNode> = {
  Default: defaultNode,
  'One Invitation': oneInvitationNode,
  Empty: emptyNode,
  'Last Page': lastPageNode,
};

export const States: Story = {
  args: { state: 'Default' },
  argTypes: {
    state: { control: 'select', options: Object.keys(STATES_STATES), mapping: STATES_STATES },
  },
  render: ({ state }) => <div key={String(state)}>{state}</div>,
};
