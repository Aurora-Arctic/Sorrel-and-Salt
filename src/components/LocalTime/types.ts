export interface LocalTimeProps {
  at: Date;
  /** A time zone to print in instead of the viewer's own; for tests and stories. */
  timeZone?: string;
  /** Print the long form, `28 August 2026, 12:00 am`, in place of `2026-10-28 12:00 am`. */
  long?: boolean;
  /** Print a short form instead: `day` is `30 Oct 2026`, `minute` is `30 Oct, 2:01 pm`. */
  short?: 'day' | 'minute';
}
