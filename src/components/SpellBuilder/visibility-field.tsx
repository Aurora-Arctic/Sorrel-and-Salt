'use client';

import { type ReactElement, useState } from 'react';
import { flushSync } from 'react-dom';
import { useController, useFormContext, useFormState } from 'react-hook-form';
import { SwitchField } from '../Field';
import { ConfirmQuestion } from '../Modal';
import type { SpellBuilderInput, SpellBuilderValues, SpellVisibilityFieldProps } from './types';
import type { SpellVisibility } from '@/modules/grimoire';

// Who can see a spell (M10.13): its author alone, or every member of the coven.
// A switch, Share With the Coven, on for the coven and off for private (the owner's
// call, 2026-10-27), with a line under it saying what its state means. A new spell
// takes either, the coven by default (§5), and
// the choice goes out with its first save. A saved private spell is shared by
// switching it on, which asks first and then saves at once, so that one action
// with its confirmation shares it. A spell shared with the coven never goes back
// (DESIGN.md §5's one-way rule, held by the service), so the control then reads
// only and says so, rather than leave a person to find out from a refusal.
// claude-docs/components/spell-builder.md, "Visibility".

/** What each state means, said under the switch. */
const MEANS = {
  workspace: 'Every member of the coven can see it. Once shared, it stays shared.',
  private: 'Only you can see it, until you share it with the coven.',
} as const satisfies Record<SpellVisibility, string>;

/** Said under the shut control: why it is shut, and the way to a private copy (M13.20). */
const SHARED_FOR_GOOD =
  'Shared with the coven, so it cannot be made private again. Duplicate makes a private copy.';

export function SpellVisibilityField({ created, flush }: SpellVisibilityFieldProps): ReactElement {
  const { control, setValue } = useFormContext<SpellBuilderValues, unknown, SpellBuilderInput>();
  const { defaultValues } = useFormState({ control });
  const { field } = useController({ control, name: 'visibility' });
  const [asking, setAsking] = useState(false);
  const [sharing, setSharing] = useState(false);

  // The saved spell's visibility is the last save's, which the form starts from.
  const shared = created && defaultValues?.visibility === 'workspace';

  const choose = (on: boolean) => {
    const visibility: SpellVisibility = on ? 'workspace' : 'private';
    // A saved private spell is shared by a confirmed save, never by a pick left pending.
    if (created && visibility === 'workspace') setAsking(true);
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
      <SwitchField
        label="Share With the Coven"
        name="visibility"
        value="workspace"
        checked={shared || field.value === 'workspace'}
        onChange={choose}
        disabled={shared}
        note={shared ? SHARED_FOR_GOOD : MEANS[field.value]}
      />
      {asking && (
        <ConfirmQuestion
          question="Share With the Coven?"
          details={
            <p>
              Every member of the coven will be able to see this spell, and it cannot be made
              private again. Any other changes are saved with it.
            </p>
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
