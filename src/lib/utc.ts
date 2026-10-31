/**
 * An instant as a person reads it, in UTC (`28 August 2026, 00:00 UTC`): how a refusal names when a compendium redirect closes. `expires_at` is midnight UTC,
 * so the server's zone must not move it.
 */
export function inUtc(at: Date): string {
  const day = at.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const time = at.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'UTC',
  });
  return `${day}, ${time} UTC`;
}

/** An instant's UTC day alone (`28 August 2026`): for a date that is midnight UTC, where the time says nothing. */
export function dayInUtc(at: Date): string {
  return at.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** An instant's UTC day as `2026-10-30`: for a date that is midnight UTC, where the time says nothing. */
export function isoDayInUtc(at: Date): string {
  return at.toISOString().slice(0, 10);
}

/**
 * An instant to the minute as `2026-10-30 2:05 pm` in a time zone (the viewer's own when none is given),
 * built from parts so it never depends on a locale's separators.
 */
export function minuteInZone(at: Date, timeZone?: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hourCycle: 'h12',
    timeZone,
  }).formatToParts(at);
  const part = (type: string): string => parts.find((p) => p.type === type)?.value ?? '';
  const period = part('dayPeriod').toLowerCase();
  return `${part('year')}-${part('month')}-${part('day')} ${part('hour')}:${part('minute')} ${period}`;
}

/**
 * An instant to the minute as `28 August 2026, 12:00 am` in a time zone (the viewer's own when none is given), with no zone suffix: the long form
 * beside `minuteInZone`, for invitation expiries and the like.
 */
export function longMinuteInZone(at: Date, timeZone?: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hourCycle: 'h12',
    timeZone,
  }).formatToParts(at);
  const part = (type: string): string => parts.find((p) => p.type === type)?.value ?? '';
  const period = part('dayPeriod').toLowerCase();
  return `${part('day')} ${part('month')} ${part('year')}, ${part('hour')}:${part('minute')} ${period}`;
}

/** An instant to the minute as `28 August 2026, 12:00 am` in UTC: what the server and hydration print. */
export function longMinuteInUtc(at: Date): string {
  return longMinuteInZone(at, 'UTC');
}

/** An instant to the minute as `2026-10-30 2:05 pm` in UTC: what the server and hydration print. */
export function minuteInUtc(at: Date): string {
  return minuteInZone(at, 'UTC');
}
