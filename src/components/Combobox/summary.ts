'use client';

import {
  type FocusEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { useListPosition } from './position';

// A linked entry's summary panel: opened and shut by a press on the entry's text, placed beneath the chip, shut by Escape, a press elsewhere or the focus leaving
// (claude-docs/components/combobox.md, "A linked entry's summary").

/** The summary's open state, and the props its button and its panel spread. */
export function useEntrySummary() {
  const [open, setOpen] = useState(false);
  // State rather than a ref, so the panel's placement is told once the button exists.
  const [opener, setOpener] = useState<HTMLButtonElement | null>(null);
  const panel = useRef<HTMLDialogElement | null>(null);
  const panelId = useId();
  const { setList, listStyle } = useListPosition(open, opener, { matchWidth: false });

  const close = useCallback(
    (refocus: boolean) => {
      setOpen(false);
      if (refocus) opener?.focus();
    },
    [opener],
  );
  const holds = useCallback(
    (node: EventTarget | null) =>
      node instanceof Node && Boolean(opener?.contains(node) || panel.current?.contains(node)),
    [opener],
  );

  // A press anywhere but the button or the panel shuts it; on the capture phase, so a press the target stops still counts.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!holds(event.target)) close(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [open, holds, close]);

  const onKeyDown = (event: KeyboardEvent) => {
    if (!open || event.key !== 'Escape') return;
    // Cancelled, so the modal around the form takes no cancel from it.
    event.preventDefault();
    event.stopPropagation();
    close(true);
  };
  // Tabbing on past the panel, or back before the button, shuts it; a blur to nowhere does not.
  const onBlur = (event: FocusEvent) => {
    if (open && event.relatedTarget !== null && !holds(event.relatedTarget)) close(false);
  };

  return {
    open,
    opener: {
      ref: setOpener,
      'aria-haspopup': 'dialog' as const,
      'aria-expanded': open,
      'aria-controls': open ? panelId : undefined,
      onClick: () => {
        if (open) close(false);
        else setOpen(true);
      },
      onKeyDown,
      onBlur,
    },
    panel: {
      id: panelId,
      ref: (element: HTMLDialogElement | null) => {
        panel.current = element;
        setList(element);
      },
      style: listStyle,
      onKeyDown,
      onBlur,
    },
  };
}
