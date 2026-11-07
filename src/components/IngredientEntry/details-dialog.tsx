'use client';

import type { ReactElement } from 'react';
import { useLazyModule } from '../../lib/use-lazy-module';
import { RouteModal } from '../Modal';
import { DETAILS_PLACE } from './details';
import type { IngredientDetailsDialogProps } from './types';

// The details modal an ingredient's name opens over a list, so an Edit inside opens the edit modal over
// it. A client part since RouteModal takes its body as a function. Its head's marks and actions and
// its foot come from `details-parts`, loaded on first open, and the window shows its plain head over
// a loading body until they arrive (claude-docs/components/ingredient-entry.md, "The details modal").

const loadParts = () => import('./details-parts');

export default function DetailsDialog({
  closeHref,
  opened,
}: IngredientDetailsDialogProps): ReactElement | null {
  const parts = useLazyModule(loadParts, !!opened);
  const PageLinkBar = parts?.PageLinkBar;
  return (
    <RouteModal
      place={DETAILS_PLACE}
      closeHref={closeHref}
      readingBody
      content={
        opened && {
          heading: parts ? parts.headingOf(opened) : opened.heading,
          body: () => opened.children,
          foot: PageLinkBar && <PageLinkBar {...opened} />,
          loading: !parts,
        }
      }
    />
  );
}
