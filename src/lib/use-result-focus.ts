import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';

/**
 * Moves focus to a form submit's answer, as the disabled submit button cannot hold it. Call `settle()` once
 * the answer is set.
 */
export function useResultFocus<T extends HTMLElement>(): {
  ref: RefObject<T | null>;
  settle: () => void;
} {
  const ref = useRef<T>(null);
  const [settled, setSettled] = useState(0);

  useEffect(() => {
    if (settled === 0) return;
    const root = ref.current;
    const target =
      root?.querySelector<HTMLElement>('[aria-invalid="true"]') ??
      root?.querySelector<HTMLElement>('[data-result]');
    target?.focus();
  }, [settled]);

  const settle = useCallback(() => setSettled((count) => count + 1), []);
  return { ref, settle };
}
