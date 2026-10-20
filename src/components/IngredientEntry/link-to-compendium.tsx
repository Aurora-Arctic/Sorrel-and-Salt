'use client';

import { PendingLink } from '../../lib/navigation';
import { ingredientLinkTarget } from '../AppShell/site-target';
import type { Route } from 'next';
import { type ReactElement, type ReactNode, useState } from 'react';
import IconTip from '../IconTip';
import { LinkIconHint } from '../LinkHint';
import LinkConfirm from './link-confirm';

// The list of "Similar in the Compendium" (M12.22) for a role that may
// convert: a radio beside each entry's link, and one Link to Selected below
// them. The button asks in a dialog (`link-confirm.tsx`, shared with the
// edit dialog's More, M8.17), then turns the coven's own entry into the
// chosen compendium entry through M12.21's conversion and goes to that
// entry's page in the coven. The page
// passes this only to a role the conversion permits. It is a client file that
// draws the whole list, since a radio's state and the dialog need one.
//
// The entry's title is the radio's visible label, so pressing the name
// chooses it (the owner's call, 2026-10-19: people click the words expecting
// them to select). The way to the entry's page is a separate icon-only link
// at the row's right end, named "Open <title>", never inside it: a link inside a
// label would be pressed by every click on the label, and would add its own
// words to the radio's name.

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
  const [chosenId, setChosenId] = useState<string>();
  const [asking, setAsking] = useState(false);
  const chosen = entries.find(({ id }) => id === chosenId);

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
                <PendingLink href={href} navigationTarget={ingredientLinkTarget(href)}>
                  <LinkIconHint />
                  <span className="visually-hidden">Open {title}</span>
                </PendingLink>
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
          onClick={() => setAsking(true)}
        >
          Link to Selected
        </button>
      </p>
      {asking && chosen && (
        <LinkConfirm
          workspaceId={workspaceId}
          localId={localId}
          name={name}
          target={{ id: chosen.id, title: chosen.title, thenHref: chosen.thenHref }}
          over="page"
          onClose={() => setAsking(false)}
        />
      )}
    </>
  );
}
