'use client';

import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { type ReactElement, useState } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { GENERIC_FAILURE, readGraphqlFailure } from '../../lib/graphql-failure';
import BusyButton from '../BusyButton';
import Notice from '../Notice';
import type { AcceptControlProps } from './types';

// A received invitation's Accept on the /coven landing (M10.32). It sends
// `acceptInvitationById`, which checks that the invitation is addressed to
// this verified account and decides; the landing is the coven itself, or the
// refusal is said beside the button. It is the by-id twin of
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
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<string>();

  async function accept() {
    setSending(true);
    setFailure(undefined);
    try {
      await graphqlRequest(AcceptInvitationByIdDocument, { id });
      // Busy until the coven replaces this page. A cast: the built routes
      // know `/coven/[slug]`, not this literal.
      router.push(`/coven/${covenSlug}` as Route);
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
