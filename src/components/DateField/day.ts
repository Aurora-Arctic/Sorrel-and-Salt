export function isoDay(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Today in the browser's own calendar. */
export const today = (): string => isoDay(new Date());

const WORDS = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

/** A day as people say it: "4 March 2026". It is a calendar day, read at UTC midnight, so no zone shifts it. */
export const dayWords = (day: string): string => WORDS.format(new Date(`${day}T00:00:00Z`));

const SHORT = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/** A day in short words: "1 Oct 2026". Read at UTC midnight, so no zone shifts it. */
export const shortDayWords = (day: string): string => SHORT.format(new Date(`${day}T00:00:00Z`));
