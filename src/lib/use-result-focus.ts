import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';

/**
 * Moves focus to the answer of a form's submit. The submit button is disabled until the form is dirty
 * again, and a disabled control cannot hold focus, so the browser would otherwise drop it to the page.
 * Call `settle()` once the answer is set: focus goes to the first invalid control inside `ref`, else to
 * the `Notice` marked `result`.
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
