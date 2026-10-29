'use client';

import type { ReactElement } from 'react';
import CupboardEntryForm from '../CupboardEntryForm';
import { RouteModal } from '../Modal';
import { useRouteModalOpener } from '../Modal/route-modal-provider';
import AnnotateMore from './annotate-more';
import { ANNOTATE_HEADING } from './annotate-heading';
import type { AnnotateDialogProps } from './types';

// The coven's Annotate dialog, opened from the address's `?annotate` (on the entry page and over
// the Ingredients list). It shows while the address asks for it (`opened`) or while an Annotate
// press loads it; `more` adds Make It Ours and Remove at the form's foot.

export default function AnnotateDialog({
  closeHref,
  returnTo,
  opened,
  more,
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
          body: (done) => (
            <CupboardEntryForm
              {...opened}
              onDone={done}
              aside={
                more &&
                (({ onRefused, dirty, discardAsking }) => (
                  <AnnotateMore
                    {...more}
                    workspaceId={opened.workspaceId}
                    ingredientId={opened.ingredientId}
                    name={opened.overrides.label ?? opened.compendium.name}
                    closeHref={closeHref}
                    onRefused={onRefused}
                    dirty={dirty}
                    discardAsking={discardAsking}
                  />
                ))
              }
            />
          ),
        }
      }
    />
  );
}
