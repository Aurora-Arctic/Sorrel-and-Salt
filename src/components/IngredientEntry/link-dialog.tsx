'use client';

import type { ReactElement } from 'react';
import { RouteModal } from '../Modal';
import { useRouteModalOpener } from '../Modal/route-modal-provider';
import LinkForm from './link-form';
import { LINK_HEADING_TITLE, linkHeading } from './link-heading';
import type { LinkDialogProps } from './types';

// Link to the Compendium as a dialog of its own (M8.17), opened from the
// address's `?link`: over the coven's Ingredients list (`?link=<id>`) and on
// the own entry's page (a bare `?link`), from the edit dialog's More, which
// it replaces, the entry page's Edit menu and the list card's More. It shows
// while the address asks for it (`opened`), or at once while a press loads
// it, the shared skeleton under its own title. Closing goes to `closeHref`;
// a success leaves for the first pick's page (`link-form.tsx`).

export default function LinkDialog({
  closeHref,
  returnTo,
  opened,
}: LinkDialogProps): ReactElement | null {
  const loading = useRouteModalOpener()?.loading;
  if (!opened && loading?.title !== LINK_HEADING_TITLE) return null;
  return (
    <RouteModal
      closeHref={closeHref}
      returnTo={returnTo}
      content={
        opened && {
          heading: linkHeading(opened.name),
          body: (done) => (
            <LinkForm
              key={opened.localId}
              workspaceId={opened.workspaceId}
              localId={opened.localId}
              ingredientsHref={opened.ingredientsHref}
              holdings={opened.holdings}
              onCancel={done}
            />
          ),
        }
      }
    />
  );
}
