'use client';

import { type ReactElement, useId, useState } from 'react';
import { useMediaQuery } from '../../lib/use-media-query';
import {
  CALENDAR_CLASS_NAMES,
  CalendarChevron,
  CalendarIcon,
  parseDay,
} from '../DateField/calendar';
import { isoDay, shortDayWords as shortWords } from '../DateField/day';
import { dayPickerModule } from '../DateField/lazy-day-picker';
import { CalendarPanel, dayBounds, useDayPopover } from '../DateField/popover';
import { preloadOnIntent } from '../../lib/use-lazy-module';
import type { DateRangeFieldProps, DayRange } from './types';
import './index.scss';

// A day-range field: a button showing the range in short words, opening a two-month calendar with quick picks. The
// calendar is the day field's, in the same popover (claude-docs/components/date-field.md).

// Below this width the calendar shows one month: two months (about 546px with the panel's padding) plus the window's gutter
// do not fit. Wider, the picks sit above them until 48rem, then beside them (index.scss).
const NARROW = '(max-width: 35.9375rem)';

const HINT = {
  first: 'Pick the first day, then the last. Pick one day twice for a single day.',
  last: 'Now pick the last day, or the same day again for a single day.',
};

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
  const { panelId, panel, open, setOpen, floating, picker, closeAndFocus } = useDayPopover(id);
  const months = useMediaQuery(NARROW) ? 1 : 2;
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

  const pick = (day: Date) => {
    const picked = isoDay(day);
    if (pending === null) {
      setPending(picked);
      onChange({ from: picked, to: '' });
      return;
    }
    finish(picked < pending ? { from: picked, to: pending } : { from: pending, to: picked });
  };

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
          <p id={hintId} className="date-range-field__hint" aria-live="polite">
            {pending === null ? HINT.first : HINT.last}
          </p>
        </CalendarPanel>
      )}
    </div>
  );
}
