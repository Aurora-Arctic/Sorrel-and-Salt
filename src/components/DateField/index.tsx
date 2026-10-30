'use client';

import { type ReactElement, useEffect, useId, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { enGB } from 'react-day-picker/locale';
import './index.scss';

// A day field: a button showing the day in words, opening an inline calendar. It replaces the
// browser's date input, whose look and highlight differ by browser; an inline panel rather than a
// popover, so it needs no anchor positioning (claude-docs/components/date-field.md).

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
  const [open, setOpen] = useState(false);
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
        {selected ? WORDS.format(selected) : 'Choose a day'}
      </button>
      {open && (
        <div id={panelId} className="date-field__panel">
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
