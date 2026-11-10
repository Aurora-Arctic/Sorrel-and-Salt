import { autoUpdate } from '@floating-ui/react-dom';
import { useEffect } from 'react';

/**
 * Keeps a floating popup following its reference while `active`, and stops when it closes or
 * unmounts. Takes the `update` function `useFloating` returns.
 */
export function useAutoPosition(
  active: boolean,
  reference: Element | null,
  floating: HTMLElement | null,
  update: () => void,
): void {
  useEffect(() => {
    if (!active || !reference || !floating) return;
    return autoUpdate(reference, floating, update);
  }, [active, reference, floating, update]);
}
