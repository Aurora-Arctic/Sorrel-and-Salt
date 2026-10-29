import { type RefObject, useLayoutEffect, useState } from 'react';

// What the form, its variants and its reference panel each do once a save is
// tried and its errors are drawn, written once for all three.

/**
 * Runs `opened` while rendering, once for each new `submitCount`: a save's last update carries its
 * count with every error it found, so a fold opened here is open in the very commit that draws the
 * error. In render rather than an effect, so the closed fold never paints with its error inside.
 */
export function useOnEachSubmit(submitCount: number, opened: () => void): void {
  const [seen, setSeen] = useState(submitCount);
  if (seen !== submitCount) {
    setSeen(submitCount);
    opened();
  }
}

/**
 * Focuses the first field marked invalid within `within`, in page order, once a save's errors are
 * drawn. A layout effect, so no commit shows the error without the focus; used in place of
 * react-hook-form's `shouldFocusError`, which skips a list's entries, never registered as fields.
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
