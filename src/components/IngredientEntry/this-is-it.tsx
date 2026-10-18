'use client';

import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { type ReactElement, useState } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { readGraphqlIssues } from '../../lib/graphql-failure';
import BusyButton from '../BusyButton';
import Notice from '../Notice';

// This Is It, beside one entry of "Similar in the Compendium" (M12.22): it
// turns the coven's own entry into that compendium entry through M12.21's
// conversion, then goes to the compendium entry's page in the coven. The
// service is the guard and says why it refuses (a form the compendium lacks,
// a jar or a spell layer that would meet one of its own); the sentence shows
// beside the entry and nothing has moved. The page offers the button only to a
// role the conversion permits.

const ConvertLocalDocument = graphql(`
  mutation ConvertLocalToCompendiumEntry($workspaceId: ID!, $localId: ID!, $compendiumId: ID!) {
    convertLocalToCompendiumEntry(
      workspaceId: $workspaceId
      localId: $localId
      compendiumId: $compendiumId
    ) {
      entry {
        id
      }
    }
  }
`);

export default function ThisIsIt({
  workspaceId,
  localId,
  compendiumId,
  thenHref,
  name,
}: {
  workspaceId: string;
  localId: string;
  compendiumId: string;
  /** The compendium entry's page inside the coven, where success goes. */
  thenHref: Route;
  /** The entry's title, so each button has its own accessible name. */
  name: string;
}): ReactElement {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string>();

  async function convert() {
    setBusy(true);
    setFailure(undefined);
    try {
      await graphqlRequest(ConvertLocalDocument, { workspaceId, localId, compendiumId });
      // Busy until the page is left; the own entry no longer exists.
      router.push(thenHref);
    } catch (error) {
      setFailure(
        readGraphqlIssues(error)
          .map(({ message }) => message)
          .join(' '),
      );
      setBusy(false);
    }
  }

  return (
    <>
      <BusyButton
        className="btn btn--small"
        busy={busy}
        busyLabel="Converting"
        disabled={busy}
        aria-label={busy ? undefined : `This Is It: ${name}`}
        onClick={convert}
      >
        This Is It
      </BusyButton>
      {failure && <Notice kind="error">{failure}</Notice>}
    </>
  );
}
