'use client';

import { type ReactElement, useState } from 'react';
import { CALENDAR_DAY_MESSAGE, isRealCalendarDay } from '../../lib/utc';
import { PlainTextField } from '../Field/plain-text-field';
import { shortDayWords } from '../DateField/day';

// The Start and End boxes of the range popover: a typed day beside the calendar, never instead of it. A box takes a day as
// the day fields' shared rule writes it, and settles when it is left or Enter is pressed (claude-docs/components/date-field.md).

/** What is wrong with a typed day: its format, or the bound it lies outside; undefined when it is fine. */
export function dayProblem(text: string, min?: string, max?: string): string | undefined {
  if (!isRealCalendarDay(text)) return CALENDAR_DAY_MESSAGE;
  if (min && text < min) return `Choose a day on or after ${shortDayWords(min)}`;
  if (max && text > max) return `Choose a day on or before ${shortDayWords(max)}`;
  return undefined;
}

function RangeBox({
  label,
  held,
  current,
  commit,
}: {
  label: string;
  held: string;
  current: boolean;
  /** Takes a typed day; returns the error to show, or undefined once it is taken. */
  commit: (day: string) => string | undefined;
}): ReactElement {
  // The text being typed, until it is settled; the box shows the held day otherwise.
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const settle = () => {
    if (draft === null) return;
    const text = draft.trim();
    // An emptied box goes back to the day it held.
    const problem = text === '' ? undefined : commit(text);
    setError(problem);
    if (!problem) setDraft(null);
  };
  return (
    <PlainTextField
      label={label}
      placeholder="YYYY-MM-DD"
      spellCheck={false}
      value={draft ?? held}
      onChange={setDraft}
      onBlur={settle}
      onEnter={settle}
      error={error}
      current={current}
    />
  );
}

export interface RangeEndsProps {
  from: string;
  to: string;
  /** Whether the next calendar pick completes a range, so End is the box waited on. */
  awaitingEnd: boolean;
  min?: string;
  max?: string;
  /** Sets the range from a typed end; the box reports the error returned. */
  onStart: (day: string) => string | undefined;
  onEnd: (day: string) => string | undefined;
}

/** The two boxes side by side. Each settles a typed day through `onStart` or `onEnd`, which refuse by returning an error. */
export function RangeEnds({
  from,
  to,
  awaitingEnd,
  min,
  max,
  onStart,
  onEnd,
}: RangeEndsProps): ReactElement {
  return (
    <div className="date-range-field__ends">
      <div className="date-range-field__ends-grid">
        <RangeBox
          label="Start"
          held={from}
          current={!awaitingEnd}
          commit={(day) => dayProblem(day, min, max) ?? onStart(day)}
        />
        <RangeBox
          label="End"
          held={to}
          current={awaitingEnd}
          commit={(day) => dayProblem(day, min, max) ?? onEnd(day)}
        />
      </div>
    </div>
  );
}
