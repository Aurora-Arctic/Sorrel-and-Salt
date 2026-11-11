/** The no-break space between a 12-hour time and its am or pm, so a line never breaks between them. */
export const TIME_PERIOD_SPACE = '\u00a0';

/** The date's parts by type, with an empty string for one the options leave out, so no caller depends on a locale's separators. */
function partsOf(at: Date, options: Intl.DateTimeFormatOptions): (type: string) => string {
  const parts = new Intl.DateTimeFormat('en-GB', options).formatToParts(at);
  return (type) => parts.find((p) => p.type === type)?.value ?? '';
}

/** `expires_at` is midnight UTC, so the server's zone must not move it. */
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

/** For a date that is midnight UTC, where the time says nothing. */
export function dayInUtc(at: Date): string {
  return at.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** For a date that is midnight UTC, where the time says nothing. */
export function isoDayInUtc(at: Date): string {
  return at.toISOString().slice(0, 10);
}

/** Built from parts so it never depends on a locale's separators. */
export function minuteInZone(at: Date, timeZone?: string): string {
  const part = partsOf(at, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hourCycle: 'h12',
    timeZone,
  });
  const period = part('dayPeriod').toLowerCase();
  return `${part('year')}-${part('month')}-${part('day')} ${part('hour')}:${part('minute')}${TIME_PERIOD_SPACE}${period}`;
}

/** No zone suffix; the long form beside `minuteInZone`. */
export function longMinuteInZone(at: Date, timeZone?: string): string {
  const part = partsOf(at, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hourCycle: 'h12',
    timeZone,
  });
  const period = part('dayPeriod').toLowerCase();
  return `${part('day')} ${part('month')} ${part('year')}, ${part('hour')}:${part('minute')}${TIME_PERIOD_SPACE}${period}`;
}

/** What the server and hydration print. */
export function longMinuteInUtc(at: Date): string {
  return longMinuteInZone(at, 'UTC');
}

/** What the server and hydration print. */
export function minuteInUtc(at: Date): string {
  return minuteInZone(at, 'UTC');
}

/** The instant a card chosen to last through `day` (`2027-01-29`) stops working: the end of that day in UTC-12, the last zone on Earth, so it never stops before its printed day is over anywhere. */
export function expiryOfDay(day: string): Date {
  const end = new Date(`${day}T12:00:00.000Z`);
  end.setUTCDate(end.getUTCDate() + 1);
  return end;
}

/** The chosen day's midnight UTC, read back from a stored expiry: format it in UTC to print the day. */
export function printedDateOf(expiresAt: Date): Date {
  return new Date(expiresAt.getTime() - 36 * 60 * 60 * 1000);
}

export function printedDayOf(expiresAt: Date): string {
  return isoDayInUtc(printedDateOf(expiresAt));
}

/** An instant's day in a time zone as `30 Oct 2026` (the viewer's own when none is given): for a list's date column. */
export function shortDayInZone(at: Date, timeZone?: string): string {
  const part = partsOf(at, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone,
  });
  return `${part('day')} ${part('month')} ${part('year')}`;
}

/** An instant to the minute as `30 Oct, 2:01 pm` in a time zone (the viewer's own when none is given): for a thread's entries. */
export function shortMinuteInZone(at: Date, timeZone?: string): string {
  const part = partsOf(at, {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hourCycle: 'h12',
    timeZone,
  });
  return `${part('day')} ${part('month')}, ${part('hour')}:${part('minute')}${TIME_PERIOD_SPACE}${part('dayPeriod').toLowerCase()}`;
}

/** An instant to the minute in UTC as `2026-10-30 14:05 UTC`: how a time-out's end is named, so the same words read the same everywhere. */
export function utcMinute(at: Date): string {
  return `${at.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

/** Whether `text` is written `YYYY-MM-DD`. The shape only: the range of the month and day is its caller's to check. */
export const isCalendarDay = (text: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(text);

/** How a pause or time-out ends, as a phrase after its subject: "until <date>", or `noEnd` where it has no end. */
export function untilPhrase(
  until: Date | null,
  timeZone?: string,
  noEnd = 'with no end date',
): string {
  return until ? `until ${longMinuteInZone(until, timeZone)}` : noEnd;
}
