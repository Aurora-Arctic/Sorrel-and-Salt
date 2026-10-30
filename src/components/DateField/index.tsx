'use client';

import { type ReactElement, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { enGB } from 'react-day-picker/locale';
import './index.scss';

// A day field: a button showing the day in words, opening a calendar. It replaces the browser's date
// input, whose look and highlight differ by browser. The calendar is a popover in the top layer, so it
// floats over the fields below and no scrolling ancestor clips it; where the browser has no popover
// (an older one) it opens in flow beneath the button instead (claude-docs/components/date-field.md).

export interface DateFieldProps {
  id: string;
  /** The day, `YYYY-MM-DD`. */
  value: string;
  onChange: (value: string) => void;
  /** The last day that may be picked, `YYYY-MM-DD`. */
  max?: string;
  disabled?: boolean;
  /** The id of the label element, so the button reads "Date, 4 March 2026". */
  labelledBy: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
}

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A `YYYY-MM-DD` day as a local date, or undefined when it is not one. */
function parse(day: string): Date | undefined {
  const match = DAY.exec(day);
  if (!match) return undefined;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.getMonth() === Number(match[2]) - 1 ? date : undefined;
}

function format(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// The gap between the button and the calendar, and the margin the calendar keeps from the window.
const GAP = 8;
const MARGIN = 8;
// The earliest year the calendar lists.
const FIRST_YEAR = 1900;

// Every month name, every day number and every year from 1900 to 2999 the button can show. The button
// holds them invisibly in the cell its text sits in, so it is as wide as the widest of each in the font
// in use, whatever loads. A year's digits vary freely after its first one or two: 2000-2999 and 1900-1999.
const PART = {
  day: new Intl.DateTimeFormat('en-GB', { day: 'numeric' }),
  month: new Intl.DateTimeFormat('en-GB', { month: 'long' }),
};
const SIZER = {
  days: Array.from({ length: 31 }, (_, i) => PART.day.format(new Date(2024, 0, i + 1))),
  months: Array.from({ length: 12 }, (_, i) => PART.month.format(new Date(2024, i, 1))),
  years: Array.from({ length: 10 }, (_, d) => [`2${d}${d}${d}`, `19${d}${d}`]).flat(),
};

function Sizer(): ReactElement {
  const stack = (items: string[]) => (
    <span className="date-field__stack">
      {items.map((item) => (
        <span key={item}>{item}</span>
      ))}
    </span>
  );
  return (
    <span className="date-field__sizer" aria-hidden="true">
      {stack(SIZER.days)} {stack(SIZER.months)} {stack(SIZER.years)}
    </span>
  );
}

const hasPopover = (): boolean =>
  typeof HTMLElement !== 'undefined' && typeof HTMLElement.prototype.showPopover === 'function';

const WORDS = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

export default function DateField({
  id,
  value,
  onChange,
  max,
  disabled,
  labelledBy,
  ...aria
}: DateFieldProps): ReactElement {
  const panelId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [floating] = useState(hasPopover);
  // A popover sits where the button is: below it, or above when the window has more room there, and
  // kept inside the window's width. It follows the button while the dialog scrolls or resizes.
  useLayoutEffect(() => {
    const el = panel.current;
    if (!open || !floating || !el) return undefined;
    el.showPopover();
    const place = () => {
      const button = document.getElementById(id);
      if (!button) return;
      const at = button.getBoundingClientRect();
      const below = window.innerHeight - at.bottom - GAP - MARGIN;
      const above = at.top - GAP - MARGIN;
      const top =
        el.offsetHeight > below && above > below
          ? Math.max(MARGIN, at.top - GAP - el.offsetHeight)
          : at.bottom + GAP;
      const left = Math.max(MARGIN, Math.min(at.left, window.innerWidth - el.offsetWidth - MARGIN));
      el.style.setProperty('--date-field-top', `${top}px`);
      el.style.setProperty('--date-field-left', `${left}px`);
    };
    place();
    window.addEventListener('resize', place);
    document.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      document.removeEventListener('scroll', place, true);
      if (el.matches(':popover-open')) el.hidePopover();
    };
  }, [open, floating, id]);
  // A press outside the calendar and its button closes it, as a manual popover has no light dismiss.
  useEffect(() => {
    if (!open || !floating) return undefined;
    const away = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panel.current?.contains(target) || document.getElementById(id)?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', away, true);
    return () => document.removeEventListener('pointerdown', away, true);
  }, [open, floating, id]);
  // Escape closes the calendar from anywhere inside it and returns focus to the button.
  useEffect(() => {
    if (!open) return undefined;
    const close = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      setOpen(false);
      document.getElementById(id)?.focus();
    };
    document.addEventListener('keydown', close, true);
    return () => document.removeEventListener('keydown', close, true);
  }, [open, id]);
  const selected = parse(value);
  const last = max ? parse(max) : undefined;
  return (
    <div className="date-field">
      <button
        id={id}
        type="button"
        className="input date-field__button"
        aria-labelledby={`${labelledBy} ${id}`}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        disabled={disabled}
        {...aria}
        onClick={() => setOpen(!open)}
      >
        <Sizer />
        <span className="date-field__text">
          {selected ? WORDS.format(selected) : 'Choose a day'}
        </span>
      </button>
      {open && (
        <div
          ref={panel}
          id={panelId}
          className={
            floating ? 'date-field__panel date-field__panel--floating' : 'date-field__panel'
          }
          popover={floating ? 'manual' : undefined}
        >
          <DayPicker
            mode="single"
            required
            // Focus moves into the calendar on open so the arrow keys work at once.
            // oxlint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            locale={enGB}
            weekStartsOn={1}
            selected={selected}
            defaultMonth={selected ?? last}
            captionLayout="dropdown"
            startMonth={
              new Date(Math.min(FIRST_YEAR, (selected ?? last ?? new Date()).getFullYear()), 0)
            }
            endMonth={last}
            disabled={last ? { after: last } : undefined}
            onSelect={(day) => {
              onChange(format(day));
              setOpen(false);
              document.getElementById(id)?.focus();
            }}
            classNames={{
              root: 'day-picker',
              months: 'day-picker__months',
              month_caption: 'day-picker__caption',
              dropdowns: 'day-picker__dropdowns',
              dropdown_root: 'day-picker__dropdown-root',
              dropdown: 'day-picker__dropdown',
              caption_label: 'day-picker__label',
              nav: 'day-picker__nav',
              button_previous: 'day-picker__step',
              button_next: 'day-picker__step',
              chevron: 'day-picker__chevron',
              month_grid: 'day-picker__grid',
              weekday: 'day-picker__weekday',
              day: 'day-picker__day',
              day_button: 'day-picker__button',
              selected: 'day-picker__day--selected',
              today: 'day-picker__day--today',
              outside: 'day-picker__day--outside',
              disabled: 'day-picker__day--disabled',
            }}
          />
        </div>
      )}
    </div>
  );
}
