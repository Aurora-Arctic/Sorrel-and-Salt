'use client';

import { type ChangeEvent, type RefObject, useEffect, useId, useLayoutEffect } from 'react';
import type { ChevronProps, ClassNames, DropdownProps } from 'react-day-picker';
import { ComboboxSelect } from '../Combobox/select';
import { ChevronIcon } from '../IconTip/icons';
import './calendar.scss';

// What a day field and a day-range field share: the calendar popover's placing and closing, the
// day picker's class names and parts, and the look they give it (claude-docs/components/date-field.md).

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A `YYYY-MM-DD` day as a local date, or undefined when it is not one. */
export function parseDay(day: string): Date | undefined {
  const match = DAY.exec(day);
  if (!match) return undefined;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.getMonth() === Number(match[2]) - 1 ? date : undefined;
}

// The gap between the field and the calendar, and the margin the calendar keeps from the window.
const GAP = 8;
const MARGIN = 8;

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
}: {
  open: boolean;
  floating: boolean;
  /** The id of the button that opens the calendar. */
  fieldId: string;
  panel: RefObject<HTMLDivElement | null>;
  close: () => void;
}): void {
  // Below the field, or above when the window has more room there, and kept inside the window's
  // width. It follows the field while the page or a dialog scrolls or resizes.
  useLayoutEffect(() => {
    const el = panel.current;
    if (!open || !floating || !el) return undefined;
    el.showPopover();
    const place = () => {
      const button = document.getElementById(fieldId);
      if (!button) return;
      const at = button.getBoundingClientRect();
      const below = window.innerHeight - at.bottom - GAP - MARGIN;
      const above = at.top - GAP - MARGIN;
      const top =
        el.offsetHeight > below && above > below
          ? Math.max(MARGIN, at.top - GAP - el.offsetHeight)
          : at.bottom + GAP;
      const left = Math.max(MARGIN, Math.min(at.left, window.innerWidth - el.offsetWidth - MARGIN));
      el.style.setProperty('--calendar-top', `${top}px`);
      el.style.setProperty('--calendar-left', `${left}px`);
    };
    place();
    window.addEventListener('resize', place);
    document.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      document.removeEventListener('scroll', place, true);
      if (el.matches(':popover-open')) el.hidePopover();
    };
  }, [open, floating, fieldId, panel]);
  // A manual popover has no light dismiss, so a press outside the calendar and its field closes it.
  useEffect(() => {
    if (!open || !floating) return undefined;
    const away = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panel.current?.contains(target) || document.getElementById(fieldId)?.contains(target))
        return;
      close();
    };
    document.addEventListener('pointerdown', away, true);
    return () => document.removeEventListener('pointerdown', away, true);
  }, [open, floating, fieldId, panel, close]);
  useEffect(() => {
    if (!open) return undefined;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      // An open month or year list takes the key and closes alone.
      if ((event.target as HTMLElement).getAttribute?.('aria-expanded') === 'true') return;
      // Claimed as well as stopped: a modal dialog round the field closes on any unclaimed Escape.
      event.preventDefault();
      event.stopPropagation();
      close();
      document.getElementById(fieldId)?.focus();
    };
    document.addEventListener('keydown', onEscape, true);
    return () => document.removeEventListener('keydown', onEscape, true);
  }, [open, fieldId, close]);
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
        // day-picker reads event.target.value and nothing else from the change.
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

/** The Combobox's stroked chevron, turned to point where the step or select does. */
export const CalendarChevron = ({ orientation = 'down', className }: ChevronProps) => (
  <span className={`${className ?? ''} day-picker__chevron--${orientation}`}>
    <ChevronIcon />
  </span>
);

/** The day picker's parts, on the app's own classes (`calendar.scss`). */
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

/** A calendar drawn as a page: the field's end mark, hidden from assistive technology. */
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
