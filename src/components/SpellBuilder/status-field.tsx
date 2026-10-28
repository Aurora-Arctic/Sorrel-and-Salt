'use client';

import { type ReactElement, useState } from 'react';
import { useFormContext, useFormState } from 'react-hook-form';
import BusyButton from '../BusyButton';
import type { SpellBuilderInput, SpellBuilderValues, SpellStatusFieldProps } from './types';

// A spell is a draft until it is marked complete (M10.20, story 55). The control
// is one button that says what it will do: Mark Complete on a draft, Reopen as
// Draft on a complete spell, so completing is explicit and reversible. A click
// saves everything the form holds with the other status, as Share With the Coven
// does, so the status is never a pick left pending. A complete spell needs a title
// (M13.15's CHECK): its absence is said on the title field, before anything is sent.
// Marking complete will flush a pending autosave first once M13.17 exists; there is
// no autosave to flush yet, and this save already carries every unsaved change.
// claude-docs/components/spell-builder.md, "Draft and complete".

/** What each saved status says about itself, and the action that changes it. */
const STATES = {
  draft: {
    says: 'A draft: not yet finished.',
    action: 'Mark Complete',
    busy: 'Marking Complete',
    next: 'complete',
  },
  complete: {
    says: 'Complete. Reopening it keeps its workings, but no new working can be recorded until it is complete again.',
    action: 'Reopen as Draft',
    busy: 'Reopening',
    next: 'draft',
  },
} as const;

export function SpellStatusField({ save }: SpellStatusFieldProps): ReactElement {
  const { control, getValues, handleSubmit, setFocus, setValue } = useFormContext<
    SpellBuilderValues,
    unknown,
    SpellBuilderInput
  >();
  const { defaultValues } = useFormState({ control });
  const [busy, setBusy] = useState(false);
  // The saved spell's status is the last save's, which the form starts from.
  const state = STATES[defaultValues?.status ?? 'draft'];

  const change = async () => {
    // The form holds the status being asked for while it validates, so the
    // schema's title rule (the CHECK's mirror) refuses a blank title through
    // the same submit as any field, shown on the title field with focus on it.
    // It is put back after, so the form's own status is only ever a save's.
    const before = getValues('status');
    setValue('status', state.next);
    setBusy(true);
    try {
      await handleSubmit(
        (values) => save({ ...values, status: state.next }),
        () => setFocus('title'),
      )();
    } finally {
      setValue('status', before);
      setBusy(false);
    }
  };

  return (
    <div className="spell-status">
      <p id="spell-status-says">{state.says}</p>
      <BusyButton
        busy={busy}
        busyLabel={state.busy}
        aria-describedby="spell-status-says"
        onClick={change}
      >
        {state.action}
      </BusyButton>
    </div>
  );
}
