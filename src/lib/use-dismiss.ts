import { useEffect, useRef } from 'react';

type DismissOptions = {
  /** Listens only while true, so a closed popover listens for nothing. */
  active: boolean;
  /** True for a target that belongs to the popover and its opener; needed with `onOutsidePress`. */
  inside?: (target: Node) => boolean;
  onOutsidePress?: (event: PointerEvent) => void;
  onEscape?: (event: KeyboardEvent) => void;
  /** The press is heard on the capture phase unless a caller needs the target's own handlers first. */
  pressCapture?: boolean;
  /** Escape is heard on the document unless the popover must hear it from anywhere in the window. */
  escapeOn?: 'document' | 'window';
  escapeCapture?: boolean;
};

// The latest callbacks are read through a ref so a caller's inline functions never re-attach
// the listeners.
export function useDismiss({
  active,
  inside,
  onOutsidePress,
  onEscape,
  pressCapture = true,
  escapeOn = 'document',
  escapeCapture = false,
}: DismissOptions): void {
  const latest = useRef({ inside, onOutsidePress, onEscape });
  useEffect(() => {
    latest.current = { inside, onOutsidePress, onEscape };
  });
  const hearsPress = onOutsidePress !== undefined;
  const hearsEscape = onEscape !== undefined;

  useEffect(() => {
    if (!active || !hearsPress) return undefined;
    const onPress = (event: PointerEvent): void => {
      if (event.target instanceof Node && !latest.current.inside?.(event.target)) {
        latest.current.onOutsidePress?.(event);
      }
    };
    document.addEventListener('pointerdown', onPress, pressCapture);
    return () => document.removeEventListener('pointerdown', onPress, pressCapture);
  }, [active, hearsPress, pressCapture]);

  useEffect(() => {
    if (!active || !hearsEscape) return undefined;
    const target = escapeOn === 'window' ? window : document;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') latest.current.onEscape?.(event);
    };
    target.addEventListener('keydown', onKey as EventListener, escapeCapture);
    return () => target.removeEventListener('keydown', onKey as EventListener, escapeCapture);
  }, [active, hearsEscape, escapeOn, escapeCapture]);
}

interface EscapeEvent {
  key: string;
  defaultPrevented: boolean;
  preventDefault: () => void;
}

/**
 * An element's own `onKeyDown` for a popover that closes on Escape: marks the key handled, so what
 * is around it stays, then calls `onEscape`. Does nothing for another key, while not `active`, and
 * with `skipHandled` when something nested has already taken the Escape.
 */
export function escapeKeyHandler<E extends EscapeEvent>(
  onEscape: (event: E) => void,
  { active = true, skipHandled = false }: { active?: boolean; skipHandled?: boolean } = {},
): (event: E) => void {
  return (event) => {
    if (event.key !== 'Escape' || !active) return;
    if (skipHandled && event.defaultPrevented) return;
    event.preventDefault();
    onEscape(event);
  };
}
