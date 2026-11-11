import { type RefObject, useLayoutEffect, useRef, useState } from 'react';
import { EDGE } from '../DateField/calendar';

/**
 * Whether two months fit to the right of the field's left edge, inside the window's margin. The popover's left edge sits on the
 * field's, so a field far across the window (the phone Filters sheet) has less room than the window's width says. Measured with
 * two months showing, remembered while one does, and read again as the window resizes.
 */
export function useRoomForTwoMonths({
  open,
  floating,
  narrow,
  fieldId,
  panel,
}: {
  open: boolean;
  floating: boolean;
  /** One month shows regardless, so there is nothing to measure. */
  narrow: boolean;
  fieldId: string;
  panel: RefObject<HTMLDivElement | null>;
}): boolean {
  const [room, setRoom] = useState(true);
  const needed = useRef(0);
  useLayoutEffect(() => {
    if (!open || !floating || narrow) return undefined;
    const check = () => {
      const el = panel.current;
      const field = document.getElementById(fieldId);
      if (!el || !field) return;
      // Only a panel showing two months says how wide two are.
      if (room) needed.current = Math.max(el.offsetWidth, el.scrollWidth);
      setRoom(field.getBoundingClientRect().left + needed.current + EDGE <= window.innerWidth);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [open, floating, narrow, fieldId, panel, room]);
  return room;
}
