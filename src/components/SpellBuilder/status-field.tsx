'use client';

import { type ReactElement, useId, useState } from 'react';
import { flushSync } from 'react-dom';
import { useFormContext, useFormState, useWatch } from 'react-hook-form';
import BusyButton from '../BusyButton';
import { ConfirmQuestion } from '../Modal';
import { useDuplicateSpell } from '../SpellRecipe/duplicate-spell';
import type { SpellBuilderInput, SpellBuilderValues, SpellStatusFieldProps } from './types';

// A spell is a draft until Mark Complete saves it; a complete spell is not reopened here, and the service refuses
// complete -> draft too (claude-docs/components/spell-builder.md, "Draft and complete").

const DRAFT_SAYS = 'A draft: not yet finished.';

export function SpellStatusField({
  name,
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
  const complete = defaultValues?.status === 'complete';
  // The visibility the form holds, saved or not, is the one completing would lock.
  const shared = useWatch({ control, name: 'visibility' }) === 'workspace';
  const [asking, setAsking] = useState(false);

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
          // The question goes first, so the form is no longer inert when the title takes the focus.
          flushSync(() => setAsking(false));
          setFocus('title');
        },
      )();
    } catch {
      setValue('status', before);
    } finally {
      setBusy(false);
      setAsking(false);
    }
  };

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
        onClick={shared ? () => setAsking(true) : change}
      >
        Mark Complete
      </BusyButton>
      {asking && (
        <ConfirmQuestion
          question={
            <>
              Mark <strong>{name}</strong> Complete? It stays shared with every member of the coven
              for good, and your other changes are saved with it.
            </>
          }
          confirmLabel="Mark Complete"
          busyLabel="Marking Complete"
          tone="solid"
          keepLabel="Keep It a Draft"
          busy={busy}
          onConfirm={change}
          onKeep={() => setAsking(false)}
        />
      )}
    </>
  );
}
