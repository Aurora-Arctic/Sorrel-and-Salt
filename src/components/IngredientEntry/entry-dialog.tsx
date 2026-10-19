'use client';

import { usePendingNavigation } from '../../lib/navigation';
import type { Route } from 'next';
import type { ReactElement } from 'react';
import { editHeading } from '../CompendiumList/heading';
import IngredientForm from '../IngredientForm';
import { RouteModal } from '../Modal';
import { useRouteModalOpener } from '../Modal/route-modal-provider';
import { EDIT_ENTRY_EYEBROW } from './edit-heading';
import { ANNOTATE_HEADING } from './annotate-heading';
import type { EditableEntry, IngredientEntryEdit } from './types';

// The compendium edit modal over an entry's own page (M8.19), the shape the
// admin compendium page's dialog takes (`compendium-dialog.tsx`) with the page
// the modal opened over being the entry's, not the list. A client part because
// the form's handlers are functions, which a server page cannot hand down.
// Rendered whether or not the address asks for the modal, so a press's
// skeleton and the form that replaces it are one dialog (M9.18).

/** A compendium entry's public page: also where a near match or a linked substitute is opened. */
const publicAddress = (slug: string): Route => `/compendium/ingredients/${slug}` as Route;

export default function EntryDialog({
  entry,
  edit,
}: {
  entry: EditableEntry;
  edit: IngredientEntryEdit;
}): ReactElement | null {
  const { navigate, refresh } = usePendingNavigation();
  const { opened, closeHref, deletedHref, savedHref } = edit;
  // Annotate's press shares this page's skeleton; that one belongs to it.
  const annotating = useRouteModalOpener()?.loading?.title === ANNOTATE_HEADING.title;
  if (annotating && !opened) return null;
  return (
    <RouteModal
      closeHref={closeHref}
      content={
        opened && {
          heading: editHeading(entry, EDIT_ENTRY_EYEBROW),
          body: (done) => (
            <IngredientForm
              // A fresh form per entry, inside the one modal.
              key={opened.id}
              workspaceId={null}
              mayPromote
              entry={opened}
              // An edit has Save Ingredient alone, so a save is always 'open':
              // the modal stays, the form keeping what it saved. A rename moves
              // the public address, so the page follows it, `?edit` kept; the
              // coven's address names the id, which a save leaves be.
              onSaved={(saved) => {
                navigate(savedHref ?? (`${publicAddress(saved.slug)}?edit` as Route), {
                  replace: true,
                });
                refresh();
              }}
              // Not `done`, which would go back to this page: it is gone.
              onDeleted={() => navigate(deletedHref, { replace: true })}
              onCancel={done}
              duplicateHref={({ slug }) => publicAddress(slug)}
              // A linked substitute's summary opens its entry in a new tab, every
              // substitute here being a compendium entry (MB.115).
              entryHref={({ slug }) => publicAddress(slug)}
            />
          ),
        }
      }
    />
  );
}
