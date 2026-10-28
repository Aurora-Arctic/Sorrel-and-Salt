'use client';

import type { Route } from 'next';
import { useSearchParams } from 'next/navigation';
import { type ReactElement, useState } from 'react';
import { NEW, opensNewSpell } from '../AppShell/add-href';
import { usePendingNavigation } from '../../lib/navigation';
import { RouteModal } from '../Modal';
import type { ModalHeading } from '../Modal/types';
import { UNTITLED_SPELL } from '../SpellCard';
import SpellBuilder from '.';
import type { SpellDialogProps } from './types';

// The spell builder as a modal over the grimoire (M10.12), the owner's call on
// 2026-10-27, in step with Add Ingredient: New Spell opens it under `?new=spell-<slug>`
// (or `?new=spell`, the current grimoire's; the owner's call, 2026-10-28),
// and a spell's Edit under `?edit=<id>` (claude-docs/design-decisions/
// m10.12-spell-builder-modal.md). A draft's first save replaces `?new`
// with its own `?edit=<id>`, so a reload or Back opens the saved draft, never an
// empty form. The builder reports that save through `onCreated`, whichever
// way it was made, so M13.17's autosave moves the address the same way.
// Close saves first (./save-on-close.ts). A client part because the
// builder's handlers are functions, which a server page cannot hand down.
// New Spell's press writes `?new=spell-<slug>` with the browser's pushState (AddAction's
// `drawnHere`), so the dialog reads the address itself and draws the empty builder at
// once, at its full size, as Add Ingredient does: a skeleton the server's form replaced
// grew the centred dialog and moved it under the pointer. Any other `?new` is Add
// Ingredient's, and holds a saved spell's dialog back until it closes.

/**
 * `closeHref` with a saved spell's dialog open over it, `?edit=<id>`. Built here rather than
 * handed down, since a server page cannot hand a client part a function.
 */
const withEdit = (closeHref: Route, id: string) =>
  `${closeHref}${closeHref.includes('?') ? '&' : '?'}${new URLSearchParams({ edit: id })}` as Route;

/** The dialog's head for a new spell, shown at once on New Spell's press. */
export const NEW_SPELL_HEADING: ModalHeading = { title: 'New Spell' };

export default function SpellDialog({
  workspaceId,
  covenSlug,
  closeHref,
  opened: read,
  canCreate,
}: SpellDialogProps): ReactElement | null {
  const { navigate } = usePendingNavigation();
  const adding = useSearchParams().get(NEW);
  const opened =
    adding === null ? read : opensNewSpell(adding, covenSlug) && canCreate ? {} : undefined;
  // The draft this dialog's first save created. Once the address names it,
  // the builder that created it stays, under the same key, rather than a
  // fresh one replacing it mid-edit.
  const [created, setCreated] = useState<string | null>(null);
  if (!opened && created !== null) setCreated(null);
  const spell = opened?.spell;
  const heading: ModalHeading = spell
    ? { eyebrow: 'Edit Spell', title: spell.title?.trim() || UNTITLED_SPELL }
    : NEW_SPELL_HEADING;
  return (
    <RouteModal
      closeHref={closeHref}
      size="wide"
      content={
        opened && {
          heading,
          body: () => (
            <SpellBuilder
              key={spell && spell.id !== created ? spell.id : 'new'}
              workspaceId={workspaceId}
              spell={spell}
              onCreated={({ id }) => {
                setCreated(id);
                // Replaced, so Back goes to the grimoire and not to an empty New Spell.
                navigate(withEdit(closeHref, id), { replace: true, scroll: false });
              }}
            />
          ),
        }
      }
    />
  );
}
