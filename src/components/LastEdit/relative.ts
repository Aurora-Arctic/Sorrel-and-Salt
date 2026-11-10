// How long ago an instant was, as a phrase ("3 days ago"). Worked out against the
// reader's clock, so it only ever runs in the browser (last-edit-tip.tsx).

import { MS_PER_DAY } from '../../lib/duration';
import { TIME_PERIOD_SPACE } from '../../lib/utc';

const UNITS: readonly (readonly [Intl.RelativeTimeFormatUnit, number])[] = [
  ['year', 365 * MS_PER_DAY],
  ['month', 30 * MS_PER_DAY],
  ['week', 7 * MS_PER_DAY],
  ['day', MS_PER_DAY],
  ['hour', 60 * 60 * 1000],
  ['minute', 60 * 1000],
];

/**
 * `at` relative to `now`, in the largest whole unit that fits: "3 days ago",
 * "1 hour ago". Under a minute, and any moment ahead of the clock (a skewed
 * device clock), reads "just now" rather than a count of seconds or a future time.
 */
export function relativePhrase(at: Date, now: Date = new Date()): string {
  const elapsed = now.getTime() - at.getTime();
  const format = new Intl.RelativeTimeFormat('en-GB', { numeric: 'always' });
  for (const [unit, size] of UNITS) {
    if (elapsed >= size) return format.format(-Math.floor(elapsed / size), unit);
  }
  return 'just now';
}

/**
 * The time of day `at` happened, on the reader's 12-hour clock: "2:02 pm". For a moment from
 * this sitting (SaveStatus's "Saved 2:02 pm"), where a date would be noise; browser only.
 */
export function clockTime(at: Date): string {
  // The locale picks its own space before am or pm; this one never breaks.
  return at
    .toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true })
    .replace(/\s+(?=[ap]m$)/, TIME_PERIOD_SPACE);
}
