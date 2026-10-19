'use client';

import type { ReactElement } from 'react';
import CupboardEntryForm from '../CupboardEntryForm';
import { RouteModal } from '../Modal';
import { useRouteModalOpener } from '../Modal/route-modal-provider';
import { ANNOTATE_HEADING } from './annotate-heading';
import type { AnnotateDialogProps } from './types';

// The coven's Annotate dialog (M12.17), opened from the address's `?annotate`: on the
// compendium entry's own page, and over the coven's Ingredients list (M8.17). It shows
// while the address asks for it (`opened`), or at once while an Annotate press is loading
// it, with the skeleton under Annotate's heading; Edit's press loads its own. Closing goes
// to `closeHref`, and the focus goes back the way RouteModal gives it.

export default function AnnotateDialog({
  closeHref,
  returnTo,
  opened,
}: AnnotateDialogProps): ReactElement | null {
  const loading = useRouteModalOpener()?.loading;
  if (!opened && loading?.title !== ANNOTATE_HEADING.title) return null;
  return (
    <RouteModal
      closeHref={closeHref}
      returnTo={returnTo}
      content={
        opened && {
          heading: ANNOTATE_HEADING,
          body: (done) => <CupboardEntryForm {...opened} onDone={done} />,
        }
      }
    />
  );
}
