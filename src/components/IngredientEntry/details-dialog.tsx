'use client';

import type { ReactElement } from 'react';
import { PendingLink } from '../../lib/navigation';
import { ingredientLinkTarget } from '../AppShell/site-target';
import { EditLink } from '../IconTip';
import EntryMarks from '../EntryMarks';
import { RouteModal } from '../Modal';
import type { ModalHeading } from '../Modal/types';
import { SafetyMark } from '../SafetyNote';
import { DETAILS_PLACE } from './details';
import type { IngredientDetailsDialogProps, IngredientDetailsOpened } from './types';

// The details modal an ingredient's name opens over a list (M12.5), in the
// list's details place, so an Edit pressed inside it opens the edit modal in
// the list's other place, over it. A client part because RouteModal takes its
// body as a function, which a server page cannot hand down; the summary
// arrives as the page's rendered children. Its safety badge and Edit pencil end the
// name's first line, through the modal's `titleBadge` and `titleActions` (claude-docs/components/modal.md,
// "A title with its own end"), and View Page is a bar at its foot.

/**
 * The head's badge and actions (the owner's calls, 2026-10-20). Beside the name, at the end of its
 * first line: the one safety badge, Toxic over Caution, and after it the Edit pencil, the
 * cards' with its tip, named for the entry, a press opening the edit modal at once under
 * its head (M9.18). Under the formal name: New or Updated and then the other badges. All
 * the entry page's and the card's own components, so the three cannot differ.
 */
function headingOf({ heading, marks, editAction }: IngredientDetailsOpened): ModalHeading {
  const safety = marks && (
    <SafetyMark toxic={marks.toxic} safetyNotes={marks.safetyNotes} variants={marks.variants} />
  );
  const edit = editAction && <EditLink {...editAction} name={heading.title} />;
  return {
    ...heading,
    ...(safety && { titleBadge: safety }),
    ...(edit && { titleActions: edit }),
    ...(marks && { under: <EntryMarks {...marks} safety={false} /> }),
  };
}

/**
 * View Page: a bar fixed to the foot of the modal while the body scrolls
 * under it (the owner's call, 2026-10-20), holding the one green button, the
 * site's normal `.btn` size, centred and two thirds of the bar. Still a link, to the entry's page,
 * with the loading standard's target.
 */
function ViewPageBar({ pageHref }: IngredientDetailsOpened): ReactElement {
  return (
    <div className="ingredient-details-foot">
      <PendingLink
        className="btn btn--solid"
        href={pageHref}
        navigationTarget={ingredientLinkTarget(pageHref)}
      >
        View Page
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
          body: () => (
            <>
              {opened.children}
              <ViewPageBar {...opened} />
            </>
          ),
        }
      }
    />
  );
}
