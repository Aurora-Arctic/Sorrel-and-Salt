import { useEffect, useState } from 'react';

// The one debounce a typed lookup waits on, so every suggesting field settles
// at the same pace: M5.10a's form and folk-name boxes first, then M5.10's name
// field and M8.10's search. Built here rather than in M8.10, which had not
// landed when the first lookup needed it (claude-docs/components/combobox.md,
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
