'use client';

import { type ReactElement, useState } from 'react';
import { flushSync } from 'react-dom';
import { useFormContext, useFormState } from 'react-hook-form';
import BusyButton from '../BusyButton';
import type { SpellBuilderInput, SpellBuilderValues, SpellStatusFieldProps } from './types';

// A spell is a draft until it is marked complete (M10.20, story 55). A draft shows one
// button, Mark Complete; a click saves everything the form holds as complete, as Share With
// the Coven does, so the status is never a pick left pending. A complete spell needs a title
// (M13.15's CHECK): its absence is said on the title field, before anything is sent. Marking
// complete flushes the autosave with the other status, which carries every unsaved change in
// the same save.
// A complete spell shows its statement and no button: there is no Reopen as Draft. Once
// complete, a spell's workings are recorded against it and its visibility lock has started,
// so reopening would undo both. To vary a complete spell, M13.20's copy (Duplicate a Spell)
// is the way. This is the control only: the service still accepts complete -> draft for now.
// claude-docs/components/spell-builder.md, "Draft and complete".

const DRAFT_SAYS = 'A draft: not yet finished.';

export function SpellStatusField({ flush }: SpellStatusFieldProps): ReactElement {
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
    // The form holds the status being asked for while it validates, so the
    // schema's title rule (the CHECK's mirror) refuses a blank title through
    // the same submit as any field, shown on the title field with focus on it.
    // It is put back if the title is refused or the save fails, so the form's
    // own status is never one the server has not taken. Drawn before the flush
    // so the autosave has seen the change when it is asked to save.
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

  // A complete spell shows nothing here (the owner, 2026-10-29): no button, no sentence. Its
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
