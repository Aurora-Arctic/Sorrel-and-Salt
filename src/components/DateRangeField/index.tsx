'use client';

import { type ReactElement, useCallback, useId, useRef, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { enGB } from 'react-day-picker/locale';
import {
  CALENDAR_CLASS_NAMES,
  CalendarChevron,
  CalendarIcon,
  hasPopover,
  parseDay,
  useCalendarPopover,
} from '../DateField/calendar';
import { isoDay } from '../DateField/day';
import type { DateRangeFieldProps, DayRange } from './types';
import './index.scss';

// A day-range field: a button showing the range in short words, opening a calendar of two months
// with quick picks beside it. The first day picked starts the range and the second ends it; one day
// picked twice is a single day. The calendar is the day field's, in the same popover
// (claude-docs/components/date-range-field.md).

// Below this width the calendar shows one month, as two side by side would not fit beside the picks.
const NARROW = '(max-width: 47.9375rem)';

const SHORT = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/** A day in short words: "1 Oct 2026". Read at UTC midnight, so no zone shifts it. */
const shortWords = (day: string): string => SHORT.format(new Date(`${day}T00:00:00Z`));

const HINT = {
  first: 'Pick the first day, then the last. Pick one day twice for a single day.',
  last: 'Now pick the last day, or the same day again for a single day.',
};

const monthsShown = (): number =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia(NARROW).matches
    ? 1
    : 2;

function RangeText({ from, to, placeholder }: DayRange & { placeholder: string }): ReactElement {
  if (from && to && from === to) return <>{shortWords(from)}</>;
  if (from && to)
    return (
      <>
        {shortWords(from)}
        {/* The dash is drawn and "to" is read, so a screen reader says the range in words. */}
        <span aria-hidden="true"> – </span>
        <span className="visually-hidden"> to </span>
        {shortWords(to)}
      </>
    );
  if (from) return <>From {shortWords(from)}</>;
  if (to) return <>To {shortWords(to)}</>;
  return <span className="date-range-field__placeholder">{placeholder}</span>;
}

export default function DateRangeField({
  id,
  labelledBy,
  label,
  from,
  to,
  onChange,
  quickPicks = [],
  min,
  max,
  placeholder = 'Any day',
  past = false,
  ...aria
}: DateRangeFieldProps): ReactElement {
  const panelId = useId();
  const hintId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [floating] = useState(hasPopover);
  const [months, setMonths] = useState(2);
  // The first day of a range being picked, until the second is.
  const [pending, setPending] = useState<string | null>(null);
  const close = useCallback(() => setOpen(false), []);
  useCalendarPopover({ open, floating, fieldId: id, panel, close });
  const first = min ? parseDay(min) : undefined;
  const last = max ? parseDay(max) : undefined;
  const start = parseDay(pending ?? from);
  const end = pending ? undefined : parseDay(to);

  const finish = (range: DayRange) => {
    onChange(range);
    setPending(null);
    setOpen(false);
    document.getElementById(id)?.focus();
  };

  const pick = (day: Date) => {
    const picked = isoDay(day);
    if (pending === null) {
      setPending(picked);
      onChange({ from: picked, to: '' });
      return;
    }
    finish(picked < pending ? { from: picked, to: pending } : { from: pending, to: picked });
  };

  // Looking back, the range's own month is the last one shown; looking ahead, the first.
  const anchor = (past ? (end ?? start) : (start ?? end)) ?? new Date();
  const defaultMonth = past
    ? new Date(anchor.getFullYear(), anchor.getMonth() - (months - 1))
    : new Date(anchor.getFullYear(), anchor.getMonth());

  return (
    <div className="date-range-field">
      <button
        id={id}
        type="button"
        className="input date-range-field__button"
        aria-labelledby={`${labelledBy} ${id}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        {...aria}
        onClick={() => {
          if (!open) {
            setMonths(monthsShown());
            setPending(null);
          }
          setOpen(!open);
        }}
      >
        <span className="date-range-field__text">
          <RangeText from={from} to={to} placeholder={placeholder} />
        </span>
        <CalendarIcon />
      </button>
      {/* A sibling of the field rather than inside it, as a button holds no other button. */}
      {(from || to) && (
        <button
          type="button"
          className="date-range-field__clear"
          aria-label={`Clear ${label}`}
          onClick={() => finish({ from: '', to: '' })}
        >
          <span aria-hidden="true">✕</span>
        </button>
      )}
      {open && (
        <div
          ref={panel}
          id={panelId}
          role="dialog"
          aria-label={`Choose ${label} Days`}
          aria-describedby={hintId}
          className={floating ? 'calendar-panel calendar-panel--floating' : 'calendar-panel'}
          popover={floating ? 'manual' : undefined}
        >
          <div className="date-range-field__body">
            {quickPicks.length > 0 && (
              <div className="date-range-field__picks">
                {quickPicks.map((quick) => {
                  const range = quick.range();
                  return (
                    <button
                      key={quick.label}
                      type="button"
                      className="date-range-field__pick"
                      aria-pressed={pending === null && range.from === from && range.to === to}
                      onClick={() => finish(quick.range())}
                    >
                      {quick.label}
                    </button>
                  );
                })}
              </div>
            )}
            <DayPicker
              mode="range"
              // Focus moves into the calendar on open so the arrow keys work at once.
              // oxlint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              locale={enGB}
              weekStartsOn={1}
              numberOfMonths={months}
              selected={start || end ? { from: start, to: end } : undefined}
              defaultMonth={defaultMonth}
              startMonth={first}
              endMonth={last}
              captionLayout="label"
              components={{ Chevron: CalendarChevron }}
              disabled={[...(last ? [{ after: last }] : []), ...(first ? [{ before: first }] : [])]}
              // The library's own range rule extends the range it holds; the field's is first then last.
              onSelect={(_range, day) => pick(day)}
              classNames={CALENDAR_CLASS_NAMES}
            />
          </div>
          <p id={hintId} className="date-range-field__hint" aria-live="polite">
            {pending === null ? HINT.first : HINT.last}
          </p>
        </div>
      )}
    </div>
  );
}
