'use client';

import { useRouter } from 'next/navigation';
import type { ReactElement } from 'react';
import { compendiumHref } from '../../../../components/CompendiumList/href';
import IngredientForm from '../../../../components/IngredientForm';
import { RouteModal } from '../../../../components/Modal';
import type { CompendiumDialogProps } from './types';

// The page's modal, a `RouteModal`, which closes it back to the list
// (claude-docs/components/modal.md, "RouteModal"). What stays here is what
// RouteModal does not do: a save that moves the open modal from `?new` to the
// entry's `?edit=` rather than closing it, so this keeps a router of its own.
// It is a client part because the form's handlers are functions, which a
// server page cannot hand to a client component
// (claude-docs/design-decisions/m5.5-admin-compendium.md). Rendered whatever
// the address opens, so a press's skeleton and the form that replaces it are
// one dialog (M9.18).
export default function CompendiumDialog({ place, opened }: CompendiumDialogProps): ReactElement {
  const router = useRouter();
  const entry = opened?.entry;
  return (
    <RouteModal
      closeHref={compendiumHref(place)}
      content={
        opened && {
          heading: opened.heading,
          body: (done) => (
            <IngredientForm
              // A fresh form per entry, inside the one modal: Save Ingredient's move
              // from ?new to ?edit= swaps the form without the modal fading away
              // and back.
              key={entry?.id ?? 'new'}
              workspaceId={null}
              mayPromote
              entry={entry}
              // Save Ingredient opens the entry it saved, at the address its name
              // now spells; Save & Add Another stays on the new form, which clears
              // itself, and the list beneath gains the entry.
              onSaved={(saved, next) => {
                if (next === 'open') router.replace(compendiumHref(place, { edit: saved.slug }));
                router.refresh();
              }}
              // The modal's own close, so a delete or Cancel fades it out as Close
              // does (M5.5).
              onDeleted={done}
              onCancel={done}
              // A near match opens its own modal here, over the same list.
              duplicateHref={(match) => compendiumHref(place, { edit: match.slug })}
              // A linked substitute's summary opens its entry's modal in a new
              // tab, every substitute here being a compendium entry (MB.115).
              entryHref={({ slug }) => compendiumHref(place, { edit: slug })}
            />
          ),
        }
      }
    />
  );
}
