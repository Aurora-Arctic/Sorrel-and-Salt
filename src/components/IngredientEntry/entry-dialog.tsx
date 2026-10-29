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

// The compendium edit modal over an entry's own page (M8.19), the shape the
// admin compendium page's dialog takes (`compendium-dialog.tsx`) with the page
// the modal opened over being the entry's, not the list. A client part because
// the form's handlers are functions, which a server page cannot hand down.
// Rendered whether or not the address asks for the modal, so a press's
// skeleton and the form that replaces it are one dialog (M9.18).
//
// A coven's own entry (M8.17) takes the same dialog with the coven's form: a
// save closes it, back on the page fetched again; Delete leaves for
// `deletedHref` (M8.17); near matches open in the coven; and Delete is the
// form's own, apart at the foot. The coven's list renders the same dialog over
// its rows, with no entry until `?edit=<id>` names one.

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
          body: (done) =>
            coven ? (
              <IngredientForm
                key={opened.id}
                workspaceId={coven.workspaceId}
                mayPromote={coven.mayPromote}
                entry={opened}
                // A save closes the dialog: back to the page, fetched again
                // so it shows what was saved.
                onSaved={() => {
                  navigate(savedHref ?? closeHref, { replace: true });
                  refresh();
                }}
                // A delete (M8.17) leaves for `deletedHref`, fetched again: the
                // list without the row, or the coven's Ingredients from the
                // entry's page, which is gone. The focus goes back to the page's
                // heading, the opener having gone with the row (RouteModal).
                onDeleted={() => {
                  navigate(deletedHref, { replace: true });
                  refresh();
                }}
                onCancel={done}
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
