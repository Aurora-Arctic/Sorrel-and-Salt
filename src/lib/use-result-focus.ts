import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';

/**
 * The disabled submit button cannot hold focus, so call `settle()` once the answer is set.
 * `settle('result')` puts the result notice before an invalid control, for an answer that is not
 * about the fields, such as a refused delete.
 */
export function useResultFocus<T extends HTMLElement>(): {
  ref: RefObject<T | null>;
  settle: (prefer?: 'result') => void;
} {
  const ref = useRef<T>(null);
  const [settled, setSettled] = useState(0);
  const preferResult = useRef(false);

  useEffect(() => {
    if (settled === 0) return;
    const root = ref.current;
    const invalid = root?.querySelector<HTMLElement>('[aria-invalid="true"]');
    const result = root?.querySelector<HTMLElement>('[data-result]');
    const target = preferResult.current ? (result ?? invalid) : (invalid ?? result);
    target?.focus();
  }, [settled]);

  // Compared with the string, so `settle` handed straight to an event handler keeps the plain order.
  const settle = useCallback((prefer?: 'result') => {
    preferResult.current = prefer === 'result';
    setSettled((count) => count + 1);
  }, []);
  return { ref, settle };
}
