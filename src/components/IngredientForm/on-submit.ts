import { type RefObject, useLayoutEffect, useState } from 'react';

// What the form, its variants and its reference panel each do once a save is
// tried and its errors are drawn, written once for all three (MB.115).

/**
 * Runs `opened` while rendering, once for each new `submitCount`: a save's
 * last update carries its count with every error it found, the schema's or
 * the server's, so a fold opened here is open in the very commit that draws
 * the error, which is when `useFocusFirstInvalid` runs. In render rather than
 * an effect, React's pattern for state that follows a value, so the closed
 * fold never paints with its error inside.
 */
export function useOnEachSubmit(submitCount: number, opened: () => void): void {
  const [seen, setSeen] = useState(submitCount);
  if (seen !== submitCount) {
    setSeen(submitCount);
    opened();
  }
}

/**
 * Focuses the first field marked invalid within `within`, in page order, once
 * a save has been tried and its errors are drawn. A layout effect, so the
 * focus moves in the commit that draws the error: a passive effect leaves a
 * gap in which the error shows and the focus has not moved. In place of
 * react-hook-form's own `shouldFocusError`, which focuses in registration
 * order and only a registered field, which a list's entry is not.
 */
export function useFocusFirstInvalid(
  within: RefObject<HTMLElement | null>,
  submitCount: number,
): void {
  useLayoutEffect(() => {
    if (submitCount > 0)
      within.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [within, submitCount]);
}
