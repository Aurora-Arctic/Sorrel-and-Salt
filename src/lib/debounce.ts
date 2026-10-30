import { useEffect, useState } from 'react';

// The one debounce every typed lookup waits on, so every suggesting field settles
// at the same pace (claude-docs/components/combobox.md, "The debounce").

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
