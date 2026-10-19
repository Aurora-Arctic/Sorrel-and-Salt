'use client';

import { usePendingNavigation } from '../../lib/navigation';
import { type ReactElement, useState } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { GENERIC_FAILURE, readGraphqlFailure } from '../../lib/graphql-failure';
import BusyButton from '../BusyButton';
import Notice from '../Notice';
import type { InvitationAcceptanceProps } from './types';
import './index.scss';

// `/invite/[token]`'s one panel (MB.70, a `.panel` as sign-in's and the email
// page's are: MB.119 decision c): the page reads where the visitor
// stands, through the accept service's own checks, and this shows it. Accept
// sends the mutation, which checks again and decides; a refusal is said in
// the service's words (claude-docs/components/invitation-acceptance.md).

const AcceptInvitationDocument = graphql(`
  mutation AcceptInvitation($token: String!) {
    acceptInvitation(token: $token) {
      id
    }
  }
`);

/** What a site invitation grants, by the role it names (M11.20). */
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
  const [failure, setFailure] = useState<string>();

  async function accept() {
    setSending(true);
    setFailure(undefined);
    try {
      await graphqlRequest(AcceptInvitationDocument, { token });
      // Busy until the landing replaces this page.
      navigate(landing);
    } catch (error) {
      setSending(false);
      // No fields of its own, so the reader always answers with an alert;
      // the fallback only satisfies its type.
      setFailure(readGraphqlFailure(error).alert ?? GENERIC_FAILURE);
    }
  }

  return (
    <>
      {failure && <Notice kind="error">{failure}</Notice>}
      <p className="invitation-acceptance__actions">
        <BusyButton
          className="btn btn--solid"
          disabled={sending}
          busy={sending}
          busyLabel="Accepting Invitation"
          onClick={() => void accept()}
        >
          Accept Invitation
        </BusyButton>
      </p>
    </>
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
