'use client';

import {
  type ChangeEvent,
  type ReactElement,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { DayPicker, type DropdownProps } from 'react-day-picker';
import { enGB } from 'react-day-picker/locale';
import { ComboboxSelect } from '../Combobox/select';
import { ChevronIcon } from '../Combobox/icons';
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
  /** The first day that may be picked, `YYYY-MM-DD`. */
  min?: string;
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
// With no `max` the year list still needs an end: it runs to the end of this many years after the current one.
const YEARS_AHEAD = 1;
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

// The month and year pickers drawn as the app's select-only box rather than a native select, whose open list the page cannot style (claude-docs/components/date-field.md).
function CaptionDropdown({ options, value, onChange, 'aria-label': label }: DropdownProps) {
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

const hasPopover = (): boolean =>
  typeof HTMLElement !== 'undefined' && typeof HTMLElement.prototype.showPopover === 'function';

const WORDS = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

export default function DateField({
  id,
  value,
  onChange,
  max,
  min,
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
      // An open month or year list takes the key and closes alone.
      if ((event.target as HTMLElement).getAttribute?.('aria-expanded') === 'true') return;
      event.stopPropagation();
      setOpen(false);
      document.getElementById(id)?.focus();
    };
    document.addEventListener('keydown', close, true);
    return () => document.removeEventListener('keydown', close, true);
  }, [open, id]);
  const selected = parse(value);
  const last = max ? parse(max) : undefined;
  const first = min ? parse(min) : undefined;
  const now = new Date();
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
            defaultMonth={
              selected ?? last ?? (first && format(first) > format(now) ? first : undefined)
            }
            captionLayout="dropdown"
            components={{
              Dropdown: CaptionDropdown,
              Chevron: ({ orientation = 'down', className }) => (
                <span className={`${className ?? ''} day-picker__chevron--${orientation}`}>
                  <ChevronIcon />
                </span>
              ),
            }}
            startMonth={
              first
                ? new Date(Math.min(first.getFullYear(), (selected ?? first).getFullYear()), 0)
                : new Date(Math.min(FIRST_YEAR, (selected ?? last ?? now).getFullYear()), 0)
            }
            endMonth={last ?? new Date(now.getFullYear() + YEARS_AHEAD, 11)}
            disabled={[...(last ? [{ after: last }] : []), ...(first ? [{ before: first }] : [])]}
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
          {/* Hidden when max is before today or min after it, so a refused day is never offered. */}
          {(!last || format(last) >= format(now)) && (!first || format(first) <= format(now)) && (
            <div className="date-field__footer">
              <button
                type="button"
                className="btn btn--quiet btn--small"
                onClick={() => {
                  onChange(format(new Date()));
                  setOpen(false);
                  document.getElementById(id)?.focus();
                }}
              >
                Today
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
