import type { Route } from 'next';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import { AcceptInvitationDocument } from '@/gql/graphql';
import { answerMutation, refusal } from '../../../.storybook/mock-api';
import { usePressOnMount } from '../../../.storybook/press';
import InvitationAcceptance from '.';
import type { InvitationAcceptanceProps } from './types';

// Render-only; behaviour is asserted in tests/components/InvitationAcceptance.
// Accept talks to the network only on a click; the one story that presses it
// has the fake API refuse, into the callout under Accept (ClickFeedback).
const meta = {
  title: 'Pages / Invitation Acceptance',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: import('react').ReactNode }>;

// Inside the page's own frame, so the workshop shows what the page shows.
const Page = (props: InvitationAcceptanceProps) => (
  <main className="page-frame page-frame--narrow">
    <InvitationAcceptance {...props} />
  </main>
);

const SIGN_IN = '/sign-in?next=%2Finvite%2Fworkshop';
const EMAIL_PAGE = '/account/email?next=%2Finvite%2Fworkshop';
const COVEN_LANDING = '/coven/fixture-coven' as Route;

// The service's own sentences (MESSAGES in modules/identity/services/invitation-acceptance.ts),
// copied because a story cannot import a server-only module.
const INVALID =
  "This invitation link isn't valid. Check that you opened the whole link from the email.";
const ACCEPTED = 'This invitation has already been accepted.';
const REVOKED = 'This invitation was withdrawn. Ask whoever sent it for a new one.';
const EXPIRED = 'This invitation has expired. Ask whoever sent it for a new one.';
const DECLINED =
  'This invitation was declined. If you change your mind, ask whoever sent it for a new one.';
const CLOSED = "The coven this invitation was for has been deleted, so it can't be accepted.";
const DIFFERENT_ADDRESS =
  'This invitation was sent to a different email address. Sign in with the account that uses that address.';
const UNVERIFIED =
  "Your email address isn't confirmed yet. Confirm it, then open this link again to accept.";
const PAUSED =
  "Admin changes are paused, so this invitation can't be accepted until they are resumed.";

const SignedOutView = () => <Page status="signed-out" signInHref={SIGN_IN} />;

export const SignedOut: Story = { render: SignedOutView };

const AcceptableView = () => (
  <Page status="acceptable" token="workshop" tier="site" siteRole="admin" landing="/admin" />
);

const defaultNode = <AcceptableView />;

const acceptableCuratorNode = (
  <Page status="acceptable" token="workshop" tier="site" siteRole="curator" landing="/admin" />
);

// Accept pressed and refused: the fake API answers with the service's own
// sentence, in the callout with the badge on Accept's corner.
const AcceptRefusedView = () => {
  usePressOnMount('Accept Invitation');
  return <AcceptableView />;
};

export const AcceptRefused: Story = {
  beforeEach: ({ msw }) =>
    msw.use(
      answerMutation(AcceptInvitationDocument, () =>
        refusal({ message: 'This invitation has already been accepted.', code: 'FORBIDDEN' }),
      ),
    ),
  render: AcceptRefusedView,
};

const AcceptableCovenView = () => (
  <Page
    status="acceptable"
    token="workshop"
    tier="workspace"
    covenName="Fixture Coven"
    landing={COVEN_LANDING}
  />
);

const acceptableCovenNode = <AcceptableCovenView />;

const UnverifiedView = () => <Page status="refused" message={UNVERIFIED} emailHref={EMAIL_PAGE} />;

const unverifiedNode = <UnverifiedView />;

const invalidNode = <Page status="refused" message={INVALID} />;

const acceptedNode = <Page status="refused" message={ACCEPTED} />;

const revokedNode = <Page status="refused" message={REVOKED} />;

const expiredNode = <Page status="refused" message={EXPIRED} />;

const declinedNode = <Page status="refused" message={DECLINED} />;

// A link into a deleted coven (MB.119 decision f): its own reason, `closed`.
const DeletedCovenView = () => <Page status="refused" message={CLOSED} />;

const deletedCovenNode = <DeletedCovenView />;

const differentAddressNode = <Page status="refused" message={DIFFERENT_ADDRESS} />;

const pausedNode = <Page status="refused" message={PAUSED} />;

const STATES_STATES: Record<string, ReactNode> = {
  'Signed Out': <SignedOutView />,
  Default: defaultNode,
  'Acceptable Curator': acceptableCuratorNode,
  'Acceptable Coven': acceptableCovenNode,
  Unverified: unverifiedNode,
  Invalid: invalidNode,
  Accepted: acceptedNode,
  Revoked: revokedNode,
  Expired: expiredNode,
  Declined: declinedNode,
  'Deleted Coven': deletedCovenNode,
  'Different Address': differentAddressNode,
  Paused: pausedNode,
};

export const States: Story = {
  args: { state: 'Default' },
  argTypes: {
    state: { control: 'select', options: Object.keys(STATES_STATES), mapping: STATES_STATES },
  },
  render: ({ state }) => <div key={String(state)}>{state}</div>,
};
