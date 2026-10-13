import type { Story } from '@ladle/react';
import ReceivedInvitations from '.';
import type { ReceivedInvitationEntry } from './types';

// Render-only; behaviour is asserted in tests/components/ReceivedInvitations.
export default {
  title: 'Coven / Received Invitations',
};

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

export const OneInvitation: Story = () => <ReceivedInvitations invitations={[ONE]} />;

export const SeveralInvitations: Story = () => <ReceivedInvitations invitations={SEVERAL} />;

export const SecondPage: Story = () => (
  <ReceivedInvitations
    invitations={SEVERAL}
    previousHref="/coven?before=a"
    position={{ page: 2, pages: 2 }}
  />
);
