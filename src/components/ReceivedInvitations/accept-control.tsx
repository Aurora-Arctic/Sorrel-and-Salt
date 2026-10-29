'use client';

import { usePendingNavigation } from '../../lib/navigation';
import type { Route } from 'next';
import { type ReactElement, useState } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { readGraphqlFailure } from '../../lib/graphql-failure';
import BusyButton from '../BusyButton';
import { useClickFeedback } from '../ClickFeedback';
import type { AcceptControlProps } from './types';

// A received invitation's Accept on the account page. It sends `acceptInvitationById`, which
// checks that the invitation is addressed to this verified account and decides; the landing
// is the coven itself, which says the success, or the refusal is said in a callout under the
// button, floating, so a phone card does not wrap round it. It is the by-id twin of
// InvitationAcceptance's link accept (claude-docs/components/received-invitations.md).

const AcceptInvitationByIdDocument = graphql(`
  mutation AcceptInvitationById($id: ID!) {
    acceptInvitationById(id: $id) {
      id
      acceptedAt
    }
  }
`);

const AcceptControl = ({
  invitation: { id, covenName, covenSlug },
}: AcceptControlProps): ReactElement => {
  const { navigate, refresh } = usePendingNavigation();
  const [sending, setSending] = useState(false);
  const feedback = useClickFeedback({ name: `Accept the invitation to ${covenName}` });

  async function accept() {
    // aria-disabled rather than disabled while sending, so the focus stays on
    // the button and the callout of a refusal is read from it; a second press
    // meanwhile sends nothing.
    if (sending) return;
    setSending(true);
    feedback.report(undefined);
    try {
      await graphqlRequest(AcceptInvitationByIdDocument, { id });
      // Busy until the coven replaces this page. A cast: the built routes
      // know `/coven/[slug]`, not this literal. The refresh redraws the shell
      // too, whose layout a navigation keeps, so the menu's count drops.
      navigate(`/coven/${covenSlug}` as Route);
      refresh();
    } catch (error) {
      setSending(false);
      // No fields of its own, so the reader always answers with an alert.
      feedback.report(readGraphqlFailure(error).alert);
    }
  }

  return (
    <>
      <BusyButton
        ref={feedback.anchorRef}
        className="btn btn--small btn--solid"
        aria-label={`Accept the invitation to ${covenName}`}
        aria-disabled={sending || undefined}
        busy={sending}
        busyLabel="Accepting"
        onClick={() => void accept()}
      >
        Accept
      </BusyButton>
      {/* oxlint-disable-next-line react/refs -- the callback ref and handlers come from a hook and are only handed to the DOM, never read while rendering */}
      {feedback.feedback}
    </>
  );
};

export default AcceptControl;
