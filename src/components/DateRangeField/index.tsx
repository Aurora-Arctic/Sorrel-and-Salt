'use client';

import { type ReactElement, useId, useState } from 'react';
import { useMediaQuery } from '../../lib/use-media-query';
import {
  CALENDAR_CLASS_NAMES,
  CalendarChevron,
  CalendarIcon,
  parseDay,
} from '../DateField/calendar';
import { dayCount, isoDay, shortDayWords as shortWords } from '../DateField/day';
import { dayPickerModule } from '../DateField/lazy-day-picker';
import { CalendarPanel, dayBounds, useDayPopover } from '../DateField/popover';
import { preloadOnIntent } from '../../lib/use-lazy-module';
import { RangeEnds } from './range-ends';
import { useRoomForTwoMonths } from './use-room-for-two-months';
import type { DateRangeFieldProps, DayRange } from './types';
import './index.scss';

// A day-range field: a button showing the range in short words, opening a two-month calendar with quick picks. The
// calendar is the day field's, in the same popover (claude-docs/components/date-field.md).

// Below this width (or where the field leaves no room, see use-room-for-two-months.ts) the calendar shows one month: two months (about 546px with the panel's padding) plus the window's gutter
// do not fit. Wider, the picks sit above them until 48rem, then beside them (index.scss).
const NARROW = '(max-width: 35.9375rem)';

const HINT = {
  first: 'Pick the first day, then the last. Pick one day twice for a single day.',
  last: 'Now pick the last day, or the same day again for a single day.',
};

const daysSelected = (days: number) => `${days} ${days === 1 ? 'day' : 'days'} selected`;

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
  const hintId = useId();
  const narrow = useMediaQuery(NARROW);
  // The popover's own state is above its months, which depend on the room it measures, so it is placed again when they change.
  const [months, setMonths] = useState<1 | 2>(2);
  const { panelId, panel, open, setOpen, floating, picker, closeAndFocus } = useDayPopover(
    id,
    months,
    months === 1,
  );
  const room = useRoomForTwoMonths({ open, floating, narrow, fieldId: id, panel });
  const wanted = narrow || !room ? 1 : 2;
  if (wanted !== months) setMonths(wanted);
  // The first day of a range being picked, until the second is.
  const [pending, setPending] = useState<string | null>(null);
  const first = min ? parseDay(min) : undefined;
  const last = max ? parseDay(max) : undefined;
  const start = parseDay(pending ?? from);
  const end = pending ? undefined : parseDay(to);

  const finish = (range: DayRange) => {
    onChange(range);
    setPending(null);
    closeAndFocus();
  };

  // Bumped by a calendar pick, so the boxes drop any half-typed day for the one picked.
  const [pickCount, setPickCount] = useState(0);
  const heldFrom = pending ?? from;
  const heldTo = pending === null ? to : '';
  const awaitingEnd = pending !== null || (from !== '' && to === '');

  // A typed Start keeps the End held; with none held, the next pick completes the range.
  const typeStart = (day: string) => {
    if (heldTo && day > heldTo) return 'Start must be on or before End';
    if (heldTo) onChange({ from: day, to: heldTo });
    else {
      setPending(day);
      onChange({ from: day, to: '' });
    }
    return undefined;
  };
  // A typed End completes the range and leaves the calendar open.
  const typeEnd = (day: string) => {
    if (heldFrom && day < heldFrom) return 'End must be on or after Start';
    setPending(null);
    onChange({ from: heldFrom, to: day });
    return undefined;
  };

  const pick = (day: Date) => {
    setPickCount((count) => count + 1);
    const picked = isoDay(day);
    if (pending === null) {
      setPending(picked);
      onChange({ from: picked, to: '' });
      return;
    }
    finish(picked < pending ? { from: picked, to: pending } : { from: pending, to: picked });
  };

  // The hint line gives way to the days a complete range covers.
  const complete = pending === null && from !== '' && to !== '';
  const days = complete ? dayCount(from, to) : 0;

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
        // The label, then the range's words: the button itself would be named by its own <label>.
        aria-labelledby={`${labelledBy} ${id}-text`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        {...aria}
        {...preloadOnIntent(dayPickerModule)}
        onClick={() => {
          if (!open) {
            setPending(null);
          }
          setOpen(!open);
        }}
      >
        <span id={`${id}-text`} className="date-range-field__text">
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
        <CalendarPanel
          id={panelId}
          floating={floating}
          panel={panel}
          label={`Choose ${label} Days`}
          describedBy={hintId}
        >
          <div
            className={`date-range-field__body${months === 1 && floating ? ' date-range-field__body--single' : ''}`}
          >
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
            <div className="date-range-field__main">
              <RangeEnds
                key={pickCount}
                from={heldFrom}
                to={heldTo}
                awaitingEnd={awaitingEnd}
                min={min}
                max={max}
                onStart={typeStart}
                onEnd={typeEnd}
              />
              {picker && (
                <picker.DayPicker
                  mode="range"
                  // Focus moves into the calendar on open so the arrow keys work at once.
                  // oxlint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus
                  locale={picker.enGB}
                  weekStartsOn={1}
                  numberOfMonths={months}
                  selected={start || end ? { from: start, to: end } : undefined}
                  defaultMonth={defaultMonth}
                  startMonth={first}
                  endMonth={last}
                  captionLayout="label"
                  components={{ Chevron: CalendarChevron }}
                  disabled={dayBounds(first, last)}
                  // The library's own range rule extends the range it holds; the field's is first
                  // then last.
                  onSelect={(_range, day) => pick(day)}
                  classNames={CALENDAR_CLASS_NAMES}
                />
              )}
            </div>
          </div>
          <p id={hintId} className="date-range-field__hint" aria-live="polite">
            {complete ? daysSelected(days) : pending === null ? HINT.first : HINT.last}
          </p>
        </CalendarPanel>
      )}
    </div>
  );
}
