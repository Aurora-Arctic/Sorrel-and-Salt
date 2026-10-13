import type { Route } from 'next';
import type { Story } from '@ladle/react';
import InvitationAcceptance from '.';
import type { InvitationAcceptanceProps } from './types';

// Render-only; behaviour is asserted in tests/components/InvitationAcceptance.
// Accept talks to the network only on a click, so nothing is mocked: a click
// in the workshop fails into the alert, which is itself a state worth seeing.
export default {
  title: 'Pages / Invitation Acceptance',
};

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

export const SignedOut: Story = () => <Page status="signed-out" signInHref={SIGN_IN} />;

export const Acceptable: Story = () => (
  <Page status="acceptable" token="workshop" tier="site" landing="/admin" />
);

export const AcceptableCoven: Story = () => (
  <Page
    status="acceptable"
    token="workshop"
    tier="workspace"
    covenName="Fixture Coven"
    landing={COVEN_LANDING}
  />
);

export const Unverified: Story = () => (
  <Page status="refused" message={UNVERIFIED} emailHref={EMAIL_PAGE} />
);

export const Invalid: Story = () => <Page status="refused" message={INVALID} />;

export const Accepted: Story = () => <Page status="refused" message={ACCEPTED} />;

export const Revoked: Story = () => <Page status="refused" message={REVOKED} />;

export const Expired: Story = () => <Page status="refused" message={EXPIRED} />;

export const Declined: Story = () => <Page status="refused" message={DECLINED} />;

// A link into a deleted coven (MB.119 decision f): its own reason, `closed`.
export const DeletedCoven: Story = () => <Page status="refused" message={CLOSED} />;

export const DifferentAddress: Story = () => <Page status="refused" message={DIFFERENT_ADDRESS} />;

export const Paused: Story = () => <Page status="refused" message={PAUSED} />;

// Phone and both themes, for the states that differ in shape: the signed-out
// and acceptable ones (a sentence and a button), the unverified one (an alert
// and a button) and a refusal (an alert alone).
export const SignedOutPhoneDark: Story = () => <SignedOut />;
SignedOutPhoneDark.meta = { theme: 'dark', width: 375 };

export const SignedOutPhoneLight: Story = () => <SignedOut />;
SignedOutPhoneLight.meta = { theme: 'light', width: 375 };

export const AcceptableCovenPhoneDark: Story = () => <AcceptableCoven />;
AcceptableCovenPhoneDark.meta = { theme: 'dark', width: 375 };

export const AcceptableCovenPhoneLight: Story = () => <AcceptableCoven />;
AcceptableCovenPhoneLight.meta = { theme: 'light', width: 375 };

export const UnverifiedPhoneDark: Story = () => <Unverified />;
UnverifiedPhoneDark.meta = { theme: 'dark', width: 375 };

export const UnverifiedPhoneLight: Story = () => <Unverified />;
UnverifiedPhoneLight.meta = { theme: 'light', width: 375 };

export const DeletedCovenPhoneDark: Story = () => <DeletedCoven />;
DeletedCovenPhoneDark.meta = { theme: 'dark', width: 375 };

export const DeletedCovenPhoneLight: Story = () => <DeletedCoven />;
DeletedCovenPhoneLight.meta = { theme: 'light', width: 375 };
