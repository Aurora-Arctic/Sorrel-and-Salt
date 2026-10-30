'use client';

import { type ReactElement, useId, useState } from 'react';
import { flushSync } from 'react-dom';
import { useFormContext, useFormState } from 'react-hook-form';
import BusyButton from '../BusyButton';
import { useDuplicateSpell } from '../SpellRecipe/duplicate-spell';
import type { SpellBuilderInput, SpellBuilderValues, SpellStatusFieldProps } from './types';

// A spell is a draft until Mark Complete saves it as complete; a complete spell has Duplicate
// where a draft has Mark Complete, which makes a private draft copy and opens it. A complete spell
// is not reopened here, and the service refuses complete -> draft too.
// claude-docs/components/spell-builder.md, "Draft and complete".

const DRAFT_SAYS = 'A draft: not yet finished.';

export function SpellStatusField({
  flush,
  workspaceId,
  spellId,
  copiedHrefOf,
}: SpellStatusFieldProps): ReactElement | null {
  const { clearErrors, control, getValues, handleSubmit, setError, setFocus, setValue } =
    useFormContext<SpellBuilderValues, unknown, SpellBuilderInput>();
  const { defaultValues } = useFormState({ control });
  const [busy, setBusy] = useState(false);
  const saysId = useId();
  // The saved spell's status is the last save's, which the form starts from.
  const complete = defaultValues?.status === 'complete';

  const { duplicate, duplicating } = useDuplicateSpell(
    workspaceId,
    (id) => copiedHrefOf!(id),
    (message) => setError('root', { message }),
  );
  const [copying, setCopying] = useState(false);
  // Saves what the form holds first, so the copy has the latest; a refused save is shown beside Save.
  const copy = async () => {
    clearErrors('root');
    setCopying(true);
    try {
      await flush();
      duplicate(spellId!);
    } catch {
      // The refusal is shown beside Save.
    } finally {
      setCopying(false);
    }
  };

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

  // A complete spell has no sentence here: its state is carried by the locked Visibility switch.
  if (complete) {
    if (!copiedHrefOf || !spellId) return null;
    const busy = copying || duplicating;
    return (
      <BusyButton
        type="button"
        className="btn btn--quiet"
        busy={busy}
        busyLabel="Duplicating"
        disabled={busy}
        onClick={copy}
      >
        Duplicate
      </BusyButton>
    );
  }

  // The state line is read, not drawn: a button row has no room for a sentence.
  return (
    <>
      <span id={saysId} className="visually-hidden">
        {DRAFT_SAYS}
      </span>
      <BusyButton
        type="button"
        className="btn btn--quiet"
        busy={busy}
        busyLabel="Marking Complete"
        aria-describedby={saysId}
        onClick={change}
      >
        Mark Complete
      </BusyButton>
    </>
  );
}
