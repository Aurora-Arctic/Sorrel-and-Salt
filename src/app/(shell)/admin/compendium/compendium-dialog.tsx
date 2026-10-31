'use client';

import { usePendingNavigation } from '@/lib/navigation';
import { useState, type ReactElement } from 'react';
import { compendiumHref } from '../../../../components/CompendiumList/href';
import { detailsHeading } from '../../../../components/IngredientEntry/details';
import IngredientForm from '../../../../components/IngredientForm';
import { RouteModal } from '../../../../components/Modal';
import type { CompendiumDialogProps } from './types';

// The page's `RouteModal` (claude-docs/components/modal.md, "RouteModal"). It keeps a router of its
// own because a save moves the modal from `?new` to the entry's `?edit=`. A client part, as the form's
// handlers cannot cross from a server page (claude-docs/design-decisions/m5.5-admin-compendium.md).
export default function CompendiumDialog({
  place,
  opened,
  path,
  lookUnder,
}: CompendiumDialogProps): ReactElement {
  const { navigate, refresh } = usePendingNavigation();
  const entry = opened?.entry;
  // The entry an autosave created: the address moves to its `?edit=`, and the form stays the one
  // the person is typing in.
  const [created, setCreated] = useState<string | null>(null);
  // The list it opened over: the admin's, or the public search's.
  const href = (dialog?: { edit: string }) => compendiumHref(place, dialog, path);
  return (
    <RouteModal
      closeHref={href()}
      content={
        opened && {
          heading: opened.heading,
          body: (done) => (
            <IngredientForm
              // A fresh form per entry, inside the one modal: Save Ingredient's move
              // from ?new to ?edit= swaps the form without the modal fading away
              // and back.
              key={entry && entry.id !== created ? entry.id : 'new'}
              onCreated={(saved) => {
                setCreated(saved.id);
                navigate(href({ edit: saved.slug }), { replace: true, scroll: false });
              }}
              // An autosave keeps the modal open: its address and heading follow the saved name.
              onAutosaved={(saved) => {
                navigate(href({ edit: saved.slug }), { replace: true, scroll: false });
                refresh();
              }}
              workspaceId={null}
              mayPromote
              review={opened.review}
              entry={entry && entry.id !== created ? entry : undefined}
              // Save Ingredient opens the entry it saved, at the address its name
              // now spells; Save & Add Another stays on the new form, which clears
              // itself, and the list beneath gains the entry.
              onSaved={(saved, next) => {
                if (next === 'open') navigate(href({ edit: saved.slug }), { replace: true });
                refresh();
              }}
              // The modal's own close, so a delete fades it out as Close does. An edit
              // over an entry's details goes back past them on a delete, as the entry page's edit
              // does, since they are gone: `done` would close to them.
              onDeleted={
                place.entry
                  ? () => {
                      navigate(compendiumHref({ ...place, entry: undefined }), { replace: true });
                      refresh();
                    }
                  : done
              }
              // A near match opens its own modal here, over the same list.
              duplicateHref={(match) => href({ edit: match.slug })}
              // And its Quick Look opens its details over the form, the form kept open beneath
              // them in the address, so closing them comes back to it.
              quickLookOf={
                lookUnder &&
                ((match) => ({
                  href: compendiumHref({ ...place, entry: match.slug }, lookUnder, path),
                  heading: detailsHeading(match),
                }))
              }
              // A linked substitute's summary opens its entry's modal in a new tab, every
              // substitute here being a compendium entry.
              entryHref={({ slug }) => href({ edit: slug })}
            />
          ),
        }
      }
    />
  );
}
