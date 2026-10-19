'use client';

import { usePendingNavigation } from '../../lib/navigation';
import type { Route } from 'next';
import Link from 'next/link';
import { type ReactElement, type ReactNode, useState } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { readGraphqlIssues } from '../../lib/graphql-failure';
import BusyButton from '../BusyButton';
import IconTip, { LinkIcon } from '../IconTip';
import LinkHint from '../LinkHint';
import Modal from '../Modal';
import Notice from '../Notice';

// The list of "Similar in the Compendium" (M12.22) for a role that may
// convert: a radio beside each entry's link, and one Link to Selected below
// them. The button asks in a dialog, then turns the coven's own entry into
// the chosen compendium entry through M12.21's conversion and goes to that
// entry's page in the coven. The service is the guard and says why it refuses
// (a form the compendium lacks, a jar or a spell layer that would meet one of
// its own); the sentence shows in the dialog and nothing has moved. The page
// passes this only to a role the conversion permits. It is a client file that
// draws the whole list, since a radio's state and the dialog need one.
//
// The entry's title is the radio's visible label, so pressing the name
// chooses it (the owner's call, 2026-10-19: people click the words expecting
// them to select). The way to the entry's page is a separate icon-only link
// at the row's right end, named "Open <title>", never inside it: a link inside a
// label would be pressed by every click on the label, and would add its own
// words to the radio's name.

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

export default function LinkToCompendium({
  workspaceId,
  localId,
  name,
  entries,
  labelledBy,
  describedBy,
  seeAll,
}: {
  workspaceId: string;
  localId: string;
  /** The coven's own entry, as the page names it, for the question. */
  name: string;
  entries: { title: string; href: Route; id: string; thenHref: Route }[];
  /** The block's heading, which names the radio group and the list. */
  labelledBy: string;
  /** The block's ⓘ sentence, which describes the list. */
  describedBy?: string;
  /** The block's See All, drawn directly under the list and above Link to Selected (the owner's call, 2026-10-19: it belongs to the list). */
  seeAll?: ReactNode;
}): ReactElement {
  const { navigate } = usePendingNavigation();
  const [chosenId, setChosenId] = useState<string>();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string>();
  const chosen = entries.find(({ id }) => id === chosenId);

  async function convert(target: { id: string; thenHref: Route }) {
    setBusy(true);
    setFailure(undefined);
    try {
      await graphqlRequest(ConvertLocalDocument, { workspaceId, localId, compendiumId: target.id });
      // Busy until the page is left; the own entry no longer exists.
      navigate(target.thenHref);
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
      <div role="radiogroup" aria-labelledby={labelledBy}>
        <ul
          className="ingredient-entry__list ingredient-entry__replaced"
          aria-labelledby={labelledBy}
          aria-describedby={describedBy}
        >
          {entries.map(({ title, href, id }) => (
            <li key={href}>
              <label className="radio">
                <input
                  type="radio"
                  name={`${labelledBy}-choice`}
                  value={id}
                  checked={chosenId === id}
                  onChange={() => setChosenId(id)}
                />
                {title}
              </label>
              <IconTip tip="Open">
                <Link href={href}>
                  <LinkIcon />
                  <LinkHint />
                  <span className="visually-hidden">Open {title}</span>
                </Link>
              </IconTip>
            </li>
          ))}
        </ul>
      </div>
      {seeAll}
      <p className="ingredient-entry__link-action">
        <button
          type="button"
          className="btn btn--small"
          disabled={!chosen}
          onClick={() => {
            setFailure(undefined);
            setAsking(true);
          }}
        >
          Link to Selected
        </button>
      </p>
      {asking && chosen && (
        <Modal title="Link to the Compendium" onClose={() => setAsking(false)}>
          {(close) => (
            <>
              <p>
                Link <strong>{name}</strong> to <strong>{chosen.title}</strong>?
              </p>
              <p>
                Your jars and spells move to the compendium’s entry, and your own entry is removed.
              </p>
              {failure && <Notice kind="error">{failure}</Notice>}
              <div className="modal__actions">
                <BusyButton
                  className="btn btn--solid"
                  busy={busy}
                  busyLabel="Linking"
                  disabled={busy}
                  onClick={() => convert(chosen)}
                >
                  Link
                </BusyButton>
                <button type="button" className="btn btn--quiet" disabled={busy} onClick={close}>
                  Cancel
                </button>
              </div>
            </>
          )}
        </Modal>
      )}
    </>
  );
}
