'use client';

import { type ReactElement, useState } from 'react';
import { flushSync } from 'react-dom';
import { useFormContext, useFormState } from 'react-hook-form';
import BusyButton from '../BusyButton';
import type { SpellBuilderInput, SpellBuilderValues, SpellStatusFieldProps } from './types';

// A spell is a draft until Mark Complete saves it as complete; a complete spell shows its
// statement and no button. This is the control only: the service still accepts complete -> draft.
// claude-docs/components/spell-builder.md, "Draft and complete".

const DRAFT_SAYS = 'A draft: not yet finished.';

export function SpellStatusField({ flush }: SpellStatusFieldProps): ReactElement | null {
  const { control, getValues, handleSubmit, setFocus, setValue } = useFormContext<
    SpellBuilderValues,
    unknown,
    SpellBuilderInput
  >();
  const { defaultValues } = useFormState({ control });
  const [busy, setBusy] = useState(false);
  // The saved spell's status is the last save's, which the form starts from.
  const complete = defaultValues?.status === 'complete';

  const change = async () => {
    // The form holds the status being asked for while it validates, so the schema's title rule
    // refuses a blank title through the same submit as any field. It is put back if the title is
    // refused or the save fails, and drawn before the flush so the autosave sees the change.
    const before = getValues('status');
    flushSync(() => setValue('status', 'complete'));
    setBusy(true);
    try {
      await handleSubmit(
        () => flush(),
        () => {
          setValue('status', before);
          setFocus('title');
        },
      )();
    } catch {
      // The refusal is shown beside Save and on its field.
      setValue('status', before);
    } finally {
      setBusy(false);
    }
  };

  // A complete spell shows nothing here: no button, no sentence. Its
  // state is carried by the missing button and the locked Visibility switch.
  if (complete) return null;

  // The state line is read, not drawn: a button row has no room for a sentence.
  return (
    <>
      <span id="spell-status-says" className="visually-hidden">
        {DRAFT_SAYS}
      </span>
      <BusyButton
        type="button"
        className="btn btn--quiet"
        busy={busy}
        busyLabel="Marking Complete"
        aria-describedby="spell-status-says"
        onClick={change}
      >
        Mark Complete
      </BusyButton>
    </>
  );
}
