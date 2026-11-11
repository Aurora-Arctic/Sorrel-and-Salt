import {
  type ReactElement,
  type ReactNode,
  type RefObject,
  useCallback,
  useId,
  useRef,
  useState,
} from 'react';
import { useLazyModule, usePreloadWhenIdle } from '../../lib/use-lazy-module';
import { hasPopover, useCalendarPopover } from './calendar';
import { dayPickerModule } from './lazy-day-picker';

/**
 * What a day field's calendar popover needs: its open state, the panel's id and ref, whether it
 * floats in the top layer, the lazily loaded day picker, and a close that returns focus to the field.
 */
export function useDayPopover(fieldId: string, layoutKey?: unknown, fieldWide?: boolean) {
  const panelId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [floating] = useState(hasPopover);
  const close = useCallback(() => setOpen(false), []);
  useCalendarPopover({ open, floating, fieldId, panel, close, layoutKey, fieldWide });
  usePreloadWhenIdle(dayPickerModule);
  const picker = useLazyModule(dayPickerModule, open);
  const closeAndFocus = () => {
    setOpen(false);
    document.getElementById(fieldId)?.focus();
  };
  return { panelId, panel, open, setOpen, floating, picker, closeAndFocus };
}

/** The `disabled` matchers that keep the picker inside its day bounds. */
export const dayBounds = (first: Date | undefined, last: Date | undefined) => [
  ...(last ? [{ after: last }] : []),
  ...(first ? [{ before: first }] : []),
];

/** The calendar's dialog panel, in the top layer where the browser has one. */
export function CalendarPanel({
  id,
  floating,
  panel,
  label,
  describedBy,
  children,
}: {
  id: string;
  floating: boolean;
  panel: RefObject<HTMLDivElement | null>;
  label: string;
  describedBy?: string;
  children: ReactNode;
}): ReactElement {
  return (
    <div
      ref={panel}
      id={id}
      role="dialog"
      aria-label={label}
      aria-describedby={describedBy}
      className={floating ? 'calendar-panel calendar-panel--floating' : 'calendar-panel'}
      popover={floating ? 'manual' : undefined}
    >
      {children}
    </div>
  );
}
