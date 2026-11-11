'use client';

import type { ReactElement } from 'react';
import {
  CALENDAR_CLASS_NAMES,
  CalendarChevron,
  CalendarIcon,
  CaptionDropdown,
  parseDay as parse,
} from './calendar';
import { dayPickerModule } from './lazy-day-picker';
import { CalendarPanel, dayBounds, useDayPopover } from './popover';
import { dayWords, isoDay, today } from './day';
import { preloadOnIntent } from '../../lib/use-lazy-module';
import type { DateFieldProps } from './types';
import './index.scss';

// A day field: a button showing the day in words, opening a calendar in a top-layer popover; where the browser has no
// popover it opens in flow beneath the button instead (claude-docs/components/date-field.md).

const YEARS_AHEAD = 1;
const FIRST_YEAR = 1900;

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
  const { panelId, panel, open, setOpen, floating, picker, closeAndFocus } = useDayPopover(id);
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
        // The label, then the day's words: the button itself would be named by its own <label>.
        aria-labelledby={`${labelledBy} ${id}-text`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        disabled={disabled}
        {...aria}
        {...preloadOnIntent(dayPickerModule)}
        onClick={() => setOpen(!open)}
      >
        <span id={`${id}-text`} className="date-field__text">
          {selected ? dayWords(value) : 'Choose a day'}
        </span>
        <CalendarIcon />
      </button>
      {open && (
        <CalendarPanel id={panelId} floating={floating} panel={panel} label="Choose a Day">
          {picker && (
            <picker.DayPicker
              mode="single"
              required
              // Focus moves into the calendar on open so the arrow keys work at once.
              // oxlint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              locale={picker.enGB}
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
              disabled={dayBounds(first, last)}
              onSelect={(day) => {
                onChange(isoDay(day));
                closeAndFocus();
              }}
              classNames={CALENDAR_CLASS_NAMES}
            />
          )}
          {/* Hidden when max is before today or min after it, so a refused day is never offered. */}
          {(!last || isoDay(last) >= today()) && (!first || isoDay(first) <= today()) && (
            <div className="calendar-panel__footer">
              <button
                type="button"
                className="btn btn--quiet btn--small"
                onClick={() => {
                  onChange(today());
                  closeAndFocus();
                }}
              >
                Today
              </button>
            </div>
          )}
        </CalendarPanel>
      )}
    </div>
  );
}
