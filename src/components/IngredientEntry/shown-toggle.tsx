'use client';

import { type ReactElement, useState } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { readGraphqlFailure } from '../../lib/graphql-failure';
import { usePendingNavigation } from '../../lib/navigation';
import { useAnnounce } from '../ClickFeedback/status-region';
import Notice from '../Notice';
import type { ShownToggleProps } from './types';

// The curator's Hide and Show on a compendium entry: one button that says what pressing it does, on
// each admin list row and in the entry's details. The service is the guard; this is only the control.

export const SetCompendiumEntryShownDocument = graphql(`
  mutation SetCompendiumEntryShown($id: ID!, $shown: Boolean!) {
    setCompendiumEntryShown(id: $id, shown: $shown) {
      id
    }
  }
`);

export default function ShownToggle({ ingredientId, shown, name }: ShownToggleProps): ReactElement {
  const { refresh, pending } = usePendingNavigation();
  const announce = useAnnounce();
  const [busy, setBusy] = useState(false);
  const [refusal, setRefusal] = useState<string>();

  async function change() {
    if (busy) return;
    setBusy(true);
    setRefusal(undefined);
    try {
      await graphqlRequest(SetCompendiumEntryShownDocument, { id: ingredientId, shown: !shown });
      announce(shown ? 'Hidden from the public compendium.' : 'Shown in the public compendium.');
      refresh();
    } catch (error) {
      setRefusal(readGraphqlFailure(error).alert);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="btn btn--quiet btn--small"
        aria-label={`${shown ? 'Hide' : 'Show'} ${name}`}
        aria-busy={busy || pending}
        onClick={() => void change()}
      >
        {shown ? 'Hide' : 'Show'}
      </button>
      {refusal && <Notice kind="error">{refusal}</Notice>}
    </>
  );
}
