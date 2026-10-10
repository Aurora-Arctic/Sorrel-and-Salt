'use client';

import { ClientError } from 'graphql-request';
import { useRouter } from 'next/navigation';
import { type ReactElement, useState } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import type { InvitationAcceptanceProps } from './types';
import './index.scss';

// `/invite/[token]`'s one panel (MB.70): the page reads where the visitor
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

const GENERIC_ERROR = "That didn't work. Please try again.";

/** What accepting grants, by tier; M7.5 adds the workspace's. */
const GRANTS = {
  site: 'You have been invited to become an admin of Sorrel & Salt.',
} as const;

function messageOf(error: unknown): string {
  if (!(error instanceof ClientError)) return GENERIC_ERROR;
  return error.response.errors?.[0]?.message || GENERIC_ERROR;
}

const Accept = ({
  token,
  tier,
  landing,
}: Extract<InvitationAcceptanceProps, { status: 'acceptable' }>): ReactElement => {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<string>();

  async function accept() {
    setSending(true);
    setFailure(undefined);
    try {
      await graphqlRequest(AcceptInvitationDocument, { token });
      // Busy until the landing replaces this page.
      router.push(landing);
    } catch (error) {
      setSending(false);
      setFailure(messageOf(error));
    }
  }

  return (
    <>
      <p className="invitation-acceptance__text">{GRANTS[tier]}</p>
      {failure && (
        <p className="notice notice--error" role="alert">
          {failure}
        </p>
      )}
      <p className="invitation-acceptance__actions">
        <button
          className="btn btn--solid"
          type="button"
          disabled={sending}
          aria-busy={sending || undefined}
          onClick={() => void accept()}
        >
          {sending && <span className="spinner" aria-hidden="true" />}
          {sending ? 'Accepting' : 'Accept Invitation'}
        </button>
      </p>
    </>
  );
};

const InvitationAcceptance = (props: InvitationAcceptanceProps): ReactElement => (
  <div className="invitation-acceptance">
    <h1 className="invitation-acceptance__heading">Your Invitation</h1>
    {props.status === 'signed-out' && (
      <>
        <p className="invitation-acceptance__text">
          Someone has invited you to Sorrel &amp; Salt. Sign in with an account that uses the email
          address the invitation was sent to.
        </p>
        <p className="invitation-acceptance__actions">
          <a className="btn btn--solid" href={props.signInHref}>
            Sign In
          </a>
        </p>
      </>
    )}
    {props.status === 'refused' && (
      <>
        <p className="notice notice--error">{props.message}</p>
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

export default InvitationAcceptance;
