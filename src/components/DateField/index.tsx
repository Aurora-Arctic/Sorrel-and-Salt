'use client';

import { type ReactElement, useCallback, useId, useRef, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { enGB } from 'react-day-picker/locale';
import {
  CALENDAR_CLASS_NAMES,
  CalendarChevron,
  CalendarIcon,
  CaptionDropdown,
  hasPopover,
  parseDay as parse,
  useCalendarPopover,
} from './calendar';
import { dayWords, isoDay, today } from './day';
import type { DateFieldProps } from './types';
import './index.scss';

// A day field: a button showing the day in words, opening a calendar. It replaces the browser's date
// input, whose look and highlight differ by browser. The calendar is a popover in the top layer, so it
// floats over the fields below and no scrolling ancestor clips it; where the browser has no popover
// (an older one) it opens in flow beneath the button instead (claude-docs/components/date-field.md).

// With no `max` the year list still needs an end: it runs to the end of this many years after the current one.
const YEARS_AHEAD = 1;
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
  const close = useCallback(() => setOpen(false), []);
  useCalendarPopover({ open, floating, fieldId: id, panel, close });
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
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        disabled={disabled}
        {...aria}
        onClick={() => setOpen(!open)}
      >
        <Sizer />
        <span className="date-field__text">{selected ? dayWords(value) : 'Choose a day'}</span>
        <CalendarIcon />
      </button>
      {open && (
        <div
          ref={panel}
          id={panelId}
          role="dialog"
          aria-label="Choose a Day"
          className={floating ? 'calendar-panel calendar-panel--floating' : 'calendar-panel'}
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
              selected ?? last ?? (first && isoDay(first) > today() ? first : undefined)
            }
            captionLayout="dropdown"
            components={{ Dropdown: CaptionDropdown, Chevron: CalendarChevron }}
            startMonth={
              first
                ? new Date(Math.min(first.getFullYear(), (selected ?? first).getFullYear()), 0)
                : new Date(Math.min(FIRST_YEAR, (selected ?? last ?? now).getFullYear()), 0)
            }
            endMonth={last ?? new Date(now.getFullYear() + YEARS_AHEAD, 11)}
            disabled={[...(last ? [{ after: last }] : []), ...(first ? [{ before: first }] : [])]}
            onSelect={(day) => {
              onChange(isoDay(day));
              setOpen(false);
              document.getElementById(id)?.focus();
            }}
            classNames={CALENDAR_CLASS_NAMES}
          />
          {/* Hidden when max is before today or min after it, so a refused day is never offered. */}
          {(!last || isoDay(last) >= today()) && (!first || isoDay(first) <= today()) && (
            <div className="calendar-panel__footer">
              <button
                type="button"
                className="btn btn--quiet btn--small"
                onClick={() => {
                  onChange(today());
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
