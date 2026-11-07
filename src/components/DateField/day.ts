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
