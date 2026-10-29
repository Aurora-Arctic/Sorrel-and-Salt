'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { FieldValues, UseFormSubscribe } from 'react-hook-form';

/**
 * The field paths the person has edited since the form (re)started, handed
 * down so a field can ask whether its error may be drawn (`errorShown`). Null
 * outside a form that tracks edits, where a field's error then waits only for
 * the field to be left.
 */
export const EditedFieldsContext = createContext<ReadonlySet<string> | null>(null);

/** The surrounding form's edited fields, or null where none are tracked. */
export const useEditedFieldsContext = (): ReadonlySet<string> | null =>
  useContext(EditedFieldsContext);

/**
 * Records every field the person has ever edited: one that has had a `change`
 * event, kept even when its value later returns to the default. react-hook-form's
 * `dirtyFields` is not that record: it unsets a field whose value goes back to
 * its default, so a name typed and then deleted would read as never edited and
 * its "Required" would stay unshown. `clear` empties the record when the form
 * starts over (after a reset), so the restarted form is quiet again.
 *
 * It listens through the form's `subscribe` (pass `useForm`'s), asking for `values` so react-hook-form
 * sends it the field name and event type of each input event. A `setValue` (undo
 * and redo restore through it) carries no event type and so does not count as an
 * edit by the person.
 */
export function useEditedFields<V extends FieldValues>(
  subscribe: UseFormSubscribe<V>,
): { edited: ReadonlySet<string>; clear: () => void } {
  const record = useRef<Set<string>>(new Set());
  // A new set per change, so what is handed down changes identity and the
  // fields and sections reading it render again.
  // oxlint-disable-next-line react/refs -- the ref is read once, in a state initialiser or after a held pointer, never to draw something else
  const [edited, setEdited] = useState<ReadonlySet<string>>(record.current);

  useEffect(
    () =>
      subscribe({
        formState: { values: true },
        callback: ({ name, type }) => {
          if (type !== 'change' || !name || record.current.has(name)) return;
          record.current = new Set(record.current).add(name);
          setEdited(record.current);
        },
      }),
    [subscribe],
  );

  const clear = useCallback(() => {
    if (record.current.size === 0) return;
    record.current = new Set();
    setEdited(record.current);
  }, []);

  return { edited, clear };
}
