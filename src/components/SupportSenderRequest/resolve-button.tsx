'use client';

import type { ReactElement } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import BusyButton from '../BusyButton';
import Notice from '../Notice';
import { useSupportAction } from '../SupportRequests/use-support-action';

const ResolveDocument = graphql(`
  mutation ResolveMySupportRequest($id: ID!) {
    resolveMySupportRequest(id: $id) {
      id
    }
  }
`);

const SupportSenderResolveButton = ({ requestId }: { requestId: string }): ReactElement => {
  const { busy, failure, run } = useSupportAction();
  return (
    <div className="support-detail__actions">
      {failure.alert && <Notice kind="error">{failure.alert}</Notice>}
      <BusyButton
        type="button"
        className="btn btn--quiet"
        busy={busy}
        busyLabel="Resolving"
        onClick={() =>
          void run(() => graphqlRequest(ResolveDocument, { id: requestId }), 'Request resolved.')
        }
      >
        Resolve
      </BusyButton>
    </div>
  );
};

export default SupportSenderResolveButton;
