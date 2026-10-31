export interface LocalTimeProps {
  at: Date;
  /** A time zone to print in instead of the viewer's own; for tests and stories. */
  timeZone?: string;
}
