'use client';

import { usePendingNavigation } from '../../lib/navigation';
import type { Route } from 'next';
import { type ReactElement, useState } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { GENERIC_FAILURE, readGraphqlFailure } from '../../lib/graphql-failure';
import { useActionFailure } from '../ActionFailure';
import BusyButton from '../BusyButton';
import Notice from '../Notice';
import type { AcceptControlProps } from './types';

// A received invitation's Accept on the account page (M10.32). It sends
// `acceptInvitationById`, which checks that the invitation is addressed to
// this verified account and decides; the landing is the coven itself, or the
// refusal is said above the list when the page wraps it in an ActionFailure,
// and beside the button when it does not (MB.119). It is the by-id twin of
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
  const [failure, setFailure] = useState<string>();
  // Where the page says a refusal once, above the list, so a phone card does
  // not wrap it under the button; null outside one.
  const place = useActionFailure();

  async function accept() {
    setSending(true);
    setFailure(undefined);
    place?.report(undefined);
    try {
      await graphqlRequest(AcceptInvitationByIdDocument, { id });
      // Busy until the coven replaces this page. A cast: the built routes
      // know `/coven/[slug]`, not this literal. The refresh redraws the shell
      // too, whose layout a navigation keeps, so the menu's count drops.
      navigate(`/coven/${covenSlug}` as Route);
      refresh();
    } catch (error) {
      setSending(false);
      // No fields of its own, so the reader always answers with an alert;
      // the fallback only satisfies its type.
      const message = readGraphqlFailure(error).alert ?? GENERIC_FAILURE;
      if (place) place.report(message);
      else setFailure(message);
    }
  }

  return (
    <>
      {failure && <Notice kind="error">{failure}</Notice>}
      <BusyButton
        className="btn btn--small btn--solid"
        aria-label={`Accept the invitation to ${covenName}`}
        disabled={sending}
        busy={sending}
        busyLabel="Accepting"
        onClick={() => void accept()}
      >
        Accept
      </BusyButton>
    </>
  );
};

export default AcceptControl;
