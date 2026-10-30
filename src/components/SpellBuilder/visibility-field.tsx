'use client';

import { type ReactElement, useState } from 'react';
import { flushSync } from 'react-dom';
import { useController, useFormContext, useFormState } from 'react-hook-form';
import { VisibilitySwitch } from '../Field';
import { ConfirmQuestion } from '../Modal';
import type { SpellBuilderInput, SpellBuilderValues, SpellVisibilityFieldProps } from './types';
import type { SpellVisibility } from '@/modules/grimoire';

// Who can see a spell: its author alone, or every member of the coven, by the Share With the Coven
// switch. A new spell starts private. A complete spell's visibility only widens, held by the
// service. claude-docs/components/spell-builder.md, "Visibility".

export function SpellVisibilityField({
  name,
  created,
  flush,
}: SpellVisibilityFieldProps): ReactElement {
  const { control, setValue } = useFormContext<SpellBuilderValues, unknown, SpellBuilderInput>();
  const { defaultValues } = useFormState({ control });
  const { field } = useController({ control, name: 'visibility' });
  const [asking, setAsking] = useState(false);
  const [sharing, setSharing] = useState(false);

  // The saved spell's visibility is the last save's, which the form starts from.
  // The one-way rule binds a complete spell only; the lock is read from the saved status.
  const complete = created && defaultValues?.status === 'complete';
  const shared = complete && defaultValues?.visibility === 'workspace';

  const choose = (on: boolean) => {
    const visibility: SpellVisibility = on ? 'workspace' : 'private';
    // A complete private spell is shared by a confirmed save, never by a pick left pending.
    if (complete && visibility === 'workspace') setAsking(true);
    else field.onChange(visibility);
  };

  // Saves everything the form holds with the spell shared, as Save Spell would;
  // a refusal lands in the builder's notice and the spell stays private.
  const share = async () => {
    setSharing(true);
    flushSync(() => setValue('visibility', 'workspace'));
    try {
      await flush();
    } catch {
      setValue('visibility', 'private');
    } finally {
      setSharing(false);
      setAsking(false);
    }
  };

  return (
    <>
      <VisibilitySwitch
        noun="spell"
        checked={field.value === 'workspace'}
        onChange={choose}
        sharedForGood={shared}
      />
      {asking && (
        <ConfirmQuestion
          question={
            <>
              Share <strong>{name}</strong>? Every member of the coven will see it, it cannot be
              made private again, and your other changes are saved with it.
            </>
          }
          confirmLabel="Share"
          busyLabel="Sharing"
          tone="solid"
          keepLabel="Keep It Private"
          busy={sharing}
          onConfirm={share}
          onKeep={() => setAsking(false)}
        />
      )}
    </>
  );
}
