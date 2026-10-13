import type { Route } from 'next';
import type { Story } from '@ladle/react';
import type { ReactElement } from 'react';
import InvitationAcceptance from '.';
import Notice from '../Notice';
import type { InvitationAcceptanceProps } from './types';

// Render-only; behaviour is asserted in tests/components/InvitationAcceptance.
// Accept talks to the network only on a click, so nothing is mocked: a click
// in the workshop fails into the alert, which is itself a state worth seeing.
export default {
  title: 'Coven / Invitation Acceptance',
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

const UNVERIFIED =
  "Your email address isn't confirmed yet. Confirm it, then open this link again to accept.";
const EXPIRED = 'This invitation has expired. Ask whoever sent it for a new one.';
const DECLINED =
  'This invitation was declined. If you change your mind, ask whoever sent it for a new one.';
// What a link into a deleted coven says today: the service reuses its "invalid"
// reason, whose advice is to check the whole link was opened.
const DELETED_AS_BUILT =
  "This invitation link isn't valid. Check that you opened the whole link from the email.";
// Proposed (MB.119 decision f), not in the service: its own reason, `closed`.
const DELETED_PROPOSED =
  "The coven this invitation was for has been deleted, so it can't be accepted.";

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

export const Expired: Story = () => <Page status="refused" message={EXPIRED} />;

export const Declined: Story = () => <Page status="refused" message={DECLINED} />;

// A deleted coven's link, as it reads today and as it is proposed to read.
export const DeletedCovenAsBuilt: Story = () => (
  <Page status="refused" message={DELETED_AS_BUILT} />
);

export const DeletedCoven: Story = () => <Page status="refused" message={DELETED_PROPOSED} />;

// MB.119 proposals: the acceptance page bare on the page ground, as built, or
// on a `.panel` like sign-in, the email page, the landing and the create page
// (decision c). Each is a `.page-frame--narrow` page; the Bare ones draw the
// real component, the Panel ones a stand-in, since the component is not
// changed before sign-off. The stand-in's buttons do nothing.

/** The stand-in: the panel's root, a `.header` of the heading and the grant as a `.lede` (a refusal has none), then the rest. */
const PanelFrame = ({
  grant,
  children,
}: {
  grant?: string;
  children: ReactElement;
}): ReactElement => (
  <main className="page-frame page-frame--narrow">
    <div className="panel invitation-acceptance">
      <div className="header">
        <h1 className="invitation-acceptance__heading">Your Invitation</h1>
        {grant && <p className="lede">{grant}</p>}
      </div>
      {children}
    </div>
  </main>
);

export const ProposalBareSignedOut: Story = () => <SignedOut />;
export const ProposalBareAcceptable: Story = () => <AcceptableCoven />;
export const ProposalBareRefused: Story = () => <Unverified />;

export const ProposalPanelSignedOut: Story = () => (
  <PanelFrame grant="You've been invited to Sorrel & Salt. Sign in with an account whose email address is the one this invitation was sent to.">
    <p className="invitation-acceptance__actions">
      <a className="btn btn--solid" href={SIGN_IN}>
        Sign In
      </a>
    </p>
  </PanelFrame>
);

export const ProposalPanelAcceptable: Story = () => (
  <PanelFrame grant="You've been invited to join Fixture Coven on Sorrel & Salt.">
    <p className="invitation-acceptance__actions">
      <button type="button" className="btn btn--solid">
        Accept Invitation
      </button>
    </p>
  </PanelFrame>
);

export const ProposalPanelRefused: Story = () => (
  <PanelFrame>
    <>
      <Notice kind="error">{UNVERIFIED}</Notice>
      <p className="invitation-acceptance__actions">
        <a className="btn btn--solid" href={EMAIL_PAGE}>
          Confirm Your Email
        </a>
      </p>
    </>
  </PanelFrame>
);

// Phone and theme variants of the recommended panel, and of the bare page it
// replaces, for the owner's side-by-side.
export const ProposalBareRefusedPhoneDark: Story = () => <Unverified />;
ProposalBareRefusedPhoneDark.meta = { theme: 'dark', width: 375 };

export const ProposalBareRefusedPhoneLight: Story = () => <Unverified />;
ProposalBareRefusedPhoneLight.meta = { theme: 'light', width: 375 };

export const ProposalPanelAcceptablePhoneDark: Story = () => <ProposalPanelAcceptable />;
ProposalPanelAcceptablePhoneDark.meta = { theme: 'dark', width: 375 };

export const ProposalPanelAcceptablePhoneLight: Story = () => <ProposalPanelAcceptable />;
ProposalPanelAcceptablePhoneLight.meta = { theme: 'light', width: 375 };

export const ProposalPanelRefusedPhoneDark: Story = () => <ProposalPanelRefused />;
ProposalPanelRefusedPhoneDark.meta = { theme: 'dark', width: 375 };

export const ProposalPanelRefusedPhoneLight: Story = () => <ProposalPanelRefused />;
ProposalPanelRefusedPhoneLight.meta = { theme: 'light', width: 375 };

export const DeletedCovenPhoneDark: Story = () => <DeletedCoven />;
DeletedCovenPhoneDark.meta = { theme: 'dark', width: 375 };

export const DeletedCovenPhoneLight: Story = () => <DeletedCoven />;
DeletedCovenPhoneLight.meta = { theme: 'light', width: 375 };
