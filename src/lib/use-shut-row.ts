import { type RefObject, useLayoutEffect } from 'react';

/** The controls of a row that take a value or a press. */
export const FIELD_CONTROLS =
  'input:not([type="hidden"]), select, textarea, button, a[href], [role="combobox"]';

/** What would change a field or press a control, each refused while a row is shut. */
const PRESSES = ['keydown', 'beforeinput', 'mousedown', 'click', 'paste', 'drop'] as const;

/**
 * Shuts a row while `shut`: its controls are `aria-disabled`, not `disabled`, so focus stays put, and every
 * key but Tab, press and edit is refused in the capture phase. A control matching `open` stays open to
 * typing, though an Enter in it is still refused.
 */
export function useShutRow(row: RefObject<HTMLElement | null>, shut: boolean, open?: string): void {
  useLayoutEffect(() => {
    const element = row.current;
    if (!shut || !element) return;
    const marked = [...element.querySelectorAll<HTMLElement>(FIELD_CONTROLS)].filter(
      (control) =>
        !control.hasAttribute('aria-disabled') && !(open !== undefined && control.matches(open)),
    );
    for (const control of marked) control.setAttribute('aria-disabled', 'true');
    const refuse = (event: Event) => {
      if (event instanceof KeyboardEvent && event.key === 'Tab') return;
      const enter = event instanceof KeyboardEvent && event.key === 'Enter';
      if (
        !enter &&
        open !== undefined &&
        event.target instanceof Element &&
        event.target.matches(open)
      ) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
    };
    for (const type of PRESSES) element.addEventListener(type, refuse, true);
    return () => {
      for (const control of marked) control.removeAttribute('aria-disabled');
      for (const type of PRESSES) element.removeEventListener(type, refuse, true);
    };
  }, [row, shut, open]);
}
