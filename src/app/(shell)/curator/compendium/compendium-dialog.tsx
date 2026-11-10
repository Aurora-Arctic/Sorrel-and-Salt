'use client';

import { usePendingNavigation } from '@/lib/navigation';
import { useState, type ReactElement } from 'react';
import { compendiumHref } from '../../../../components/CompendiumList/href';
import { detailsHeading } from '../../../../components/IngredientEntry/details';
import CompendiumEntryForm from '../../../../components/CompendiumEntryForm/lazy';
import { RouteModal } from '../../../../components/Modal';
import type { CompendiumDialogProps } from './types';

// The page's `RouteModal` (claude-docs/components/modal.md, "RouteModal"). It keeps a router of its
// own because a save moves the modal from `?new` to the entry's `?edit=`. A client part, as the form's
// handlers cannot cross from a server page (claude-docs/design-decisions/ingredients.md, "The admin compendium page: its size, its modal, its lookups").
export default function CompendiumDialog({
  place,
  opened,
  path,
  lookUnder,
}: CompendiumDialogProps): ReactElement {
  const { navigate, refresh } = usePendingNavigation();
  const entry = opened?.entry;
  const [created, setCreated] = useState<string | null>(null);
  const href = (dialog?: { edit: string }) => compendiumHref(place, dialog, path);
  return (
    <RouteModal
      closeHref={href()}
      content={
        opened && {
          heading: opened.heading,
          body: (done) => (
            <>
              <CompendiumEntryForm
                // A fresh form per entry, inside the one modal: Save Ingredient's move
                // from ?new to ?edit= swaps the form without the modal fading away
                // and back.
                key={entry && entry.id !== created ? entry.id : 'new'}
                onCreated={(saved) => {
                  setCreated(saved.id);
                  navigate(href({ edit: saved.slug }), { replace: true, scroll: false });
                }}
                onAutosaved={(saved) => {
                  navigate(href({ edit: saved.slug }), { replace: true, scroll: false });
                  refresh();
                }}
                review={opened.review}
                sourcing={opened.sourcing}
                entry={entry && entry.id !== created ? entry : undefined}
                onSaved={(saved, next) => {
                  if (next === 'open')
                    navigate(href({ edit: saved.slug }), { replace: true, scroll: false });
                  refresh();
                }}
                // The modal's own close, so a delete fades it out as Close does. An edit
                // over an entry's details goes back past them on a delete, as the entry page's edit
                // does, since they are gone: `done` would close to them.
                onDeleted={
                  place.entry
                    ? () => {
                        navigate(compendiumHref({ ...place, entry: undefined }), {
                          replace: true,
                          scroll: false,
                        });
                        refresh();
                      }
                    : done
                }
                duplicateHref={(match) => href({ edit: match.slug })}
                quickLookOf={
                  lookUnder &&
                  ((match) => ({
                    href: compendiumHref({ ...place, entry: match.slug }, lookUnder, path),
                    heading: detailsHeading(match),
                  }))
                }
                entryHref={({ slug }) => href({ edit: slug })}
              />
            </>
          ),
        }
      }
    />
  );
}
