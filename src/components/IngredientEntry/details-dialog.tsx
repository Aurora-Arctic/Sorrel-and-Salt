'use client';

import Link from 'next/link';
import type { ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { RouteModal, useModalHeaderSlot, useOpenModalClick } from '../Modal';
import type { RouteModalLink } from '../Modal/types';
import { DETAILS_PLACE } from './details';
import type { IngredientDetailsDialogProps, IngredientDetailsOpened } from './types';

// The details modal an ingredient's name opens over a list (M12.5), in the
// list's details place, so an Edit pressed inside it opens the edit modal in
// the list's other place, over it. A client part because RouteModal takes its
// body as a function, which a server page cannot hand down; the summary
// arrives as the page's rendered children. Its links sit in the modal's
// header, where a modal's own controls go (claude-docs/components/modal.md,
// "A control in the header").

/** Edit, opening the edit modal at once under its head (M9.18). */
function EditLink({ href, heading }: RouteModalLink): ReactElement {
  const onClick = useOpenModalClick(href, heading);
  return (
    <Link className="btn btn--small btn--quiet" href={href} onClick={onClick}>
      Edit
    </Link>
  );
}

/** Open Full Page and Edit, in the header, or above the summary where the modal has no slot. */
function DetailsActions({ pageHref, editAction }: IngredientDetailsOpened): ReactElement {
  const slot = useModalHeaderSlot();
  const actions = (
    <>
      <Link className="btn btn--small btn--quiet" href={pageHref}>
        Open Full Page
      </Link>
      {editAction && <EditLink {...editAction} />}
    </>
  );
  return slot ? createPortal(actions, slot) : actions;
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
            </>
          ),
        }
      }
    />
  );
}
