'use client';

import type { ReactElement } from 'react';
import { PendingLink } from '../../lib/navigation';
import { ingredientLinkTarget } from '../AppShell/site-target';
import { EditLink } from '../IconTip';
import OwnEntryActions from './own-actions';
import EntryMarks, { RecencyMark } from '../EntryMarks';
import { RouteModal } from '../Modal';
import type { ModalHeading } from '../Modal/types';
import { SafetyMark } from '../SafetyNote';
import PlusMark from './plus-mark';
import { DETAILS_PLACE } from './details';
import type { IngredientDetailsDialogProps, IngredientDetailsOpened } from './types';

// The details modal an ingredient's name opens over a list (M12.5), in the
// list's details place, so an Edit pressed inside it opens the edit modal in
// the list's other place, over it. A client part because RouteModal takes its
// body as a function, which a server page cannot hand down; the summary
// arrives as the page's rendered children. Its New or Updated marker and safety badge stand on
// the top line beside Close, through the modal's `topEnd`, its Edit pencil and plus end the
// formal name's line through `formalActions` (claude-docs/components/modal.md, "A title with its own
// end"), and the link to the entry's page is a bar at its foot.

/**
 * The head's marks and actions (the owner's calls, 2026-10-20). On the top line beside Close, as the
 * entry page's top bar has them: New or Updated, then the one safety badge, Toxic over Caution.
 * At the end of the formal name's line, over the name, as the entry page has them: the Edit pencil, the cards' with its tip,
 * named for the entry, a press opening the edit modal at once under its head (M9.18); left of
 * it the plus, or the check once every coven the viewer may add in holds the entry. Under the
 * formal name: the other badges. All the entry page's and the card's own components, so the
 * three cannot differ.
 */
function headingOf({
  heading,
  marks,
  editAction,
  ownActions,
  plus,
  ingredientId,
}: IngredientDetailsOpened): ModalHeading {
  // The top line's, beside Close, as the entry page's own top bar has them: New or Updated, then
  // the one safety badge. The line is there for every entry, empty or not, so Close has it to
  // itself and the head's other lines are clear of it.
  const top = (
    <>
      {marks && <RecencyMark recency={marks.recency} />}
      {marks && (
        <SafetyMark toxic={marks.toxic} safetyNotes={marks.safetyNotes} variants={marks.variants} />
      )}
    </>
  );
  // A coven's own entry has the page's Edit menu, Edit and Delete; any other Edit is a pencil.
  const edit = ownActions ? (
    <OwnEntryActions {...ownActions} />
  ) : (
    editAction && <EditLink {...editAction} name={heading.title} />
  );
  // The plus, or the check once every coven the viewer may add in holds the entry, stands left of
  // the pencil, the entry page's own pair (PlusMark; the owner's call, 2026-10-20).
  const add = plus && ingredientId && <PlusMark plus={plus} ingredientId={ingredientId} />;
  const actions = (add || edit) && (
    <>
      {add}
      {edit}
    </>
  );
  return {
    ...heading,
    topEnd: top,
    ...(actions && { formalActions: actions }),
    ...(marks && { under: <EntryMarks {...marks} safety={false} recency={null} /> }),
  };
}

/**
 * The link to the entry's page: a bar at the foot of the modal, in its `foot` slot outside the scrolling body
 * (the owner's calls, 2026-10-20), holding the one green button, the
 * site's normal `.btn` size, centred and two thirds of the bar. Still a link, to the entry's page,
 * with the loading standard's target.
 */
function PageLinkBar({ pageHref }: IngredientDetailsOpened): ReactElement {
  // Named by where it goes, not by who is looking (the owner's call, 2026-10-20): the
  // public compendium's page, or a coven's own page for an entry the coven holds, whether
  // it made the entry or annotated the compendium's.
  const label = pageHref.startsWith('/compendium/') ? 'See in Compendium' : 'See in My Ingredients';
  return (
    <div className="ingredient-details-foot">
      <PendingLink
        className="btn btn--solid"
        href={pageHref}
        navigationTarget={ingredientLinkTarget(pageHref)}
      >
        {label}
      </PendingLink>
    </div>
  );
}

export default function DetailsDialog({
  closeHref,
  opened,
}: IngredientDetailsDialogProps): ReactElement | null {
  return (
    <RouteModal
      place={DETAILS_PLACE}
      closeHref={closeHref}
      readingBody
      content={
        opened && {
          heading: headingOf(opened),
          body: () => opened.children,
          foot: <PageLinkBar {...opened} />,
        }
      }
    />
  );
}
