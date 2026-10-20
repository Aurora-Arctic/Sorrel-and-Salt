'use client';

import type { ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { PendingLink } from '../../lib/navigation';
import { ingredientLinkTarget } from '../AppShell/site-target';
import { EditLink } from '../IconTip';
import { RouteModal, useModalHeaderSlot } from '../Modal';
import { DETAILS_PLACE } from './details';
import type { IngredientDetailsDialogProps, IngredientDetailsOpened } from './types';

// The details modal an ingredient's name opens over a list (M12.5), in the
// list's details place, so an Edit pressed inside it opens the edit modal in
// the list's other place, over it. A client part because RouteModal takes its
// body as a function, which a server page cannot hand down; the summary
// arrives as the page's rendered children. Its Edit sits in the modal's
// header, where a modal's own controls go (claude-docs/components/modal.md,
// "A control in the header"), and Open Full Page in a bar at its foot.

/** The Edit pencil, in the header, or above the summary where the modal has no slot. */
function DetailsActions({ heading, editAction }: IngredientDetailsOpened): ReactElement | null {
  const slot = useModalHeaderSlot();
  // The cards' pencil with its tip, named for the entry (the owner's call,
  // 2026-10-20); a press opens the edit modal at once under its head (M9.18).
  const actions = editAction && <EditLink {...editAction} name={heading.title} />;
  return slot && actions ? createPortal(actions, slot) : actions || null;
}

/**
 * Open Full Page: a bar fixed to the foot of the modal while the body scrolls
 * under it (the owner's call, 2026-10-20), holding the one green button, full
 * width. Still a link, to the entry's page, with the loading standard's target.
 */
function OpenFullPageBar({ pageHref }: IngredientDetailsOpened): ReactElement {
  return (
    <div className="ingredient-details-foot">
      <PendingLink
        className="btn btn--solid btn--medium ingredient-details-foot__open"
        href={pageHref}
        navigationTarget={ingredientLinkTarget(pageHref)}
      >
        Open Full Page
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
          heading: opened.heading,
          body: () => (
            <>
              <DetailsActions {...opened} />
              {opened.children}
              <OpenFullPageBar {...opened} />
            </>
          ),
        }
      }
    />
  );
}
