'use client';

import { usePendingNavigation } from '../../lib/navigation';
import { type ReactElement, useEffect, useRef, useState } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { GENERIC_FAILURE, readGraphqlFailure } from '../../lib/graphql-failure';
import BusyButton from '../BusyButton';
import { useClickFeedback } from '../ClickFeedback';
import Notice from '../Notice';
import PageHeader from '../PageHeader';
import type { InvitationAcceptanceProps } from './types';
import './index.scss';

// `/invite/[token]` and `/i/[token]` share this one panel: the page reads where the visitor stands and this shows it. Accept
// sends the mutation, which decides, and a refusal is shown in the service's words
// (claude-docs/components/invitation-acceptance.md).

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

/** What a site invitation grants, by the role it names. */
const SITE_GRANTS = {
  curator: "You've been invited to be a curator of Sorrel & Salt.",
  admin: "You've been invited to be an admin of Sorrel & Salt.",
} as const;

/** What a coven's invitation grants when the page has not the coven's own name. */
const WORKSPACE_GRANT = "You've been invited to join a coven on Sorrel & Salt.";

const SIGNED_OUT_GRANT =
  "You've been invited to Sorrel & Salt. Sign in with an account whose email address is the one this invitation was sent to.";

/** What a card grants, and what a signed-out visitor holding one is told: no address, no batch. */
const CARD_GRANT = "You've been given a card to join Sorrel & Salt.";

const CARD_SIGNED_OUT_GRANT =
  "You've been given a card to join Sorrel & Salt. Sign in with any account, once its email address is verified.";

/** The sentence under the heading, or none for a refusal: its alert says all there is to say. */
function grantOf(props: InvitationAcceptanceProps): string | undefined {
  if (props.status === 'signed-out') return props.card ? CARD_SIGNED_OUT_GRANT : SIGNED_OUT_GRANT;
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

// Tells the server a signed-in account opened a link it refused, once per view. The service decides whether
// the open is worth a row; a failure is ignored, as the refusal on the page already says all there is to say.
const RecordRefusal = ({ token }: { token: string }): null => {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    graphqlRequest(RecordCardAttemptDocument, { token }).catch(() => undefined);
  }, [token]);
  return null;
};

const InvitationAcceptance = (props: InvitationAcceptanceProps): ReactElement => {
  const grant = grantOf(props);
  return (
    <div className="panel invitation-acceptance">
      <PageHeader title="Your Invitation" lede={grant} />
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
          {props.token && <RecordRefusal token={props.token} />}
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
