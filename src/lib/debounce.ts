import { useEffect, useState } from 'react';

// The one debounce a typed lookup waits on, so every suggesting field settles
// at the same pace: the form and folk-name boxes, the name field and the search.
// Built as its own file because the first lookup needed it before the search
// existed (claude-docs/components/combobox.md,
// "The debounce").

/** How long a value must stop changing before a lookup is sent. */
export const DEBOUNCE_MS = 300;

/**
 * The value as it was once it had stopped changing for `delayMs`. It starts as
 * the first value given, so a lookup on it waits only on typing, never on
 * mounting.
 */
export function useDebouncedValue<T>(value: T, delayMs: number = DEBOUNCE_MS): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return settled;
}
