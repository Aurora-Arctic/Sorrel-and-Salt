'use client';

import { usePendingNavigation } from '../../lib/navigation';
import { type ReactElement, useState } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { GENERIC_FAILURE, readGraphqlFailure } from '../../lib/graphql-failure';
import BusyButton from '../BusyButton';
import { useClickFeedback } from '../ClickFeedback';
import Notice from '../Notice';
import type { InvitationAcceptanceProps } from './types';
import './index.scss';

// `/invite/[token]`'s one panel: the page reads where the visitor stands and this shows it. Accept
// sends the mutation, which decides, and a refusal is shown in the service's words
// (claude-docs/components/invitation-acceptance.md).

const AcceptInvitationDocument = graphql(`
  mutation AcceptInvitation($token: String!) {
    acceptInvitation(token: $token) {
      id
    }
  }
`);

/** What a site invitation grants, by the role it names. */
const SITE_GRANTS = {
  curator: "You've been invited to be a curator of Sorrel & Salt.",
  admin: "You've been invited to be an admin of Sorrel & Salt.",
} as const;

/** What a coven's invitation grants when the page has not the coven's own name. */
const WORKSPACE_GRANT = "You've been invited to join a coven on Sorrel & Salt.";

const SIGNED_OUT_GRANT =
  "You've been invited to Sorrel & Salt. Sign in with an account whose email address is the one this invitation was sent to.";

/** The sentence under the heading, or none for a refusal: its alert says all there is to say. */
function grantOf(props: InvitationAcceptanceProps): string | undefined {
  if (props.status === 'signed-out') return SIGNED_OUT_GRANT;
  if (props.status !== 'acceptable') return undefined;
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
      // Busy until the landing replaces this page. A success is the landing
      // itself, so nothing is announced (the decision record's §5, rule 1).
      navigate(landing);
    } catch (error) {
      setSending(false);
      // No fields of its own, so the reader always answers with an alert;
      // the fallback only satisfies its type.
      report(readGraphqlFailure(error).alert ?? GENERIC_FAILURE);
    }
  }

  // A `div`, not the other states' `p`: the callout is a `div`.
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

const InvitationAcceptance = (props: InvitationAcceptanceProps): ReactElement => {
  const grant = grantOf(props);
  return (
    <div className="panel invitation-acceptance">
      <div className="header">
        <h1>Your Invitation</h1>
        {grant && <p className="lede">{grant}</p>}
      </div>
      {props.status === 'signed-out' && (
        <p className="invitation-acceptance__actions">
          <a className="btn btn--solid" href={props.signInHref}>
            Sign In
          </a>
        </p>
      )}
      {props.status === 'refused' && (
        <>
          <Notice kind="error">{props.message}</Notice>
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
