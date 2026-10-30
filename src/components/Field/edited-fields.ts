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
 * Records every field ever edited, even if its value returns to the default (react-hook-form's `dirtyFields` unsets it); `clear` empties it on reset
 * (claude-docs/components/field.md, "The edited-fields record").
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
