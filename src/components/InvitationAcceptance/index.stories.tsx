import type { Route } from 'next';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { usePressOnMount } from '../../../.storybook/press';
import InvitationAcceptance from '.';
import type { InvitationAcceptanceProps } from './types';

// Render-only; behaviour is asserted in tests/components/InvitationAcceptance.
// Accept talks to the network only on a click, so nothing is mocked: the
// workshop has no server, so a click fails into the callout under Accept
// (ClickFeedback), which is itself a state worth seeing.
const meta = {
  title: 'Pages / Invitation Acceptance',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

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

export const Default: Story = { render: AcceptableView };

export const AcceptableCurator: Story = {
  render: () => (
    <Page status="acceptable" token="workshop" tier="site" siteRole="curator" landing="/admin" />
  ),
};

// Accept pressed and refused: the workshop's request finds no server, so the
// callout says the generic sentence, with the badge on Accept's corner.
const AcceptRefusedView = () => {
  usePressOnMount('Accept Invitation');
  return <AcceptableView />;
};

export const AcceptRefused: Story = { render: AcceptRefusedView };

const AcceptableCovenView = () => (
  <Page
    status="acceptable"
    token="workshop"
    tier="workspace"
    covenName="Fixture Coven"
    landing={COVEN_LANDING}
  />
);

export const AcceptableCoven: Story = { render: AcceptableCovenView };

const UnverifiedView = () => <Page status="refused" message={UNVERIFIED} emailHref={EMAIL_PAGE} />;

export const Unverified: Story = { render: UnverifiedView };

export const Invalid: Story = { render: () => <Page status="refused" message={INVALID} /> };

export const Accepted: Story = { render: () => <Page status="refused" message={ACCEPTED} /> };

export const Revoked: Story = { render: () => <Page status="refused" message={REVOKED} /> };

export const Expired: Story = { render: () => <Page status="refused" message={EXPIRED} /> };

export const Declined: Story = { render: () => <Page status="refused" message={DECLINED} /> };

// A link into a deleted coven (MB.119 decision f): its own reason, `closed`.
const DeletedCovenView = () => <Page status="refused" message={CLOSED} />;

export const DeletedCoven: Story = { render: DeletedCovenView };

export const DifferentAddress: Story = {
  render: () => <Page status="refused" message={DIFFERENT_ADDRESS} />,
};

export const Paused: Story = { render: () => <Page status="refused" message={PAUSED} /> };
