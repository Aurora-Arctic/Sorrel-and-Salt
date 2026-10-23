import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { ADMIN_CHANGES_PAUSED_REFUSAL } from '../../lib/primary-admin';
import { AdminTabbedFrame } from '../../../.storybook/admin-frame';
import { INVITATIONS } from '../../../.storybook/fixtures';
import { WorkshopNavigation } from '../../../.storybook/navigation';
import AdminInvitations, { InviteAdmin } from '.';
import { invitationsHref } from './href';
import type { AdminInvitationEntry, AdminInvitationsFilter, AdminInvitationsProps } from './types';

// Render-only; behaviour is asserted in tests/components/AdminInvitations.
// Invite and Revoke talk to the network only when sent, so nothing is mocked:
// a send in the workshop fails into its alert, which is itself a state worth
// seeing.
const meta = {
  title: 'Admin / Invitations',
} satisfies Meta;
export default meta;
// The dropdown story's `state` arg is the node it draws (see its argTypes mapping).
type Story = StoryObj<{ state?: import('react').ReactNode }>;

// The filter a page shows: part of an address and Expires in 24 Hrs, which
// leaves the one invitation lapsing tomorrow morning.
const FILTER: AdminInvitationsFilter = { email: 'brook', expiringSoon: true };

// The admin layout's frame and the People page with its Invitations tab
// open, as /admin/invitations draws them: New Invitation beside the heading as
// the tab's action, the filter row and the list beneath.
const Frame = ({
  invitations,
  filter,
  cursor,
  locked,
  inviting,
  ...pager
}: AdminInvitationsProps): ReactElement => (
  <AdminTabbedFrame
    page="people"
    open="/admin/invitations"
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
  </AdminTabbedFrame>
);

// A middle page of a list longer than one: the page's 25, newest first, and
// the pager beneath them, both ends live and where the page stands between.
const PAGE_TWO: AdminInvitationEntry[] = Array.from({ length: 25 }, (_, index) => ({
  id: `p${index}`,
  email: `fixture.invitee${index + 26}@example.test`,
  siteRole: index % 4 === 0 ? 'admin' : 'curator',
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

const defaultNode = <Frame invitations={INVITATIONS} />;

const emptyNode = <Frame invitations={[]} />;

// Filtered by part of an address and Expires in 24 Hrs: the fields hold the
// filter shown, Clear is offered, and one invitation is left.
const filteredNode = <Frame invitations={INVITATIONS.slice(1)} filter={FILTER} />;

// A filter that leaves none: the empty state names it.
const noMatchesNode = <Frame invitations={[]} filter={FILTER} />;

const middlePageNode = <PageTwo />;

// New Invitation pressed: the form `?invite` opens over the list. Closing it
// navigates to the list's address without `?invite`, which the workshop's
// router reports (.storybook/navigation.ts) and this holds as the page's state,
// so the list beneath is usable once the form is gone, and Open Again
// brings the form back.
export const Inviting: Story = {
  render: () => {
    const [inviting, setInviting] = useState(true);
    return (
      <WorkshopNavigation.Provider
        value={(href) =>
          setInviting(new URL(href, 'http://workshop.test').searchParams.has('invite'))
        }
      >
        <Frame invitations={INVITATIONS} inviting={inviting} />
        {!inviting && (
          <button type="button" className="btn btn--solid" onClick={() => setInviting(true)}>
            Open Again
          </button>
        )}
      </WorkshopNavigation.Provider>
    );
  },
};

// Paused, to an admin who is not the primary one: New Invitation and every
// Revoke in view but locked, the pause as the reason in a tip.
const pausedNode = <Frame invitations={INVITATIONS} locked={ADMIN_CHANGES_PAUSED_REFUSAL} />;

// One story with a control to choose the state: each is a whole page or list,
// too big to sit beside the others (claude-docs/workshop.md, rule 5).
const STATES: Record<string, ReactNode> = {
  Default: defaultNode,
  Empty: emptyNode,
  Filtered: filteredNode,
  'No Matches': noMatchesNode,
  'Middle Page': middlePageNode,
  Paused: pausedNode,
};

export const States: Story = {
  args: { state: 'Default' },
  argTypes: { state: { control: 'select', options: Object.keys(STATES), mapping: STATES } },
  render: ({ state }) => <div key={String(state)}>{state}</div>,
};
