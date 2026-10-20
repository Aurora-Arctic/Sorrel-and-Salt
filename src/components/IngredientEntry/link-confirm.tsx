'use client';

import { usePendingNavigation } from '../../lib/navigation';
import { ingredientLinkTarget } from '../AppShell/site-target';
import type { Route } from 'next';
import { type ReactElement, type ReactNode, useRef, useState } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { readGraphqlIssues } from '../../lib/graphql-failure';
import BusyButton from '../BusyButton';
import Modal, { ConfirmOverlay } from '../Modal';
import Notice from '../Notice';

// The confirmation Link to the Compendium asks before it turns a coven's own entry
// into a compendium entry through M12.21's conversion, written once for its
// two askers: the entry page's Similar block (M12.22) and the edit dialog's
// search (M8.17). The service is the guard and says why it refuses (a form the
// compendium lacks, a jar or a spell layer that would meet one of its own);
// the sentence shows in the confirmation and nothing has moved. A success goes to
// the compendium entry's page in the coven, busy until it is left, since the
// own entry no longer exists.
//
// On the page it is a dialog of its own. Inside the edit dialog it is a card
// over the form, as the form's own confirmations are (MB.115), rather than a
// second dialog stacked on the first, and it warns that the form's unsaved
// changes are lost, since the page they were typed over goes.

/**
 * Said, as a warning notice, in a confirmation shown over a form whose page goes
 * with the answer: Link to the Compendium's over the edit dialog, and Make It
 * Ours's over the Annotate dialog (M8.17; the owner's words, 2026-10-20).
 */
export const UNSAVED_CHANGES_LOST = 'Changes you have not saved are lost.';

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

/** The compendium entry a coven's own entry is to become: its title, and its page in the coven. */
export interface LinkTarget {
  id: string;
  title: string;
  thenHref: Route;
}

export default function LinkConfirm({
  workspaceId,
  localId,
  name,
  target,
  over,
  onClose,
}: {
  workspaceId: string;
  localId: string;
  /** The coven's own entry, as the page names it. */
  name: string;
  target: LinkTarget;
  /** Where it is asked: its own dialog over the page, or a card over the edit dialog's form. */
  over: 'page' | 'form';
  onClose: () => void;
}): ReactElement {
  const { navigate } = usePendingNavigation();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string>();
  const cancel = useRef<HTMLButtonElement>(null);

  async function convert() {
    setBusy(true);
    setFailure(undefined);
    try {
      await graphqlRequest(ConvertLocalDocument, { workspaceId, localId, compendiumId: target.id });
      // Busy until the page is left; the own entry no longer exists.
      navigate(target.thenHref, { target: ingredientLinkTarget(target.thenHref) });
    } catch (error) {
      setFailure(
        readGraphqlIssues(error)
          .map(({ message }) => message)
          .join(' '),
      );
      setBusy(false);
    }
  }

  const question: ReactNode = (
    <>
      Link <strong>{name}</strong> to <strong>{target.title}</strong>?
    </>
  );
  const body = (close: () => void) => (
    <>
      <p>Your jars and spells move to the compendium’s entry, and your own entry is removed.</p>
      {over === 'form' && (
        <Notice kind="warn" className="confirm-overlay__warning">
          {UNSAVED_CHANGES_LOST}
        </Notice>
      )}
      {failure && <Notice kind="error">{failure}</Notice>}
      <div className="modal__actions">
        <BusyButton
          className="btn btn--solid"
          busy={busy}
          busyLabel="Linking"
          disabled={busy}
          onClick={() => void convert()}
        >
          Link
        </BusyButton>
        <button
          ref={cancel}
          type="button"
          className="btn btn--quiet"
          disabled={busy}
          onClick={close}
        >
          Cancel
        </button>
      </div>
    </>
  );

  if (over === 'form') {
    return (
      <ConfirmOverlay question={question} safe={cancel}>
        {body(onClose)}
      </ConfirmOverlay>
    );
  }
  return (
    <Modal title="Link to the Compendium" onClose={onClose}>
      {(close) => (
        <>
          <p>{question}</p>
          {body(close)}
        </>
      )}
    </Modal>
  );
}
