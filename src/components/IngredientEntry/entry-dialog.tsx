'use client';

import { usePendingNavigation } from '../../lib/navigation';
import { useAnnounce } from '../ClickFeedback/status-region';
import type { Route } from 'next';
import type { ReactElement } from 'react';
import { editHeading } from '../CompendiumList/heading';
import { RouteModal } from '../Modal';
import { useRouteModalOpener } from '../Modal/route-modal-provider';
import { editEyebrow } from './edit-heading';
import { LazyCompendiumEntryForm, LazyIngredientForm } from './lazy-forms';
import { ANNOTATE_HEADING } from './annotate-heading';
import type { EditableEntry, IngredientEntryEdit } from './types';
import { compendiumEntryPath } from '@/lib/compendium-path';

// The edit modal over an entry's own page, shaped like `compendium-dialog.tsx`; a client part as the
// form's handlers are functions. Always rendered, so a press's skeleton and the form are one dialog
// (claude-docs/components/ingredient-entry.md, "The details modal").

export default function EntryDialog({
  entry,
  edit,
}: {
  /** The entry being edited; the list leaves it out until its address names one. */
  entry?: EditableEntry;
  edit: IngredientEntryEdit;
}): ReactElement | null {
  const { navigate, refresh } = usePendingNavigation();
  const announce = useAnnounce();
  const { opened, closeHref, deletedHref, savedHref, coven, review, sourcing } = edit;
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
              <LazyIngredientForm
                key={opened.id}
                workspaceId={coven.workspaceId}
                mayPromote={coven.mayPromote}
                entry={opened}
                // A save closes the dialog: back to the page, fetched again so it shows what was
                // saved.
                onSaved={() => {
                  navigate(savedHref ?? closeHref, { replace: true, scroll: false });
                  refresh();
                }}
                // An autosave keeps the dialog open: the page is fetched again so its heading shows the
                // saved name. The coven's address names the id and stays.
                onAutosaved={() => refresh()}
                // A delete is said in the page's status region, which outlives the dialog, and leaves
                // for `deletedHref`, fetched again; the focus goes to the page's heading (RouteModal).
                onDeleted={() => {
                  announce(`${entry.name} deleted`);
                  navigate(deletedHref, { replace: true, scroll: false });
                  refresh();
                }}
                duplicateHref={(match) => `${coven.ingredientsHref}/${match.id}`}
                entryHref={({ slug, isGlobal }) =>
                  isGlobal ? compendiumEntryPath(slug) : undefined
                }
              />
            ) : (
              <LazyCompendiumEntryForm
                key={opened.id}
                review={review}
                sourcing={sourcing}
                entry={opened}
                // An edit has Save Ingredient alone, so a save is always 'open': the modal stays. A
                // rename moves the public address, so the page follows it, `?edit` kept; the
                // coven's address names the id.
                onSaved={(saved) => {
                  navigate(savedHref ?? (`${compendiumEntryPath(saved.slug)}?edit` as Route), {
                    replace: true,
                    scroll: false,
                  });
                  refresh();
                }}
                onAutosaved={(saved) => {
                  if (!savedHref) {
                    navigate(`${compendiumEntryPath(saved.slug)}?edit` as Route, {
                      replace: true,
                      scroll: false,
                    });
                  }
                  refresh();
                }}
                // Not `done`, which would go back to this page: it is gone.
                onDeleted={() => navigate(deletedHref, { replace: true, scroll: false })}
                duplicateHref={({ slug }) => compendiumEntryPath(slug)}
                entryHref={({ slug }) => compendiumEntryPath(slug)}
              />
            ),
        }
      }
    />
  );
}
