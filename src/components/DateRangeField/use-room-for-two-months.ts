import { type RefObject, useLayoutEffect, useRef } from 'react';
import { EDGE } from '../DateField/calendar';

/** Which edge of the field the two-month popover lines up with, or none where two months fit on neither. */
export type TwoMonthAlign = 'start' | 'end' | null;

/**
 * Where two months fit: from the field's left edge going right, else ending on its right edge going left, each inside the
 * window's margin and, for a field in the modal Filters sheet, inside the sheet. A field far across the window (the Expires
 * filter) has no room to the right but plenty to the left. Measured with two months showing, remembered while one does, and
 * read again as the window resizes.
 */
export function useRoomForTwoMonths({
  open,
  floating,
  narrow,
  fieldId,
  panel,
  align,
  setAlign,
}: {
  open: boolean;
  floating: boolean;
  /** One month shows regardless, so there is nothing to measure. */
  narrow: boolean;
  fieldId: string;
  panel: RefObject<HTMLDivElement | null>;
  /** Held by the caller, which places the popover from it before this runs. */
  align: TwoMonthAlign;
  setAlign: (align: TwoMonthAlign) => void;
}): void {
  const needed = useRef(0);
  useLayoutEffect(() => {
    if (!open || !floating || narrow) return undefined;
    const check = () => {
      const el = panel.current;
      const field = document.getElementById(fieldId);
      if (!el || !field) return;
      // Only a panel showing two months says how wide two are.
      if (align) needed.current = Math.max(el.offsetWidth, el.scrollWidth);
      const at = field.getBoundingClientRect();
      const sheet = field.closest('dialog');
      const bounds = sheet?.matches(':modal') ? sheet.getBoundingClientRect() : undefined;
      const lowest = Math.max(EDGE, bounds?.left ?? 0);
      const highest = Math.min(window.innerWidth - EDGE, bounds?.right ?? window.innerWidth);
      if (at.left + needed.current <= highest) setAlign('start');
      else if (at.right - needed.current >= lowest) setAlign('end');
      else setAlign(null);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [open, floating, narrow, fieldId, panel, align, setAlign]);
}
