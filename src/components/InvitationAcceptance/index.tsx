'use client';

import { usePendingNavigation } from '../../lib/navigation';
import { type ReactElement, type ReactNode, useEffect, useRef, useState } from 'react';
import { graphql } from '@/lib/graphql-document';
import { graphqlRequest } from '../../lib/graphql-client';
import { GENERIC_FAILURE, readGraphqlFailure } from '../../lib/graphql-failure';
import BusyButton from '../BusyButton';
import { useClickFeedback } from '../ClickFeedback';
import Notice from '../Notice';
import PageHeader from '../PageHeader';
import SignInDialog from '../SignInDialog';
import type { InvitationAcceptanceProps } from './types';
import type { PageHeaderProps } from '../PageHeader/types';
import './index.scss';

// `/invite/[token]` and `/i/[token]` share this panel: the page reads where the visitor stands, Accept sends the mutation, and
// a refusal shows in the service's words (claude-docs/components/invitation-acceptance.md).

const AcceptInvitationDocument = graphql(`
  mutation AcceptInvitation($token: String!) {
    acceptInvitation(token: $token) {
      id
    }
  }
`);

const RecordCardAttemptDocument = graphql(`
  mutation RecordCardAttempt($token: String!) {
    recordCardAttempt(token: $token)
  }
`);

const SITE_GRANTS = {
  curator: "You've been invited to be a curator of Sorrel & Salt.",
  admin: "You've been invited to be a keeper of Sorrel & Salt.",
} as const;

const WORKSPACE_GRANT = "You've been invited to join a coven on Sorrel & Salt.";

const SIGNED_OUT_GRANT =
  "You've been invited to Sorrel & Salt. Create an account or sign in. Its email address must be the one this invitation was sent to.";

/** Under the dialog's title, for an invitation sent to one address; a card takes any account. */
const ADDRESS_LEDES = {
  'sign-in': 'Use the account whose email address this invitation was sent to.',
  'sign-up': 'Use the email address this invitation was sent to.',
};

const CARD_GRANT = "You've been given a card to join Sorrel & Salt.";

const CARD_SIGNED_OUT_GRANT =
  "You've been given a card to join Sorrel & Salt. Create an account or sign in with any you have. You can accept once its email address is verified.";

/** What the heading says over a refusal. */
const REFUSED_GRANT = "This invitation can't be used, and the reason is below.";

/** The sentence under the heading; a refusal says why in its alert below, and here only that it was refused. */
function grantOf(props: InvitationAcceptanceProps): ReactNode {
  if (props.status === 'unverified')
    return (
      <>
        Your account is made. Check your inbox: we&apos;ve sent a message to{' '}
        <strong>{props.email}</strong>. The link in it confirms your address and brings you back
        here to accept this invitation.
      </>
    );
  if (props.status === 'signed-out') return props.card ? CARD_SIGNED_OUT_GRANT : SIGNED_OUT_GRANT;
  if (props.status === 'refused') return REFUSED_GRANT;
  if (props.status !== 'acceptable') return undefined;
  if (props.tier === 'card') return CARD_GRANT;
  if (props.tier === 'site') return SITE_GRANTS[props.siteRole];
  return props.covenName
    ? `You've been invited to join ${props.covenName} on Sorrel & Salt.`
    : WORKSPACE_GRANT;
}

const Accept = ({
  token,
  landing,
}: Extract<InvitationAcceptanceProps, { status: 'acceptable' }>): ReactElement => {
  const { navigate } = usePendingNavigation();
  const [sending, setSending] = useState(false);
  const { anchorRef, report, feedback } = useClickFeedback({ name: 'Accept Invitation' });

  async function accept() {
    if (sending) return;
    setSending(true);
    report(undefined);
    try {
      await graphqlRequest(AcceptInvitationDocument, { token });
      // A success is the landing itself, so nothing is announced.
      navigate(landing);
    } catch (error) {
      setSending(false);
      // The fallback only satisfies the type: the reader always answers with an alert.
      report(readGraphqlFailure(error).alert ?? GENERIC_FAILURE);
    }
  }

  // A `div`, not the other states' `p`: the callout is a `div`, and a `div` in a `p` is
  // invalid HTML.
  return (
    <div className="invitation-acceptance__actions">
      {/* `aria-disabled` rather than `disabled` while it sends: a disabled
          button drops the focus, which a refusal must find still on Accept. */}
      <BusyButton
        ref={anchorRef}
        className="btn btn--solid"
        aria-disabled={sending || undefined}
        busy={sending}
        busyLabel="Accepting Invitation"
        onClick={() => void accept()}
      >
        Accept Invitation
      </BusyButton>
      {feedback}
    </div>
  );
};

// A failure is ignored: the refusal on the page already says all there is to say.
const RecordRefusal = ({ token }: { token: string }): null => {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    graphqlRequest(RecordCardAttemptDocument, { token }).catch(() => undefined);
  }, [token]);
  return null;
};

const InvitationAcceptance = ({
  headingLevel,
  ...props
}: InvitationAcceptanceProps & { headingLevel?: PageHeaderProps['level'] }): ReactElement => {
  const grant = grantOf(props);
  return (
    <div className="panel invitation-acceptance">
      <PageHeader
        className="card-page-header"
        headingClassName="auth-title"
        title="Your Invitation"
        lede={grant}
        level={headingLevel}
      />
      {props.status === 'signed-out' && (
        // A `div`: each choice draws its dialog beside it, and a dialog in a `p` is invalid HTML.
        <div className="invitation-acceptance__actions invitation-acceptance__choices">
          {(['sign-up', 'sign-in'] as const).map((mode) => (
            <SignInDialog
              key={mode}
              next={props.next}
              configured={props.configured}
              label={mode === 'sign-up' ? 'Create Account' : 'Sign In'}
              className="btn btn--solid"
              mode={mode}
              ledes={props.card ? undefined : ADDRESS_LEDES}
              signUpLandsOnNext
            />
          ))}
        </div>
      )}
      {props.status === 'unverified' && (
        <p className="invitation-acceptance__actions invitation-acceptance__row">
          <a className="btn btn--quiet" href={props.emailHref}>
            Confirm Your Email
          </a>
          <a className="btn btn--quiet" href="/">
            Back to Home
          </a>
        </p>
      )}
      {props.status === 'refused' && (
        <>
          <Notice kind="error">{props.message}</Notice>
          {props.token && <RecordRefusal token={props.token} />}
          {props.startCovenHref && (
            <p className="invitation-acceptance__actions">
              <a className="btn btn--solid" href={props.startCovenHref}>
                Start a Coven
              </a>
            </p>
          )}
          <p className="invitation-acceptance__actions">
            <a className="btn btn--quiet" href="/">
              Back to Home
            </a>
          </p>
          {props.emailHref && (
            <p className="invitation-acceptance__actions">
              <a className="btn btn--solid" href={props.emailHref}>
                Confirm Your Email
              </a>
            </p>
          )}
        </>
      )}
      {props.status === 'acceptable' && <Accept {...props} />}
    </div>
  );
};

export default InvitationAcceptance;
