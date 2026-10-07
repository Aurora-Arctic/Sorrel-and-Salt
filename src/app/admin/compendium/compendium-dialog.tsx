'use client';

import { useRouter } from 'next/navigation';
import type { ReactElement } from 'react';
import { compendiumHref } from '../../../components/CompendiumList/href';
import IngredientForm from '../../../components/IngredientForm';
import Modal from '../../../components/Modal';
import type { CompendiumDialogProps } from './types';

// The page's modal, opened by its address, as the categories page's is:
// closing it replaces the modal's entry with the list's, so Back does not
// open it again, and the refresh re-reads the list after a write. Wide, since
// the form is the whole entry (claude-docs/design-decisions/m5.5-admin-compendium.md).
export default function CompendiumDialog({
  title,
  place,
  entry,
}: CompendiumDialogProps): ReactElement {
  const router = useRouter();
  const close = () => {
    router.replace(compendiumHref(place));
    router.refresh();
  };
  return (
    <Modal title={title} size="wide" onClose={close}>
      {/* The modal's own close, so a delete or Cancel fades it out as Close
          does (M5.5). */}
      {(fadeOut) => (
        <IngredientForm
          // A fresh form per entry, inside the one modal: Save Ingredient's move
          // from ?new to ?edit= swaps the form without the modal fading away
          // and back.
          key={entry?.id ?? 'new'}
          workspaceId={null}
          entry={entry}
          // Save Ingredient opens the entry it saved, at the address its name
          // now spells; Save & Add Another stays on the new form, which clears
          // itself, and the list beneath gains the entry.
          onSaved={(saved, next) => {
            if (next === 'open') router.replace(compendiumHref(place, { edit: saved.slug }));
            router.refresh();
          }}
          onDeleted={fadeOut}
          onCancel={fadeOut}
          // A near match opens its own modal here, over the same list.
          duplicateHref={(match) => compendiumHref(place, { edit: match.slug })}
        />
      )}
    </Modal>
  );
}
