import { useState } from 'react';

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
