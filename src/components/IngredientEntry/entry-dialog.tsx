'use client';

import { usePendingNavigation } from '../../lib/navigation';
import type { Route } from 'next';
import type { ReactElement } from 'react';
import { editHeading } from '../CompendiumList/heading';
import IngredientForm from '../IngredientForm';
import { RouteModal } from '../Modal';
import { useRouteModalOpener } from '../Modal/route-modal-provider';
import { editEyebrow } from './edit-heading';
import { ANNOTATE_HEADING } from './annotate-heading';
import type { EditableEntry, IngredientEntryEdit } from './types';

// The edit modal over an entry's own page, shaped like `compendium-dialog.tsx`; a client part as the
// form's handlers are functions. Always rendered, so a press's skeleton and the form are one dialog
// (claude-docs/components/ingredient-entry.md, "The entry dialog").

/** A compendium entry's public page: also where a near match or a linked substitute is opened. */
const publicAddress = (slug: string): Route => `/compendium/ingredients/${slug}` as Route;

export default function EntryDialog({
  entry,
  edit,
}: {
  /** The entry being edited; the list leaves it out until its address names one. */
  entry?: EditableEntry;
  edit: IngredientEntryEdit;
}): ReactElement | null {
  const { navigate, refresh } = usePendingNavigation();
  const { opened, closeHref, deletedHref, savedHref, coven, review } = edit;
  // Annotate's press shares this page's skeleton; that belongs to it.
  const loading = useRouteModalOpener()?.loading?.title;
  if (loading === ANNOTATE_HEADING.title && !opened) {
    return null;
  }
  return (
    <RouteModal
      closeHref={closeHref}
      content={
        opened &&
        entry && {
          heading: editHeading(entry, editEyebrow(edit)),
          body: () =>
            coven ? (
              <IngredientForm
                key={opened.id}
                workspaceId={coven.workspaceId}
                mayPromote={coven.mayPromote}
                entry={opened}
                // A save closes the dialog: back to the page, fetched again so it shows what was
                // saved.
                onSaved={() => {
                  navigate(savedHref ?? closeHref, { replace: true });
                  refresh();
                }}
                // A delete leaves for `deletedHref`, fetched again; the focus goes to the page's
                // heading, the opener having gone (RouteModal).
                onDeleted={() => {
                  navigate(deletedHref, { replace: true });
                  refresh();
                }}
                duplicateHref={(match) => `${coven.ingredientsHref}/${match.id}`}
                // Only a compendium entry has a page by its slug.
                entryHref={({ slug, isGlobal }) => (isGlobal ? publicAddress(slug) : undefined)}
              />
            ) : (
              <IngredientForm
                // A fresh form per entry, inside the one modal.
                key={opened.id}
                workspaceId={null}
                mayPromote
                review={review}
                entry={opened}
                // An edit has Save Ingredient alone, so a save is always 'open': the modal stays. A
                // rename moves the public address, so the page follows it, `?edit` kept; the
                // coven's address names the id.
                onSaved={(saved) => {
                  navigate(savedHref ?? (`${publicAddress(saved.slug)}?edit` as Route), {
                    replace: true,
                  });
                  refresh();
                }}
                // Not `done`, which would go back to this page: it is gone.
                onDeleted={() => navigate(deletedHref, { replace: true })}
                duplicateHref={({ slug }) => publicAddress(slug)}
                // A linked substitute's summary opens its entry in a new tab, every substitute here
                // being a compendium entry.
                entryHref={({ slug }) => publicAddress(slug)}
              />
            ),
        }
      }
    />
  );
}
