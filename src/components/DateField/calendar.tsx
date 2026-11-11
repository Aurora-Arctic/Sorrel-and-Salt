'use client';

import { type ChangeEvent, type RefObject, useId, useLayoutEffect } from 'react';
import { useDismiss } from '../../lib/use-dismiss';
import type { ChevronProps, ClassNames, DropdownProps } from 'react-day-picker';
import { ComboboxSelect } from '../Combobox/select';
import { ChevronIcon } from '../IconTip/icons';
import './calendar.scss';

// What a day field and a day-range field share: the calendar popover's placing and closing, the
// day picker's class names and parts, and the look they give it (claude-docs/components/date-field.md).

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseDay(day: string): Date | undefined {
  const match = DAY.exec(day);
  if (!match) return undefined;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.getMonth() === Number(match[2]) - 1 ? date : undefined;
}

// The gap between the field and the calendar, and the margin the calendar keeps from the window.
const GAP = 8;
const MARGIN = 8;
/** The margin the calendar keeps from the window's sides. */
export const EDGE = 16;

/** Whether the browser can put the calendar in the top layer; an older one leaves it in flow. */
export const hasPopover = (): boolean =>
  typeof HTMLElement !== 'undefined' && typeof HTMLElement.prototype.showPopover === 'function';

/**
 * Opens the calendar as a popover beside its field, and closes it on a press outside both or on
 * Escape from anywhere inside, returning focus to the field.
 */
export function useCalendarPopover({
  open,
  floating,
  fieldId,
  panel,
  close,
  layoutKey,
  fieldWide,
  alignEnd,
}: {
  open: boolean;
  floating: boolean;
  fieldId: string;
  panel: RefObject<HTMLDivElement | null>;
  close: () => void;
  /** Placed again when this changes, for a calendar whose width does (the months it shows). */
  layoutKey?: unknown;
  /** The panel is as wide as its field (within the window margin) instead of as wide as its content. */
  fieldWide?: boolean;
  /** The panel's right edge sits on the field's right edge and it extends leftwards, instead of left on left. */
  alignEnd?: boolean;
}): void {
  useLayoutEffect(() => {
    const el = panel.current;
    if (!open || !floating || !el) return undefined;
    el.showPopover();
    const place = () => {
      const button = document.getElementById(fieldId);
      if (!button) return;
      const at = button.getBoundingClientRect();
      if (fieldWide) {
        el.style.setProperty(
          '--calendar-width',
          `${Math.min(at.width, window.innerWidth - 2 * EDGE)}px`,
        );
      } else {
        el.style.removeProperty('--calendar-width');
      }
      // Measured at its natural height; it goes below the field if it fits, else above if it fits there, else on the side with
      // more room, capped to that room and scrolling.
      el.style.removeProperty('--calendar-max-height');
      el.style.overflowY = '';
      const below = window.innerHeight - at.bottom - GAP - MARGIN;
      const above = at.top - GAP - MARGIN;
      const height = el.offsetHeight;
      const onTop = height > below && above > below;
      const room = onTop ? above : below;
      if (height > room) {
        el.style.setProperty('--calendar-max-height', `${room}px`);
        el.style.overflowY = 'auto';
      }
      const top = onTop ? Math.max(MARGIN, at.top - GAP - Math.min(height, room)) : at.bottom + GAP;
      const wanted = alignEnd ? at.right - el.offsetWidth : at.left;
      const left = Math.max(EDGE, Math.min(wanted, window.innerWidth - el.offsetWidth - EDGE));
      el.style.setProperty('--calendar-top', `${top}px`);
      el.style.setProperty('--calendar-left', `${left}px`);
    };
    place();
    // The months load after the panel opens and the picked range changes its height, so it is placed again as it resizes.
    const watch = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(place);
    watch?.observe(el);
    window.addEventListener('resize', place);
    // The panel's own scrolling must not place it again, which would reset its scroll position.
    const onScroll = (event: Event) => {
      if (!(event.target instanceof Node && el.contains(event.target))) place();
    };
    document.addEventListener('scroll', onScroll, true);
    return () => {
      watch?.disconnect();
      window.removeEventListener('resize', place);
      document.removeEventListener('scroll', onScroll, true);
      if (el.matches(':popover-open')) el.hidePopover();
    };
  }, [open, floating, fieldId, panel, layoutKey, fieldWide, alignEnd]);
  // A manual popover has no light dismiss, so a press outside the calendar and its field closes it.
  useDismiss({
    active: open && floating,
    inside: (target) =>
      Boolean(
        panel.current?.contains(target) || document.getElementById(fieldId)?.contains(target),
      ),
    onOutsidePress: close,
  });
  useDismiss({
    active: open,
    escapeCapture: true,
    onEscape: (event) => {
      // An open month or year list takes the key and closes alone.
      if ((event.target as HTMLElement).getAttribute?.('aria-expanded') === 'true') return;
      // Claimed as well as stopped: a modal dialog round the field closes on any unclaimed Escape.
      event.preventDefault();
      event.stopPropagation();
      close();
      document.getElementById(fieldId)?.focus();
    },
  });
}

// The month and year pickers drawn as the app's select-only box rather than a native select, whose open list the page cannot style (claude-docs/components/date-field.md).
export function CaptionDropdown({ options, value, onChange, 'aria-label': label }: DropdownProps) {
  const id = useId();
  return (
    <span className="day-picker__dropdown-root field--compact">
      {/* Every option stacked in the box's cell, hidden, so the box is as wide as its longest and does not change with the pick. */}
      <span className="day-picker__dropdown-sizer" aria-hidden="true">
        {(options ?? []).map((option) => (
          <span key={option.value}>{option.label}</span>
        ))}
      </span>
      <ComboboxSelect
        id={id}
        label={label ?? ''}
        value={String(value)}
        // day-picker reads `event.target.value` and nothing else from the change.
        onChange={(next) =>
          onChange?.({ target: { value: next } } as ChangeEvent<HTMLSelectElement>)
        }
        choices={(options ?? []).map((option) => ({
          value: String(option.value),
          label: option.label,
          disabled: option.disabled,
        }))}
      />
    </span>
  );
}

export const CalendarChevron = ({ orientation = 'down', className }: ChevronProps) => (
  <span className={`${className ?? ''} day-picker__chevron--${orientation}`}>
    <ChevronIcon />
  </span>
);

export const CALENDAR_CLASS_NAMES: Partial<ClassNames> = {
  root: 'day-picker',
  months: 'day-picker__months',
  month: 'day-picker__month',
  month_caption: 'day-picker__caption',
  caption_label: 'day-picker__caption-label',
  dropdowns: 'day-picker__dropdowns',
  dropdown_root: 'day-picker__dropdown-root',
  nav: 'day-picker__nav',
  button_previous: 'day-picker__step',
  button_next: 'day-picker__step',
  chevron: 'day-picker__chevron',
  month_grid: 'day-picker__grid',
  weekday: 'day-picker__weekday',
  day: 'day-picker__day',
  day_button: 'day-picker__button',
  selected: 'day-picker__day--selected',
  range_start: 'day-picker__day--range-start',
  range_middle: 'day-picker__day--range-middle',
  range_end: 'day-picker__day--range-end',
  today: 'day-picker__day--today',
  outside: 'day-picker__day--outside',
  disabled: 'day-picker__day--disabled',
};

export function CalendarIcon() {
  return (
    <svg className="calendar-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <rect
        x="2"
        y="3"
        width="12"
        height="11"
        rx="1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
