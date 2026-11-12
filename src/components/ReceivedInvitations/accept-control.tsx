'use client';

import { usePendingNavigation } from '../../lib/navigation';
import type { ReactElement } from 'react';
import { graphql } from '@/lib/graphql-document';
import { graphqlRequest } from '../../lib/graphql-client';
import BusyButton from '../BusyButton';
import { useGuardedAction } from '../ClickFeedback/use-guarded-action';
import type { AcceptControlProps } from './types';
import { covenPath } from '@/lib/coven-path';

// A received invitation's Accept: it sends `acceptInvitationById`, which checks the address match
// and decides. The landing is the coven; a refusal shows in a floating callout so a phone card does
// not wrap round it (claude-docs/components/received-invitations.md).

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
  // aria-disabled rather than disabled while sending, so the focus stays on the button and the
  // callout of a refusal is read from it.
  const { anchorRef, run, pending, feedback } = useGuardedAction({
    name: `Accept the invitation to ${covenName}`,
    action: async () => {
      await graphqlRequest(AcceptInvitationByIdDocument, { id });
      // Busy until the coven replaces this page. A cast: the built routes
      // know `/coven/[slug]`, not this literal. The refresh redraws the shell
      // too, whose layout a navigation keeps, so the menu's count drops.
      navigate(covenPath(covenSlug));
      refresh();
    },
  });

  return (
    <>
      <BusyButton
        ref={anchorRef}
        className="btn btn--solid btn--small"
        aria-label={`Accept the invitation to ${covenName}`}
        aria-disabled={pending || undefined}
        busy={pending}
        busyAriaLabel={`Accepting the invitation to ${covenName}`}
        busyLabel="Accepting"
        onClick={() => void run()}
      >
        Accept
      </BusyButton>
      {feedback}
    </>
  );
};

export default AcceptControl;
