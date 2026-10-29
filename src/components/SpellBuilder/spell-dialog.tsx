'use client';

import { useQuery } from '@tanstack/react-query';
import type { Route } from 'next';
import { useSearchParams } from 'next/navigation';
import { type ReactElement, useState } from 'react';
import { NEW, opensNewSpell } from '../AppShell/add-href';
import { graphqlQuery } from '../../lib/graphql-client';
import { usePendingNavigation } from '../../lib/navigation';
import { RouteModal } from '../Modal';
import type { ModalHeading } from '../Modal/types';
import { UNTITLED_SPELL } from '../SpellCard';
import { copiedHrefOf } from '../SpellRecipe/copied-href';
import { deletedHrefOf } from '../SpellRecipe/deleted-href';
import SpellBuilder from '.';
import { SpellBuilderStepsDocument } from './steps/documents';
import type { SpellDialogProps } from './types';

// The spell builder as a modal over the grimoire: New Spell opens it under `?new=spell-<slug>`, a
// spell's Edit under `?edit=<id>`, and a draft's first save swaps `?new` for `?edit=<id>`. Close
// saves first (./save-on-close.ts). A client part because the builder's handlers are functions.
// (claude-docs/components/spell-builder.md, "The spell dialog and its address")

/**
 * `closeHref` with a saved spell's dialog open over it, `?edit=<id>`. Built here rather than
 * handed down, since a server page cannot hand a client part a function.
 */
const withEdit = (closeHref: Route, id: string) =>
  `${closeHref}${closeHref.includes('?') ? '&' : '?'}${new URLSearchParams({ edit: id })}` as Route;

/**
 * The dialog's head for a new spell, headed as Add Ingredient's is: the coven it
 * lands in over the title, and the dialog named by the phrase, "New Spell to Whitethorn Coven".
 */
export const newSpellHeading = (covenName: string): ModalHeading => ({
  title: 'New Spell',
  destination: covenName,
});

export default function SpellDialog({
  workspaceId,
  covenSlug,
  covenName,
  closeHref,
  opened: read,
  canCreate,
  canDelete = false,
  canDuplicate = false,
  userId,
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
  // The saved spell this dialog opened on, rather than the draft its builder created,
  // which holds its steps from its own save's answer.
  const editing = spell && spell.id !== created ? spell : undefined;
  const stepsRead = useQuery({
    ...graphqlQuery(SpellBuilderStepsDocument, { workspaceId, id: editing?.id ?? '' }),
    enabled: editing !== undefined,
    // Read afresh each time it opens: a step saved since must not be sent back as removed.
    staleTime: 0,
    gcTime: 0,
    throwOnError: false,
  });
  const steps = stepsRead.data?.spell.steps;
  const heading: ModalHeading = spell
    ? { eyebrow: 'Edit Spell', title: spell.title?.trim() || UNTITLED_SPELL }
    : newSpellHeading(covenName);
  return (
    <RouteModal
      closeHref={closeHref}
      content={
        opened && {
          heading,
          body: () => (
            <SpellBuilder
              key={spell && spell.id !== created ? spell.id : 'new'}
              workspaceId={workspaceId}
              covenSlug={covenSlug}
              userId={userId}
              deletedHrefOf={canDelete ? (title) => deletedHrefOf(closeHref, title) : undefined}
              copiedHrefOf={canDuplicate ? (id) => copiedHrefOf(covenSlug, id) : undefined}
              spell={spell && { ...spell, steps: steps ?? [] }}
              stepsRead={
                editing === undefined || steps !== undefined
                  ? undefined
                  : stepsRead.isError
                    ? 'failed'
                    : 'loading'
              }
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
