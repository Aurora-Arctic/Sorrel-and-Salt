import type { Story } from '@ladle/react';
import type { ReactElement } from 'react';
import { ADMIN_CHANGES_PAUSED_REFUSAL } from '../../lib/primary-admin';
import { WorkshopPathname } from '../../../.ladle/navigation';
import { ADMIN_PAGES } from '../AdminNav/sections';
import TabbedPage from '../TabbedPage';
import AdminInvitations, { InviteAdmin } from '.';
import { invitationsHref } from './href';
import type { AdminInvitationEntry, AdminInvitationsFilter, AdminInvitationsProps } from './types';

// Render-only; behaviour is asserted in tests/components/AdminInvitations.
// Invite and Revoke talk to the network only when sent, so nothing is mocked:
// a send in the workshop fails into its alert, which is itself a state worth
// seeing.
export default {
  title: 'Admin / Admin Invitations',
};

const INVITATIONS: AdminInvitationEntry[] = [
  {
    id: 'i1',
    email: 'ada@example.test',
    note: 'Curates the resins',
    expiresAt: new Date('2026-10-17T20:05:00Z'),
  },
  {
    id: 'i2',
    email: 'brook.fixturewort@example.test',
    note: null,
    expiresAt: new Date('2026-10-16T09:00:00Z'),
  },
];

// The filter a page shows: part of an address and Expires in 24 Hrs, which
// leaves the one invitation lapsing tomorrow morning.
const FILTER: AdminInvitationsFilter = { email: 'brook', expiringSoon: true };

// The admin layout's frame and the People page with its Invitations tab
// open, as /admin/invitations draws them: Invite Admin beside the heading as
// the tab's action, the filter row and the list beneath.
const Frame = ({
  invitations,
  filter,
  cursor,
  locked,
  inviting,
  ...pager
}: AdminInvitationsProps): ReactElement => (
  <WorkshopPathname.Provider value="/admin/invitations">
    <div className="admin-layout">
      <TabbedPage
        title={ADMIN_PAGES.people.label}
        tabs={ADMIN_PAGES.people.tabs}
        action={<InviteAdmin locked={locked} filter={filter} cursor={cursor} />}
      >
        <AdminInvitations
          invitations={invitations}
          filter={filter}
          cursor={cursor}
          locked={locked}
          inviting={inviting}
          {...pager}
        />
      </TabbedPage>
    </div>
  </WorkshopPathname.Provider>
);

// A middle page of a list longer than one: the page's 25, newest first, and
// the pager beneath them, both ends live and where the page stands between.
const PAGE_TWO: AdminInvitationEntry[] = Array.from({ length: 25 }, (_, index) => ({
  id: `p${index}`,
  email: `fixture.invitee${index + 26}@example.test`,
  note: index % 3 === 0 ? 'Curates the resins' : null,
  expiresAt: new Date(Date.UTC(2026, 9, 17, 20, 5) - (index + 25) * 3_600_000),
}));
const PageTwo = (): ReactElement => (
  <Frame
    invitations={PAGE_TWO}
    cursor={{ after: 'cursor-25' }}
    previousHref={invitationsHref({}, { before: 'cursor-26' })}
    nextHref={invitationsHref({}, { after: 'cursor-50' })}
    position={{ page: 2, pages: 3 }}
  />
);

export const Pending: Story = () => <Frame invitations={INVITATIONS} />;

export const NoneWaiting: Story = () => <Frame invitations={[]} />;

// Filtered by part of an address and Expires in 24 Hrs: the fields hold the
// filter shown, Clear is offered, and one invitation is left.
export const Filtered: Story = () => <Frame invitations={INVITATIONS.slice(1)} filter={FILTER} />;

// A filter that leaves none: the empty state names it.
export const NoMatch: Story = () => <Frame invitations={[]} filter={FILTER} />;

export const OnePageOfSeveral: Story = () => <PageTwo />;

// A middle page at phone width: the pager beneath the last card.
export const OnePageOfSeveralPhoneDark: Story = () => <PageTwo />;
OnePageOfSeveralPhoneDark.meta = { theme: 'dark', width: 375 };

export const OnePageOfSeveralPhoneLight: Story = () => <PageTwo />;
OnePageOfSeveralPhoneLight.meta = { theme: 'light', width: 375 };

// Invite Admin pressed: the form `?invite` opens over the list.
export const Inviting: Story = () => <Frame invitations={INVITATIONS} inviting />;

// Paused, to an admin who is not the primary one: Invite Admin and every
// Revoke in view but locked, the pause as the reason in a tip.
export const Paused: Story = () => (
  <Frame invitations={INVITATIONS} locked={ADMIN_CHANGES_PAUSED_REFUSAL} />
);

// At phone width: Invite Admin across the line beneath the heading, the
// filter row stacked, the Email box across the line and the switch, and
// Clear beneath it, and each invitation a card, Revoke across its
// foot.
export const PhoneDark: Story = () => <Frame invitations={INVITATIONS} />;
PhoneDark.meta = { theme: 'dark', width: 375 };

export const PhoneLight: Story = () => <Frame invitations={INVITATIONS} />;
PhoneLight.meta = { theme: 'light', width: 375 };

// The filter applied, at phone width.
export const FilteredPhoneDark: Story = () => (
  <Frame invitations={INVITATIONS.slice(1)} filter={FILTER} />
);
FilteredPhoneDark.meta = { theme: 'dark', width: 375 };

export const FilteredPhoneLight: Story = () => (
  <Frame invitations={INVITATIONS.slice(1)} filter={FILTER} />
);
FilteredPhoneLight.meta = { theme: 'light', width: 375 };
