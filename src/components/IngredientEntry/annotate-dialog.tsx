'use client';

import type { ReactElement } from 'react';
import { RouteModal } from '../Modal';
import { useRouteModalOpener } from '../Modal/route-modal-provider';
import { LazyCupboardEntryForm } from './lazy-forms';
import AnnotateMore from './annotate-more';
import { ANNOTATE_HEADING } from './annotate-heading';
import type { AnnotateDialogProps } from './types';

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
            <LazyCupboardEntryForm
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
