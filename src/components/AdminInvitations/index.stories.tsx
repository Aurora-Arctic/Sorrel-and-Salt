import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { CreateAdminInvitationDocument, RevokeAdminInvitationDocument } from '@/gql/graphql';
import { answerMutation, refusal, useMockHandlers } from '../../../.storybook/mock-api';
import { ADMIN_CHANGES_PAUSED_REFUSAL } from '../../lib/primary-admin';
import { press, pressLast, setInputValue, submitForm, useSteps } from '../../../.storybook/press';
import { AdminTabbedFrame } from '../../../.storybook/admin-frame';
import { INVITATIONS } from '../../../.storybook/fixtures';
import { WorkshopNavigation } from '../../../.storybook/navigation';
import AdminInvitations, { InviteAdmin } from '.';
import { invitationsHref } from './href';
import type { AdminInvitationEntry, AdminInvitationsFilter, AdminInvitationsProps } from './types';

// Render-only; behaviour is asserted in tests/components/AdminInvitations.
// Invite and Revoke reach the network only when sent; the workshop's fake API
// (.storybook/mock-api.ts) answers them, refusing where a state shows that.
const meta = {
  title: 'Admin / Invitations',
} satisfies Meta;
export default meta;
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
// router reports (.storybook/navigation.ts). Open Again brings the form back.
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

// The last page: Previous is live, Next is not.
const lastPageNode = (
  <Frame
    invitations={PAGE_TWO.slice(0, 7)}
    previousHref={invitationsHref({}, { before: 'cursor-51' })}
    position={{ page: 3, pages: 3 }}
  />
);

// Revoke pressed, then confirmed, and refused.
const REVOKE_REFUSED = [
  answerMutation(RevokeAdminInvitationDocument, () =>
    refusal({ message: 'That invitation was already accepted.', code: 'CONFLICT' }),
  ),
];
const RevokeRefusedView = (): ReactElement => {
  useMockHandlers(REVOKE_REFUSED);
  useSteps(
    [() => press(`Revoke the invitation to ${INVITATIONS[0].email}`), () => pressLast('Revoke')],
    400,
  );
  return <Frame invitations={[INVITATIONS[0]]} />;
};
const revokeRefusedNode = <RevokeRefusedView />;

// An address typed and sent, and refused: the form's alert shows.
const SEND_REFUSED = [
  answerMutation(CreateAdminInvitationDocument, () =>
    refusal({ message: 'You cannot invite administrators right now.', code: 'FORBIDDEN' }),
  ),
];
const SEND_ADDRESS_REFUSED = [
  answerMutation(CreateAdminInvitationDocument, () =>
    refusal({
      message: 'Validation failed',
      code: 'VALIDATION',
      fieldErrors: [{ path: ['email'], message: 'That address already has an invitation.' }],
    }),
  ),
];
const SEND_ACCEPTED = [
  answerMutation(CreateAdminInvitationDocument, () => ({
    createAdminInvitation: { id: 'invitation-new' },
  })),
];

const SendView = ({
  answers,
  address,
}: {
  answers: typeof SEND_REFUSED;
  address: string;
}): ReactElement => {
  useMockHandlers(answers);
  useSteps(
    [
      () => {
        const input = document.querySelector<HTMLInputElement>('input[type="email"]');
        if (input) setInputValue(input, address);
      },
      () => submitForm('form.form'),
    ],
    400,
  );
  return <Frame invitations={INVITATIONS} inviting />;
};
const sendRefusedNode = <SendView answers={SEND_REFUSED} address="fern@fixture.test" />;
const sendAddressRefusedNode = (
  <SendView answers={SEND_ADDRESS_REFUSED} address="fern@fixture.test" />
);
const sendAcceptedNode = <SendView answers={SEND_ACCEPTED} address="fern@fixture.test" />;

const STATES: Record<string, ReactNode> = {
  Default: defaultNode,
  Empty: emptyNode,
  Filtered: filteredNode,
  'No Matches': noMatchesNode,
  'Middle Page': middlePageNode,
  Paused: pausedNode,
  'Last Page': lastPageNode,
  'Revoke Refused': revokeRefusedNode,
  'Invitation Sent': sendAcceptedNode,
  'Send Refused': sendRefusedNode,
  'Address Refused By The Server': sendAddressRefusedNode,
};

export const States: Story = {
  args: { state: 'Default' },
  argTypes: { state: { control: 'select', options: Object.keys(STATES), mapping: STATES } },
  render: ({ state }) => <div key={String(state)}>{state}</div>,
};
