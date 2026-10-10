import type { Story } from '@ladle/react';
import InvitationAcceptance from '.';
import type { InvitationAcceptanceProps } from './types';

// Render-only; behaviour is asserted in tests/components/InvitationAcceptance.
// Accept talks to the network only on a click, so nothing is mocked: a click
// in the workshop fails into the alert, which is itself a state worth seeing.
export default {
  title: 'Invitation / Acceptance',
};

// Inside the page's own frame, so the workshop shows what the page shows.
const Page = (props: InvitationAcceptanceProps) => (
  <main className="invitation-page">
    <InvitationAcceptance {...props} />
  </main>
);

export const SignedOut: Story = () => (
  <Page status="signed-out" signInHref="/sign-in?next=%2Finvite%2Fworkshop" />
);

export const Acceptable: Story = () => (
  <Page status="acceptable" token="workshop" tier="site" landing="/admin" />
);

export const Unverified: Story = () => (
  <Page
    status="refused"
    message="Confirm your email address, then come back to this link to accept the invitation."
    emailHref="/account/email?next=%2Finvite%2Fworkshop"
  />
);

export const Expired: Story = () => (
  <Page
    status="refused"
    message="This invitation has expired. Ask whoever sent it for a new one."
  />
);
